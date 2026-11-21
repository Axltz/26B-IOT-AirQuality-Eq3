// Limitaciones del CO (MQ-7): el módulo mantiene el calentador siempre a 5 V,
// pero el datasheet pide ciclos de 5 V / 1.4 V, así que las ppm son solo una
// aproximación. El MQ-7 también reacciona al H2 y al alcohol. Para medir en
// serio hay que calibrarlo contra un medidor de CO de referencia.

#include <Arduino.h>
#include <Preferences.h>
#include <DHT.h>
#include <WiFi.h>
#include <DNSServer.h>
#include <WebServer.h>
#include <WiFiManager.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

// Histórico en Supabase: copia secretos.ejemplo.h como secretos.h (ignorado por
// Git) y pon la URL del proyecto y la clave publicable. Sin secretos.h el nodo
// funciona igual, solo sin guardar el histórico en la nube.
#if __has_include("secretos.h")
#include "secretos.h"
#define HISTORICO_NUBE 1
#else
#define HISTORICO_NUBE 0
#endif

// Cada cuánto se guarda una fila en la tabla `lecturas` de Supabase
const unsigned long INTERVALO_NUBE_MS = 60000;

// Reintentos de red sin detener el ciclo: el semáforo, la LCD y el histórico
// siguen funcionando aunque se caiga el broker MQTT
const unsigned long REINTENTO_WIFI_MS = 10000;
const unsigned long REINTENTO_MQTT_MS = 5000;

// El PMS5003 manda una trama cada 1-2.3 s; si no llega ninguna en este tiempo
// se considera desconectado y sus valores dejan de reportarse
const unsigned long VIGENCIA_PMS_MS = 10000;

// Inicializa el display LCD I2C con dirección 0x27 y formato 16x2
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Define los parámetros de conexión para el broker MQTT público de HiveMQ
const char *mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;

// Asigna el identificador del nodo y construye el tópico MQTT dinámico
const char *NODO_ID = "nodo1";
String mqtt_topic = "colectivo/aire/" + String(NODO_ID);

// Instancia los clientes de control para Wi-Fi y mensajería MQTT
WiFiClient espClient;
PubSubClient client(espClient);

// Configuración de los pines físicos del ESP32 para cada componente
#define DHTPIN 4        // Pin G4 conectado al sensor DHT22
#define DHTTYPE DHT22   // Especifica el modelo exacto del sensor de temperatura
#define PIN_MQ7 36      // Pin analógico G36 (VP, ADC1) para la lectura del gas CO
#define LED_VERDE 12    // Pin G12 para el indicador de calidad buena
#define LED_AMARILLO 14 // Pin G14 para el indicador de calidad aceptable
#define LED_ROJO 27     // Pin G27 para el indicador de alerta o riesgo
#define RXD2 16         // Pin G16 RX del ESP32 para el puerto serie UART2
#define TXD2 17         // Pin G17 TX del ESP32 para el puerto serie UART2
#define PIN_BOOT 0      // Botón BOOT (G0, activo en bajo) para calibrar el MQ-7

