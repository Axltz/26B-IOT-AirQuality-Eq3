/*
  Mi Entorno - ESP32 (DHT22 + MQ-7 + PMS5003 + semáforo de LEDs)

  Mide temperatura, humedad, CO y partículas, enciende el semáforo según la
  NOM-172-SEMARNAT-2023 y le pasa los datos a la app Mi Entorno por la red
  local. No necesita internet.

  WI-FI (WiFiManager)
    - La primera vez, o si no encuentra la red guardada, crea la red
      "MiEntorno-Config" (clave: mientorno). Conéctate a ella con el
      teléfono; se abre una página (si no, entra a http://192.168.4.1).
      Elige tu Wi-Fi, escribe su contraseña y guarda. Queda guardada en el
      ESP32 y se conecta sola las siguientes veces.
    - Para cambiar de red: mantén presionado el botón BOOT 3 segundos.
      Mantenerlo 10 segundos borra la red guardada y reinicia.
    - Usa una red local normal: el módem de una casa o el hotspot de un
      teléfono. Las redes públicas con página de inicio de sesión o de
      invitados no sirven, porque no dejan que el teléfono vea al ESP32.
    - El teléfono (y la laptop que corre la app) deben estar en la misma red.

  EN LA APP
    Casa ▾ > Agregar ESP32 > escribe la IP que aparece en el Monitor Serie
    (115200 baudios). En iPhone también sirve "mientorno.local".

  RUTAS
    GET /api/lecturas    lectura actual (JSON)
    GET /api/historial   una muestra cada 5 min de las últimas 24 h
    GET /simular/malo    PM2.5 = 68 ug/m3 para probar la alerta
    GET /simular/normal  vuelve a las lecturas reales

  LIBRERÍAS (Programa > Incluir librería > Administrar bibliotecas)
    - WiFiManager (de tzapu)
    - DHT sensor library (de Adafruit) y Adafruit Unified Sensor
*/

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include <WiFiManager.h>
#include <DHT.h>

// ------------------------------------------------------------ configuración
const char* NOMBRE = "Mi Entorno";           // nombre que verá la app
const char* HOSTNAME = "mientorno";          // http://mientorno.local
const char* AP_NOMBRE = "MiEntorno-Config";  // red para configurar el Wi-Fi
const char* AP_CLAVE = "mientorno";          // mínimo 8 caracteres

// Definición de pines según diagrama físico (Figura 3)
#define DHTPIN 4         // Pin G4 para el DHT22
#define DHTTYPE DHT22
#define PIN_MQ7 34       // Pin G34 para la señal analógica del MQ-7

// Módulo Semáforo de 3 LEDs
#define LED_VERDE 12     // Pin G12 (Verde)
#define LED_AMARILLO 14  // Pin G14 (Amarillo)
#define LED_ROJO 27      // Pin G27 (Rojo)

// Puerto Serial2 para el sensor de partículas PMS5003
// Conexión CRUZADA: TX del PMS5003 -> G16 (RXD2) | RX del PMS5003 -> G17 (TXD2)
#define RXD2 16
#define TXD2 17

#define PIN_BOTON 0      // botón BOOT de la placa

const unsigned long INTERVALO_LECTURA = 2000;                // sensores y semáforo
const unsigned long INTERVALO_MUESTRA = 5UL * 60UL * 1000UL;  // historial
const unsigned long PMS_SIN_DATOS_MS = 5000;       // sin trama válida en 5 s = sin datos
const unsigned long PMS_CALENTAMIENTO_MS = 30000;  // el ventilador necesita ~30 s
const unsigned long DHT_SIN_DATOS_MS = 10000;
const unsigned long REINTENTO_WIFI_MS = 30000;

const char* ESTADOS[] = {
  "BUENA (VERDE)",
  "ACEPTABLE (AMARILLO)",
  "MALA (AMARILLO + ROJO)",
  "MUY MALA (ROJO)",
  "EXTREMADAMENTE MALA (PARPADEO ROJO)"
};
const char* ESTADOS_CORTOS[] = {"BUENA", "ACEPTABLE", "MALA", "MUY MALA", "EXTREMADAMENTE MALA"};

DHT dht(DHTPIN, DHTTYPE);
WiFiManager wm;
WebServer servidor(80);

// ------------------------------------------------------------ lecturas
struct Lectura {
  float t, h, pm1, pm25, pm10, co;  // NAN = sin dato
};
Lectura actual = {NAN, NAN, NAN, NAN, NAN, NAN};
int nivelDominante = 0;