// Alimentación del módulo MQ-7 (calentador y circuito de medición)
const float MQ7_VC = 5.0;
// Divisor entre AO y G36: R1 = 10 kΩ en serie y R2 = 20 kΩ a GND.
// V_AO = V_adc * (10k + 20k) / 20k = V_adc * 1.5
const float MQ7_FACTOR_DIVISOR = 1.5;
// Resistencia de carga RL del módulo en kΩ. Revisa la resistencia SMD junto
// al sensor: "102" = 1 kΩ, "103" = 10 kΩ
const float MQ7_RL_KOHM = 10.0;
// R0 = Rs del sensor en 100 ppm de CO (referencia de la curva del datasheet).
// Valor típico mientras no se calibre: el datasheet da de 2 a 20 kΩ.
const float MQ7_R0_DEFAULT_KOHM = 10.0;
// Curva de CO del datasheet del MQ-7: ppm = A * (Rs/R0)^B, obtenida ajustando
// una recta a la gráfica log-log de sensibilidad
const float MQ7_CURVA_A = 99.042;
const float MQ7_CURVA_B = -1.518;
// Rs/R0 en aire limpio según la curva del datasheet (para calibrar R0)
const float MQ7_RATIO_AIRE_LIMPIO = 27.0;
// Rango que se reporta; fuera de él la curva ya no es confiable
const float MQ7_PPM_MAX = 2000.0;
// Margen en volts: V_AO casi en 0 o casi en VC no da un Rs válido
const float MQ7_MARGEN_V = 0.05;
// Lecturas del ADC que se promedian en cada medición
const int MQ7_MUESTRAS_ADC = 32;
// Tiempo de calentamiento tras encender: mientras tanto el CO no se reporta
const unsigned long MQ7_CALENTAMIENTO_MS = 180000;
// Duración de la medición de Rs en aire limpio al calibrar
const unsigned long MQ7_CALIBRACION_MS = 30000;
// Ventana al arrancar para presionar BOOT y pedir la calibración
const unsigned long MQ7_VENTANA_BOOT_MS = 3000;

// Inicializa el objeto sensor DHT
DHT dht(DHTPIN, DHTTYPE);

// R0 del MQ-7 guardada en la memoria no volátil (namespace "mq7", clave "r0")
Preferences preferencias;
float r0Mq7 = MQ7_R0_DEFAULT_KOHM;
bool r0Calibrada = false;
// Se pidió calibrar (BOOT al arrancar o 'c' por el Monitor Serie)
bool calibracionPendiente = false;

// Configura el portal cautivo de respaldo para la conexión inalámbrica
void setup_wifi_manager()
{
  WiFiManager wm;
  Serial.println("\n[INFO] Conectando a Wi-Fi...");

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Conectando WiFi");
  lcd.setCursor(0, 1);
  lcd.print("Busca ESP32_Aire");

  if (!wm.autoConnect("ESP32_Aire_Config"))
  {
    Serial.println("[ERROR] Falló conexión. Reiniciando...");
    delay(3000);
    ESP.restart();
  }

  Serial.println("\n[OK] Conectado exitosamente!");
  Serial.print("IP Asignada: ");
  Serial.println(WiFi.localIP());

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("WiFi Conectado!");
  delay(2000);
}

// Gestiona la reconexión automática al servidor MQTT si se pierde el enlace
void reconnect_mqtt()
{
  if (WiFi.status() != WL_CONNECTED)
    return;
  Serial.print("[MQTT] Conectando a HiveMQ...");
  String clientId = "ESP32_Aire_Eq3_" + String(random(0xffff), HEX);
  if (client.connect(clientId.c_str()))
  {
    Serial.println(" [OK] Conectado.");
    Serial.print("[MQTT] Publicando en: ");
    Serial.println(mqtt_topic);
  }
  else
  {
    Serial.print(" [ERROR] rc=");
    Serial.println(client.state());
  }
}

// Mantiene Wi-Fi y MQTT sin bloquear el ciclo. Devuelve true si se puede publicar.
bool mantener_conexiones()
{
  static unsigned long ultimoIntentoWifi = 0;
  static unsigned long ultimoIntentoMqtt = 0;
  static bool primerIntentoMqtt = true;

  if (WiFi.status() != WL_CONNECTED)
  {
    if (millis() - ultimoIntentoWifi >= REINTENTO_WIFI_MS)
    {
      ultimoIntentoWifi = millis();
      Serial.println("[WIFI] Sin conexión, reintentando...");
      WiFi.reconnect();
    }
    return false;
  }

  if (!client.connected())
  {
    if (primerIntentoMqtt || millis() - ultimoIntentoMqtt >= REINTENTO_MQTT_MS)
    {
      primerIntentoMqtt = false;
      ultimoIntentoMqtt = millis();
      reconnect_mqtt();
    }
    if (!client.connected())
      return false;
  }

  client.loop();
  return true;
}

// Agrega un campo numérico al JSON; los valores NaN se mandan como null
String campoJson(const char *nombre, float valor, int decimales)
{
  return String("\"") + nombre + "\":" + (isnan(valor) ? String("null") : String(valor, decimales));
}