struct Muestra {
  uint32_t ms;
  Lectura l;
};
const int MAX_MUESTRAS = 288;  // 24 h con una muestra cada 5 min
Muestra historial[MAX_MUESTRAS];
int histInicio = 0;
int histCuenta = 0;

float ultimaT = NAN, ultimaH = NAN;
unsigned long ultimoDHT = 0;
unsigned long ultimaLectura = 0;
unsigned long ultimaMuestra = 0;
bool simularAireMalo = false;

bool servidorActivo = false;
bool mdnsActivo = false;
unsigned long ultimoIntentoWifi = 0;

// ---------------------------------------------------------------- PMS5003
// Trama de 32 bytes: 0x42 0x4D, largo (28), 13 datos de 2 bytes y suma de verificación
#define PMS_LARGO_TRAMA 32
uint8_t tramaPMS[PMS_LARGO_TRAMA];
uint8_t posTrama = 0;

uint16_t pm1_0 = 0, pm2_5 = 0, pm10 = 0;  // ug/m3 (ambiente)
bool hayLecturaPMS = false;
unsigned long ultimaTramaPMS = 0;         // millis() de la última trama válida
unsigned long bytesPMS = 0, tramasOK = 0, tramasMalas = 0;

// Lee todo lo que haya llegado y guarda solo tramas completas y válidas
void leerPMS5003() {
  while (Serial2.available()) {
    uint8_t b = Serial2.read();
    bytesPMS++;

    // Sincronizar con el encabezado 0x42 0x4D
    if (posTrama == 0 && b != 0x42) continue;
    if (posTrama == 1 && b != 0x4D) {
      posTrama = (b == 0x42) ? 1 : 0;
      continue;
    }
    tramaPMS[posTrama++] = b;

    if (posTrama == PMS_LARGO_TRAMA) {
      posTrama = 0;
      uint16_t largo = (tramaPMS[2] << 8) | tramaPMS[3];
      uint16_t suma = 0;
      for (int i = 0; i < 30; i++) suma += tramaPMS[i];
      uint16_t sumaTrama = (tramaPMS[30] << 8) | tramaPMS[31];

      if (largo != 28 || suma != sumaTrama) {
        tramasMalas++;
        continue;
      }
      // Bytes 10-15: concentraciones de ambiente (atmospheric environment)
      pm1_0 = (tramaPMS[10] << 8) | tramaPMS[11];
      pm2_5 = (tramaPMS[12] << 8) | tramaPMS[13];
      pm10 = (tramaPMS[14] << 8) | tramaPMS[15];
      hayLecturaPMS = true;
      ultimaTramaPMS = millis();
      tramasOK++;
    }
  }
}

bool pmsVigente() {
  return hayLecturaPMS && millis() - ultimaTramaPMS < PMS_SIN_DATOS_MS;
}

void diagnosticoPMS() {
  if (bytesPMS == 0) {
    Serial.println("  PMS5003: no llega ningun dato. Revisa:");
    Serial.println("   - TX del sensor -> G16 (RXD2) y RX del sensor -> G17 (TXD2)");
    Serial.println("   - VCC del sensor a 5V (el ventilador debe girar) y GND comun");
    Serial.println("   - Pin SET del sensor sin conectar (en GND el sensor se duerme)");
  } else if (tramasOK == 0) {
    Serial.printf("  PMS5003: llegan datos (%lu bytes) pero ninguna trama valida (%lu malas).\n",
                  bytesPMS, tramasMalas);
    Serial.println("   - Revisa que TX/RX no esten invertidos, GND comun y cables flojos");
    Serial.println("   - Si tu placa es ESP32-WROVER, G16/G17 son de la PSRAM: usa otros pines");
  } else {
    Serial.printf("  PMS5003: se dejo de recibir hace %lu s (tramas OK: %lu, malas: %lu)\n",
                  (millis() - ultimaTramaPMS) / 1000, tramasOK, tramasMalas);
  }
}