// Agrega un nivel NOM-172 al JSON; -1 (sin dato del sensor) se manda como null
String nivelJson(const char *nombre, int nivel)
{
  return String("\"") + nombre + "\":" + (nivel < 0 ? String("null") : String(nivel));
}

// Texto para la LCD y el monitor serial: "--" si el sensor no dio lectura
String textoValor(float valor, int decimales)
{
  return isnan(valor) ? String("--") : String(valor, decimales);
}

// Clasifica una concentración con los cuatro cortes NOM-172
// (0 Buena ... 4 Extremadamente mala). Devuelve -1 si no hay dato.
int clasificar(float valor, float buena, float aceptable, float mala, float muyMala)
{
  if (isnan(valor))
    return -1;
  if (valor <= buena)
    return 0;
  if (valor <= aceptable)
    return 1;
  if (valor <= mala)
    return 2;
  if (valor <= muyMala)
    return 3;
  return 4;
}

// Lee el voltaje en la salida AO del MQ-7 (antes del divisor), en volts,
// promediando varias lecturas del ADC calibrado de fábrica
float leer_voltaje_mq7()
{
  int32_t sumaMv = 0;
  for (int i = 0; i < MQ7_MUESTRAS_ADC; i++)
  {
    sumaMv += analogReadMilliVolts(PIN_MQ7);
  }
  float vAdc = (sumaMv / (float)MQ7_MUESTRAS_ADC) / 1000.0;
  return vAdc * MQ7_FACTOR_DIVISOR;
}

// Calcula la resistencia del sensor Rs (kΩ) con el divisor RL del módulo.
// Devuelve NaN si V_AO está casi en 0 o casi en VC (no hay dato válido).
float calcular_rs_mq7(float vAO)
{
  if (vAO < MQ7_MARGEN_V || vAO > MQ7_VC - MQ7_MARGEN_V)
    return NAN;
  return MQ7_RL_KOHM * (MQ7_VC - vAO) / vAO;
}

// Convierte Rs a ppm de CO con la curva del datasheet, limitado a 0-2000 ppm
float calcular_ppm_co(float rs)
{
  if (isnan(rs) || r0Mq7 <= 0.0)
    return NAN;
  float ppm = MQ7_CURVA_A * powf(rs / r0Mq7, MQ7_CURVA_B);
  return constrain(ppm, 0.0f, MQ7_PPM_MAX);
}

// Carga R0 de la memoria no volátil; si no hay, usa el valor por defecto
void cargar_r0_mq7()
{
  preferencias.begin("mq7", false);
  float r0Guardada = preferencias.getFloat("r0", NAN);
  preferencias.end();

  if (!isnan(r0Guardada) && r0Guardada > 0.0)
  {
    r0Mq7 = r0Guardada;
    r0Calibrada = true;
    Serial.printf("[MQ-7] R0 cargada de memoria: %.2f kOhm\n", r0Mq7);
  }
  else
  {
    r0Mq7 = MQ7_R0_DEFAULT_KOHM;
    r0Calibrada = false;
    Serial.printf("[MQ-7] AVISO: no hay R0 calibrada, se usa el valor por defecto %.2f kOhm.\n", r0Mq7);
    Serial.println("[MQ-7] Las ppm de CO pueden estar muy desviadas hasta calibrar en aire limpio.");
  }
}

// Mide Rs en aire limpio durante MQ7_CALIBRACION_MS y guarda R0 = Rs / 27.
// Bloquea el ciclo, pero solo se ejecuta cuando el usuario lo pide.
void calibrar_mq7()
{
  Serial.println("[MQ-7] Calibrando en aire limpio: midiendo Rs durante 30 s...");
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Calibrando MQ-7");

  float sumaRs = 0.0;
  int validas = 0;
  int totales = 0;
  unsigned long inicio = millis();
  while (millis() - inicio < MQ7_CALIBRACION_MS)
  {
    float rs = calcular_rs_mq7(leer_voltaje_mq7());
    totales++;
    if (!isnan(rs))
    {
      sumaRs += rs;
      validas++;
    }

    // Cuenta regresiva en la segunda línea de la LCD
    unsigned long restante = (MQ7_CALIBRACION_MS - (millis() - inicio)) / 1000;
    lcd.setCursor(0, 1);
    lcd.print("Aire limpio " + String(restante) + "s ");
    delay(100);
  }

  // Si la mayoría de las lecturas no fueron válidas el sensor no está bien conectado
  if (validas == 0 || validas < totales / 2)
  {
    Serial.printf("[MQ-7] ERROR: calibración cancelada, solo %d de %d lecturas válidas. Revisa el sensor.\n",
                  validas, totales);
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Error calibrando");
    lcd.setCursor(0, 1);
    lcd.print("Revisa el MQ-7");
    delay(3000);
    return;
  }

  float rsAire = sumaRs / validas;
  r0Mq7 = rsAire / MQ7_RATIO_AIRE_LIMPIO;
  r0Calibrada = true;

  preferencias.begin("mq7", false);
  preferencias.putFloat("r0", r0Mq7);
  preferencias.end();

  Serial.printf("[MQ-7] Calibrado R0=%.2f kOhm (Rs en aire limpio = %.2f kOhm, %d lecturas)\n",
                r0Mq7, rsAire, validas);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Calibrado R0=");
  lcd.setCursor(0, 1);
  lcd.print(String(r0Mq7, 2) + " kOhm");
  delay(3000);
}

// Revisa si se pidió calibrar ('c' por el Monitor Serie) y la ejecuta en cuanto
// termina el calentamiento; mientras tanto el ciclo sigue sin bloquearse
void revisar_calibracion_mq7()
{
  while (Serial.available() > 0)
  {
    char letra = Serial.read();
    if (letra == 'c' || letra == 'C')
    {
      calibracionPendiente = true;
      Serial.println("[MQ-7] Calibración solicitada por el Monitor Serie.");
    }
  }

  if (!calibracionPendiente)
    return;

  if (millis() < MQ7_CALENTAMIENTO_MS)
  {
    Serial.printf("[MQ-7] Calibración pendiente: inicia al terminar el calentamiento (faltan %lu s).\n",
                  (MQ7_CALENTAMIENTO_MS - millis()) / 1000);
    return;
  }

  calibracionPendiente = false;
  calibrar_mq7();
}

// Inserta una fila en la tabla `lecturas` de Supabase (Data API por HTTPS).
// La hora la pone el servidor, así que el ESP32 no necesita reloj (NTP).
void guardar_en_supabase(float pm1, float pm25, float pm10, float co, float temp, float hum,
                         int nivel, const String &dominante)
{
#if HISTORICO_NUBE
  WiFiClientSecure clienteSeguro;
  // Prototipo: se cifra la conexión pero no se valida el certificado del
  // servidor. Para producción, cargar el certificado raíz con setCACert().
  clienteSeguro.setInsecure();

  HTTPClient http;
  http.setTimeout(5000);
  if (!http.begin(clienteSeguro, String(SUPABASE_URL) + "/rest/v1/lecturas"))
  {
    Serial.println("[SUPABASE] URL inválida, revisa secretos.h");
    return;
  }
  http.addHeader("apikey", SUPABASE_PUBLISHABLE_KEY);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Prefer", "return=minimal");

  String cuerpo = "{\"topico\":\"" + mqtt_topic + "\"," +
                  campoJson("pm1", pm1, 1) + "," +
                  campoJson("pm25", pm25, 1) + "," +
                  campoJson("pm10", pm10, 1) + "," +
                  campoJson("co", co, 2) + "," +
                  campoJson("temp", temp, 1) + "," +
                  campoJson("hum", hum, 1) + "," +
                  "\"nivel_general\":" + String(nivel) + "," +
                  "\"dominante\":\"" + dominante + "\"}";

  int codigo = http.POST(cuerpo);
  if (codigo == 201)
  {
    Serial.println("[SUPABASE] Lectura guardada en el histórico.");
  }
  else
  {
    Serial.printf("[SUPABASE] Error %d: %s\n", codigo, http.getString().c_str());
  }
  http.end();
#endif
}