// ------------------------------------------------------- medición y semáforo
void medir() {
  // 1. DHT22 (a veces falla una lectura: se usa la última buena durante 10 s)
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  if (!isnan(h) && !isnan(t)) {
    ultimaH = h;
    ultimaT = t;
    ultimoDHT = millis();
  }
  bool dhtVigente = ultimoDHT != 0 && millis() - ultimoDHT < DHT_SIN_DATOS_MS;
  actual.t = dhtVigente ? ultimaT : NAN;
  actual.h = dhtVigente ? ultimaH : NAN;

  // 2. MQ-7 (monóxido de carbono)
  int rawGas = analogRead(PIN_MQ7);
  actual.co = (rawGas / 4095.0) * 25.0;  // Conversión a PPM (0 - 25 PPM)

  // 3. PMS5003 + compensación higroscópica por humedad alta (NOM-172)
  if (pmsVigente()) {
    float pm25 = pm2_5;
    if (!isnan(actual.h) && actual.h > 70.0) pm25 = pm25 * 0.85;  // ajuste por vapor de agua
    actual.pm1 = pm1_0;
    actual.pm25 = pm25;
    actual.pm10 = pm10;
  } else {
    actual.pm1 = NAN;
    actual.pm25 = NAN;
    actual.pm10 = NAN;
  }
  if (simularAireMalo) {
    actual.pm25 = 68.0;
    actual.pm10 = 96.0;
  }

  // 4. Clasificación Oficial PM2.5 (NOM-172-SEMARNAT-2023); sin datos no cuenta
  int nivelPM25 = 0;
  if (!isnan(actual.pm25)) {
    if (actual.pm25 <= 15.0) nivelPM25 = 0;        // Buena
    else if (actual.pm25 <= 25.0) nivelPM25 = 1;   // Aceptable
    else if (actual.pm25 <= 79.0) nivelPM25 = 2;   // Mala
    else if (actual.pm25 <= 130.0) nivelPM25 = 3;  // Muy Mala
    else nivelPM25 = 4;                            // Extremadamente Mala
  }

  // 5. Clasificación Oficial CO (NOM-172-SEMARNAT-2023)
  int nivelCO = 0;
  if (actual.co <= 5.0) nivelCO = 0;         // Buena
  else if (actual.co <= 9.0) nivelCO = 1;    // Aceptable
  else if (actual.co <= 12.0) nivelCO = 2;   // Mala
  else if (actual.co <= 16.0) nivelCO = 3;   // Muy Mala
  else nivelCO = 4;                          // Extremadamente Mala

  // 6. Evaluación por Peor Escenario (Regla de Dominancia) y semáforo
  nivelDominante = max(nivelPM25, nivelCO);
  digitalWrite(LED_VERDE, nivelDominante == 0 ? HIGH : LOW);
  digitalWrite(LED_AMARILLO, (nivelDominante == 1 || nivelDominante == 2) ? HIGH : LOW);
  digitalWrite(LED_ROJO, (nivelDominante == 2 || nivelDominante == 3) ? HIGH : LOW);
  // el nivel 4 (parpadeo rojo) se hace en loop()
}

String texto(float v, int decimales) {
  return isnan(v) ? String("--") : String(v, decimales);
}

void imprimir() {
  Serial.println("\n------------------------------------------------");
  Serial.printf("Temperatura: %s °C | Humedad: %s %%\n",
                texto(actual.t, 1).c_str(), texto(actual.h, 1).c_str());
  if (!isnan(actual.pm25)) {
    Serial.printf("Gas CO: %.2f PPM | Polvo PM2.5: %.1f ug/m3 (PM1.0: %s | PM10: %s)%s%s\n",
                  actual.co, actual.pm25, texto(actual.pm1, 0).c_str(), texto(actual.pm10, 0).c_str(),
                  millis() < PMS_CALENTAMIENTO_MS ? " [calentando]" : "",
                  simularAireMalo ? " [SIMULADO]" : "");
  } else {
    Serial.printf("Gas CO: %.2f PPM | Polvo PM2.5: SIN DATOS\n", actual.co);
    diagnosticoPMS();
  }
  Serial.printf("Estado del Aire (NOM-172): [%s]\n", ESTADOS[nivelDominante]);

  if (wm.getConfigPortalActive()) {
    Serial.printf("Wi-Fi: configurando. Conectate a la red \"%s\" (clave: %s) y abre http://192.168.4.1\n",
                  AP_NOMBRE, AP_CLAVE);
  } else if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("Wi-Fi: %s | En la app escribe: %s\n",
                  WiFi.SSID().c_str(), WiFi.localIP().toString().c_str());
  } else {
    Serial.println("Wi-Fi: sin conexion (manten BOOT 3 s para elegir una red)");
  }
  Serial.println("------------------------------------------------");
}

void guardarMuestra() {
  int pos = (histInicio + histCuenta) % MAX_MUESTRAS;
  if (histCuenta == MAX_MUESTRAS) {
    histInicio = (histInicio + 1) % MAX_MUESTRAS;
  } else {
    histCuenta++;
  }
  historial[pos] = Muestra{(uint32_t)millis(), actual};
}