// Inicializa puertos seriales, pines digitales, pantalla y servicios de red
void setup()
{
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, RXD2, TXD2);

  lcd.init();
  lcd.backlight();
  lcd.clear();

  dht.begin();
  pinMode(LED_VERDE, OUTPUT);
  pinMode(LED_AMARILLO, OUTPUT);
  pinMode(LED_ROJO, OUTPUT);
  pinMode(PIN_MQ7, INPUT);
  pinMode(PIN_BOOT, INPUT_PULLUP);

  // Carga la R0 del MQ-7 guardada en la memoria no volátil
  cargar_r0_mq7();

  // Ventana breve para pedir la calibración del MQ-7 con el botón BOOT.
  // BOOT se presiona después de que arranca el programa: si se mantiene al
  // soltar EN/RESET, el ESP32 entra en modo de programación.
  lcd.setCursor(0, 0);
  lcd.print("BOOT = calibrar");
  lcd.setCursor(0, 1);
  lcd.print("CO en aire limp.");
  unsigned long inicioVentana = millis();
  while (millis() - inicioVentana < MQ7_VENTANA_BOOT_MS)
  {
    if (digitalRead(PIN_BOOT) == LOW)
    {
      calibracionPendiente = true;
      Serial.println("[MQ-7] Calibración solicitada con el botón BOOT.");
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Calibrara MQ-7");
      lcd.setCursor(0, 1);
      lcd.print("tras calentar");
      delay(1500);
      break;
    }
    delay(10);
  }

  setup_wifi_manager();
  client.setServer(mqtt_server, mqtt_port);
  // Acota cuánto se bloquea un intento fallido de conexión con el broker
  client.setSocketTimeout(5);
}