// ------------------------------------------------------------------ JSON
void campo(String& s, const char* clave, float v, int decimales) {
  if (isnan(v)) return;  // sin dato: la app muestra "—"
  s += ",\"";
  s += clave;
  s += "\":";
  s += String(v, decimales);
}

String jsonLectura(const Lectura& l) {
  String s;
  campo(s, "temperatura", l.t, 1);
  campo(s, "humedad", l.h, 1);
  campo(s, "pm1", l.pm1, 0);
  campo(s, "pm25", l.pm25, 1);
  campo(s, "pm10", l.pm10, 0);
  campo(s, "co", l.co, 2);
  return s;
}

// ------------------------------------------------------------------ rutas
void cabecerasCors() {
  servidor.sendHeader("Access-Control-Allow-Origin", "*");
  servidor.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  servidor.sendHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  servidor.sendHeader("Cache-Control", "no-store");
}

void rutaLecturas() {
  String s = "{\"dispositivo\":\"";
  s += NOMBRE;
  s += "\"";
  s += jsonLectura(actual);
  s += ",\"nivel_nom172\":";
  s += String(nivelDominante);
  s += ",\"estado_nom172\":\"";
  s += ESTADOS_CORTOS[nivelDominante];
  s += "\",\"pms5003\":\"";
  s += !pmsVigente() ? "sin datos" : (millis() < PMS_CALENTAMIENTO_MS ? "calentando" : "ok");
  s += "\",\"uptime_s\":";
  s += String(millis() / 1000);
  s += "}";
  cabecerasCors();
  servidor.send(200, "application/json", s);
}

void rutaHistorial() {
  cabecerasCors();
  servidor.setContentLength(CONTENT_LENGTH_UNKNOWN);
  servidor.send(200, "application/json", "");
  String s = "{\"intervalo_s\":";
  s += String(INTERVALO_MUESTRA / 1000);
  s += ",\"muestras\":[";
  servidor.sendContent(s);

  uint32_t ahora = millis();
  for (int i = 0; i < histCuenta; i++) {
    const Muestra& m = historial[(histInicio + i) % MAX_MUESTRAS];
    s = i == 0 ? "{" : ",{";
    s += "\"hace_s\":";
    s += String((ahora - m.ms) / 1000);
    s += jsonLectura(m.l);
    s += "}";
    servidor.sendContent(s);
  }
  servidor.sendContent("]}");
  servidor.sendContent("");  // fin de la respuesta
}

void rutaSimularMalo() {
  simularAireMalo = true;
  medir();
  cabecerasCors();
  servidor.send(200, "application/json", "{\"aire\":\"malo\"}");
}

void rutaSimularNormal() {
  simularAireMalo = false;
  medir();
  cabecerasCors();
  servidor.send(200, "application/json", "{\"aire\":\"normal\"}");
}

void rutaInicio() {
  String s = "Mi Entorno - ";
  s += NOMBRE;
  s += "\nLecturas: /api/lecturas\nHistorial: /api/historial\nEstado (NOM-172): ";
  s += ESTADOS[nivelDominante];
  s += "\n";
  cabecerasCors();
  servidor.send(200, "text/plain; charset=utf-8", s);
}

void rutaNoEncontrada() {
  cabecerasCors();
  if (servidor.method() == HTTP_OPTIONS) {
    servidor.send(204);
  } else {
    servidor.send(404, "application/json", "{\"error\":\"no encontrado\"}");
  }
}

// ------------------------------------------------------------------- Wi-Fi
void iniciarServidor() {
  servidor.begin();
  servidorActivo = true;
  if (!mdnsActivo && MDNS.begin(HOSTNAME)) {
    MDNS.addService("http", "tcp", 80);
    mdnsActivo = true;
  }
  Serial.println("\n================================================");
  Serial.printf(" Conectado a \"%s\"\n", WiFi.SSID().c_str());
  Serial.printf(" En la app escribe esta IP: %s\n", WiFi.localIP().toString().c_str());
  Serial.printf(" (en iPhone tambien sirve: %s.local)\n", HOSTNAME);
  Serial.println("================================================");
}

void abrirPortal() {
  // El portal usa el puerto 80: se apaga el servidor de la app mientras tanto
  if (servidorActivo) {
    servidor.stop();
    servidorActivo = false;
  }
  Serial.printf("\nPortal de Wi-Fi abierto: conectate a la red \"%s\" (clave: %s)\n", AP_NOMBRE, AP_CLAVE);
  Serial.println("y elige tu red en la pagina que se abre (o en http://192.168.4.1)");
  wm.startConfigPortal(AP_NOMBRE, AP_CLAVE);  // no bloquea: lo atiende wm.process()
}

void revisarWifi() {
  bool conectado = WiFi.status() == WL_CONNECTED;
  bool portal = wm.getConfigPortalActive();

  if (conectado && !portal && !servidorActivo) iniciarServidor();
  if (!conectado && servidorActivo) {
    servidor.stop();
    servidorActivo = false;
  }
  // Si se cae la red guardada, se reintenta cada 30 s (las lecturas siguen)
  if (!conectado && !portal && millis() - ultimoIntentoWifi > REINTENTO_WIFI_MS) {
    ultimoIntentoWifi = millis();
    WiFi.reconnect();
  }
}

// BOOT 3 s: elegir otra red | BOOT 10 s: borrar la red guardada
void revisarBotonBoot() {
  static unsigned long inicio = 0;
  bool presionado = digitalRead(PIN_BOTON) == LOW;
  if (presionado && inicio == 0) inicio = millis();
  if (!presionado && inicio != 0) {
    unsigned long duracion = millis() - inicio;
    inicio = 0;
    if (duracion >= 10000) {
      Serial.println("\nBorrando la red guardada y reiniciando...");
      wm.resetSettings();
      delay(500);
      ESP.restart();
    } else if (duracion >= 3000 && !wm.getConfigPortalActive()) {
      abrirPortal();
    }
  }
}

// ------------------------------------------------------------------ inicio
void setup() {
  Serial.begin(115200);
  Serial2.setRxBufferSize(512);                 // debe ir antes de begin()
  Serial2.begin(9600, SERIAL_8N1, RXD2, TXD2);  // orden: RX, TX
  dht.begin();

  pinMode(LED_VERDE, OUTPUT);
  pinMode(LED_AMARILLO, OUTPUT);
  pinMode(LED_ROJO, OUTPUT);
  pinMode(PIN_MQ7, INPUT);
  pinMode(PIN_BOTON, INPUT_PULLUP);

  Serial.println("\n--- SISTEMA DE MONITOREO AMBIENTAL (NOM-172-SEMARNAT-2023) ---");

  servidor.on("/", HTTP_GET, rutaInicio);
  servidor.on("/api/lecturas", HTTP_GET, rutaLecturas);
  servidor.on("/api/historial", HTTP_GET, rutaHistorial);
  servidor.on("/simular/malo", HTTP_GET, rutaSimularMalo);
  servidor.on("/simular/normal", HTTP_GET, rutaSimularNormal);
  servidor.onNotFound(rutaNoEncontrada);

  // Wi-Fi: usa la red guardada; si no hay o no está, abre el portal sin
  // detener las mediciones ni el semáforo.
  WiFi.mode(WIFI_STA);
  wm.setDebugOutput(false);
  wm.setHostname(HOSTNAME);
  wm.setConfigPortalBlocking(false);
  wm.setConnectTimeout(15);
  wm.setConfigPortalTimeout(300);  // el portal se cierra solo a los 5 min sin uso
  if (wm.autoConnect(AP_NOMBRE, AP_CLAVE)) {
    iniciarServidor();
  } else {
    Serial.printf("\nSin red guardada o no disponible. Conectate a la red \"%s\" (clave: %s)\n",
                  AP_NOMBRE, AP_CLAVE);
    Serial.println("y elige tu Wi-Fi en la pagina que se abre (o en http://192.168.4.1)");
  }
}

void loop() {
  wm.process();     // atiende el portal de configuración si está abierto
  revisarWifi();    // arranca el servidor al conectarse y reintenta si se cae
  if (servidorActivo) servidor.handleClient();
  leerPMS5003();    // se llama en cada vuelta para no perder bytes
  revisarBotonBoot();

  unsigned long ahora = millis();
  if (ahora - ultimaLectura >= INTERVALO_LECTURA) {
    ultimaLectura = ahora;
    medir();
    imprimir();
    // El historial empieza cuando el PMS5003 ya se estabilizó
    if (ahora >= PMS_CALENTAMIENTO_MS && (histCuenta == 0 || ahora - ultimaMuestra >= INTERVALO_MUESTRA)) {
      ultimaMuestra = ahora;
      guardarMuestra();
    }
  }

  // Parpadeo del rojo en "Extremadamente mala"
  if (nivelDominante == 4) {
    digitalWrite(LED_ROJO, (millis() % 300 < 150) ? HIGH : LOW);
  }
}