// Ciclo operativo: adquiere datos, aplica la norma y actualiza las salidas.
// Los sensores, el semáforo, la LCD y el histórico no dependen del broker MQTT.
void loop()
{
  bool enLinea = mantener_conexiones();

  // Lee los valores reales de temperatura y humedad del ambiente (NaN si falla el DHT22)
  float humedad = dht.readHumidity();
  float temperatura = dht.readTemperature();

  // Atiende una calibración pedida (solo bloquea cuando el usuario la pide)
  revisar_calibracion_mq7();

  // Lee el MQ-7 y estima el CO en ppm con la curva del datasheet.
  // Durante el calentamiento o sin lectura válida el CO es NaN (null en el JSON).
  float vAoMq7 = leer_voltaje_mq7();
  float rsMq7 = calcular_rs_mq7(vAoMq7);
  float ratioMq7 = isnan(rsMq7) ? NAN : rsMq7 / r0Mq7;
  bool mq7Caliente = millis() >= MQ7_CALENTAMIENTO_MS;
  float ppmCO = mq7Caliente ? calcular_ppm_co(rsMq7) : NAN;

  // Variables estáticas para capturar la trama serial real del PMS5003
  static float pm1 = 0.0;
  static float pm25 = 0.0;
  static float pm10 = 0.0;
  // Si ya llegó la primera trama y cuándo llegó la última
  static bool pmsListo = false;
  static unsigned long ultimaTramaPms = 0;

  // Limpia el búfer serial para evitar retrasos en la lectura de datos
  while (Serial2.available() > 32)
  {
    Serial2.read();
  }

  // Lee y decodifica la trama binaria estandarizada que emite el sensor láser
  if (Serial2.available() >= 32)
  {
    if (Serial2.read() == 0x42)
    {
      if (Serial2.read() == 0x4D)
      {
        uint8_t buf[30];
        Serial2.readBytes(buf, 30);

        uint16_t valPM1 = (buf[8] << 8) | buf[9];
        uint16_t valPM25 = (buf[10] << 8) | buf[11];
        uint16_t valPM10 = (buf[12] << 8) | buf[13];

        if (valPM1 < 1000)
          pm1 = (float)valPM1;
        if (valPM25 < 1000)
          pm25 = (float)valPM25;
        if (valPM10 < 1000)
          pm10 = (float)valPM10;
        pmsListo = true;
        ultimaTramaPms = millis();
      }
    }
  }

  // Antes de la primera trama o con el sensor desconectado las partículas son
  // desconocidas (NaN -> null en el JSON), en vez de mandar ceros o valores viejos
  bool pmsVigente = pmsListo && (millis() - ultimaTramaPms < VIGENCIA_PMS_MS);
  float pm1_compensado = pmsVigente ? pm1 : NAN;
  float pm25_compensado = pmsVigente ? pm25 : NAN;
  float pm10_compensado = pmsVigente ? pm10 : NAN;

  // Aplica la compensación higroscópica si la humedad supera el 70%
  if (pmsVigente && !isnan(humedad) && humedad > 70.0)
  {
    pm1_compensado = pm1 * 0.85;
    pm25_compensado = pm25 * 0.85;
    pm10_compensado = pm10 * 0.85;
  }

  // Clasifica cada contaminante según los rangos oficiales de la NOM-172
  // (-1 = sin dato: ese contaminante no participa en la dominancia)
  int nivelPM25 = clasificar(pm25_compensado, 15.0, 33.0, 79.0, 130.0);
  int nivelPM10 = clasificar(pm10_compensado, 50.0, 75.0, 155.0, 235.0);
  int nivelCO = clasificar(ppmCO, 5.0, 9.0, 12.0, 16.0);

  // Obtiene el contaminante dominante y actualiza el semáforo de LEDs físicos
  int nivelDominante = max(nivelPM25, max(nivelPM10, nivelCO));
  String contaminanteDominante = "PM2.5";

  if (nivelPM10 > nivelPM25 && nivelPM10 >= nivelCO)
  {
    contaminanteDominante = "PM10";
  }
  else if (nivelCO > nivelPM25 && nivelCO > nivelPM10)
  {
    contaminanteDominante = "CO";
  }

  String estadoCalidad = "";

  digitalWrite(LED_VERDE, LOW);
  digitalWrite(LED_AMARILLO, LOW);
  digitalWrite(LED_ROJO, LOW);

  switch (nivelDominante)
  {
  case 0:
    digitalWrite(LED_VERDE, HIGH);
    estadoCalidad = "BUENA";
    break;
  case 1:
    digitalWrite(LED_AMARILLO, HIGH);
    estadoCalidad = "ACEPTABLE";
    break;
  case 2:
    digitalWrite(LED_AMARILLO, HIGH);
    digitalWrite(LED_ROJO, HIGH);
    estadoCalidad = "MALA";
    break;
  case 3:
    digitalWrite(LED_ROJO, HIGH);
    estadoCalidad = "MUY MALA";
    break;
  case 4:
    digitalWrite(LED_ROJO, (millis() % 300 < 150) ? HIGH : LOW);
    estadoCalidad = "EXT. MALA";
    break;
  }

  // Empaqueta todas las variables en un objeto JSON; un sensor sin lectura va como null
  String payload = String("{") +
                   campoJson("pm1", pm1_compensado, 1) + "," +
                   campoJson("pm25", pm25_compensado, 1) + "," +
                   campoJson("pm10", pm10_compensado, 1) + "," +
                   campoJson("co", ppmCO, 2) + "," +
                   campoJson("temp", temperatura, 1) + "," +
                   campoJson("hum", humedad, 1) + "," +
                   nivelJson("nivel_pm25", nivelPM25) + "," +
                   nivelJson("nivel_pm10", nivelPM10) + "," +
                   nivelJson("nivel_co", nivelCO) + "," +
                   nivelJson("nivel_general", nivelDominante) + "," +
                   "\"dominante\":\"" + contaminanteDominante + "\"," +
                   "\"estado\":\"" + estadoCalidad + "\"}";

  bool publicado = enLinea && client.publish(mqtt_topic.c_str(), payload.c_str());

  // Guarda una muestra por minuto en Supabase (histórico aunque la app esté
  // cerrada). Solo necesita Wi-Fi: no depende de que el broker MQTT responda.
  static unsigned long ultimoEnvioNube = 0;
  static bool primerEnvioNube = true;
  if (HISTORICO_NUBE && pmsVigente && WiFi.status() == WL_CONNECTED &&
      (primerEnvioNube || millis() - ultimoEnvioNube >= INTERVALO_NUBE_MS))
  {
    primerEnvioNube = false;
    ultimoEnvioNube = millis();
    guardar_en_supabase(pm1_compensado, pm25_compensado, pm10_compensado, ppmCO,
                        temperatura, humedad, nivelDominante, contaminanteDominante);
  }

  // Alterna dinámicamente las dos vistas de texto en la pantalla LCD 1602
  static bool vistaLcd = false;
  vistaLcd = !vistaLcd;

  String tempStr = textoValor(temperatura, 1);
  String humStr = textoValor(humedad, 1);
  String pm25Str = isnan(pm25_compensado) ? String("--") : String((int)pm25_compensado);
  String pm10Str = isnan(pm10_compensado) ? String("--") : String((int)pm10_compensado);

  String linea1 = "";
  String linea2 = "";

  if (vistaLcd)
  {
    linea1 = "AIRE: " + estadoCalidad;
    linea2 = "DOM:" + contaminanteDominante;
    if (contaminanteDominante == "PM2.5")
    {
      linea2 += " " + pm25Str + "ug";
    }
    else if (contaminanteDominante == "CO")
    {
      linea2 += " " + textoValor(ppmCO, 1) + "p";
    }
    else if (contaminanteDominante == "PM10")
    {
      linea2 += " " + pm10Str + "ug";
    }
  }
  else
  {
    linea1 = "T:" + tempStr + "C H:" + humStr + "%";
    linea2 = "P2.5:" + pm25Str + " C:" + textoValor(ppmCO, 1);
  }

  while (linea1.length() < 16)
    linea1 += " ";
  if (linea1.length() > 16)
    linea1 = linea1.substring(0, 16);
  lcd.setCursor(0, 0);
  lcd.print(linea1);

  while (linea2.length() < 16)
    linea2 += " ";
  if (linea2.length() > 16)
    linea2 = linea2.substring(0, 16);
  lcd.setCursor(0, 1);
  lcd.print(linea2);

  // Muestra las trazas de depuración detalladas en el Monitor Serial
  Serial.println("\n------------------------------------------------");
  Serial.printf("Temp: %s °C | Hum: %s %%\n", tempStr.c_str(), humStr.c_str());
  Serial.printf("PM1: %s | PM2.5: %s | PM10: %s ug/m3 | CO: %s PPM\n",
                textoValor(pm1_compensado, 1).c_str(), textoValor(pm25_compensado, 1).c_str(),
                textoValor(pm10_compensado, 1).c_str(), textoValor(ppmCO, 2).c_str());
  // Datos intermedios del MQ-7 para depurar la estimación de CO
  Serial.printf("MQ-7: V_AO: %.3f V | Rs: %s kOhm | Rs/R0: %s (R0=%.2f kOhm%s) | CO: %s ppm",
                vAoMq7, textoValor(rsMq7, 2).c_str(), textoValor(ratioMq7, 3).c_str(),
                r0Mq7, r0Calibrada ? "" : ", por defecto", textoValor(ppmCO, 2).c_str());
  if (!mq7Caliente)
  {
    Serial.printf(" [calentando, faltan %lu s]", (MQ7_CALENTAMIENTO_MS - millis()) / 1000);
  }
  Serial.println();
  Serial.printf("Dominante: %s (Nivel %d) | Estado: [%s]\n", contaminanteDominante.c_str(), nivelDominante, estadoCalidad.c_str());
  Serial.print(publicado ? "JSON Enviado: " : "JSON sin enviar (sin conexión MQTT): ");
  Serial.println(payload);
  Serial.println("------------------------------------------------");

  delay(2000);
}
