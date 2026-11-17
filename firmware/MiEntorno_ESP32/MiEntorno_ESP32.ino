#include <Arduino.h>
#include <DHT.h>
#include <WiFi.h>
#include <DNSServer.h>
#include <WebServer.h>
#include <WiFiManager.h>  
#include <PubSubClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);

const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;

// IDENTIFICADOR DE ESTA ESTACIÓN
// Cambia a "nodo2", "nodo3", etc. para cada ESP32 adicional que compiles,
// o déjalo en "nodo1" para la estación principal.
const char* NODO_ID = "nodo1";
String mqtt_topic = "colectivo/aire/" + String(NODO_ID);

WiFiClient espClient;
PubSubClient client(espClient);

// CONFIGURACIÓN DE PINES Y SENSORES (INTACTOS)
#define DHTPIN 4         // Pin G4 para el DHT22
#define DHTTYPE DHT22

#define PIN_MQ7 34       // Pin G34 para el MQ-7

#define LED_VERDE 12     // Pin G12 (Verde)
#define LED_AMARILLO 14  // Pin G14 (Amarillo)
#define LED_ROJO 27      // Pin G27 (Rojo)

#define RXD2 17          // Pin G17 ESP32 (va al TX del PMS5003)
#define TXD2 16          // Pin G16 ESP32 (va al RX del PMS5003)

DHT dht(DHTPIN, DHTTYPE);

void setup_wifi_manager() {
  WiFiManager wm;
  Serial.println("\n[INFO] Conectando a Wi-Fi...");
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Conectando WiFi");
  lcd.setCursor(0, 1);
  lcd.print("Busca ESP32_Aire");

  if (!wm.autoConnect("ESP32_Aire_Config")) {
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

void reconnect_mqtt() {
  if (WiFi.status() != WL_CONNECTED) return;
  Serial.print("[MQTT] Conectando a HiveMQ...");
  String clientId = "ESP32_Aire_Eq3_" + String(random(0xffff), HEX);
  if (client.connect(clientId.c_str())) {
    Serial.println(" [OK] Conectado.");
    Serial.print("[MQTT] Publicando en: ");
    Serial.println(mqtt_topic);
  } else {
    Serial.print(" [ERROR] rc=");
    Serial.println(client.state());
  }
}

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, RXD2, TXD2);

  // Inicializar LCD I2C
  lcd.init();                      
  lcd.backlight(); 
  lcd.clear();

  dht.begin();
  pinMode(LED_VERDE, OUTPUT);
  pinMode(LED_AMARILLO, OUTPUT);
  pinMode(LED_ROJO, OUTPUT);
  pinMode(PIN_MQ7, INPUT);

  setup_wifi_manager();
  
  client.setServer(mqtt_server, mqtt_port);
  // Margen suficiente para el payload JSON completo en cualquier nodo.
  client.setBufferSize(512);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.reconnect();
    delay(2000);
    return;
  }

  if (!client.connected()) {
    reconnect_mqtt();
    delay(2000);
    return;
  }
  client.loop();

  // 1. Lectura del DHT22
  float humedad = dht.readHumidity();
  float temperatura = dht.readTemperature();

  // 2. Lectura del MQ-7 (CO)
  int rawGas = analogRead(PIN_MQ7);
  float ppmCO = (rawGas / 4095.0) * 25.0; 

  // 3. Lectura Completa del PMS5003 (PM1, PM2.5 y PM10 atmosféricos)
  static float pm1  = 0.0;
  static float pm25 = 0.0;
  static float pm10 = 0.0;
  
  while (Serial2.available() > 32) {
    Serial2.read();
  }

  if (Serial2.available() >= 32) {
    if (Serial2.read() == 0x42) {
      if (Serial2.read() == 0x4D) {
        uint8_t buf[30];
        Serial2.readBytes(buf, 30);
        
        uint16_t valPM1  = (buf[8]  << 8) | buf[9];
        uint16_t valPM25 = (buf[10] << 8) | buf[11];
        uint16_t valPM10 = (buf[12] << 8) | buf[13];

        if (valPM1  < 1000) pm1  = (float)valPM1;
        if (valPM25 < 1000) pm25 = (float)valPM25;
        if (valPM10 < 1000) pm10 = (float)valPM10;
      }
    }
  }

  // 4. Compensación Higroscópica (NOM-172)
  float pm1_compensado  = pm1;
  float pm25_compensado = pm25;
  float pm10_compensado = pm10;

  if (!isnan(humedad) && humedad > 70.0) {
    pm1_compensado  = pm1  * 0.85;
    pm25_compensado = pm25 * 0.85;
    pm10_compensado = pm10 * 0.85;
  }

  // 5. Clasificación PM2.5 (NOM-172-SEMARNAT-2023)
  int nivelPM25 = 0;
  if (pm25_compensado <= 15.0) nivelPM25 = 0;
  else if (pm25_compensado <= 33.0) nivelPM25 = 1;
  else if (pm25_compensado <= 79.0) nivelPM25 = 2;
  else if (pm25_compensado <= 130.0) nivelPM25 = 3;
  else nivelPM25 = 4;

  // 6. Clasificación PM10 (NOM-172-SEMARNAT-2023)
  int nivelPM10 = 0;
  if (pm10_compensado <= 50.0) nivelPM10 = 0;
  else if (pm10_compensado <= 75.0) nivelPM10 = 1;
  else if (pm10_compensado <= 155.0) nivelPM10 = 2;
  else if (pm10_compensado <= 235.0) nivelPM10 = 3;
  else nivelPM10 = 4;

  // 7. Clasificación CO (NOM-172-SEMARNAT-2023)
  int nivelCO = 0;
  if (ppmCO <= 5.0) nivelCO = 0;
  else if (ppmCO <= 9.0) nivelCO = 1;
  else if (ppmCO <= 12.0) nivelCO = 2;
  else if (ppmCO <= 16.0) nivelCO = 3;
  else nivelCO = 4;

  // 8. Contaminante Dominante (peor de los 3 normados) y Semáforo LED
  int nivelDominante = max(nivelPM25, max(nivelPM10, nivelCO));
  String contaminanteDominante = "PM2.5";

  if (nivelPM10 > nivelPM25 && nivelPM10 >= nivelCO) {
    contaminanteDominante = "PM10";
  } else if (nivelCO > nivelPM25 && nivelCO > nivelPM10) {
    contaminanteDominante = "CO";
  }

  String estadoCalidad = "";

  digitalWrite(LED_VERDE, LOW);
  digitalWrite(LED_AMARILLO, LOW);
  digitalWrite(LED_ROJO, LOW);

  switch(nivelDominante) {
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

  // 9. Payload JSON Completo y Envío por MQTT
  String tempStr = isnan(temperatura) ? "0.0" : String(temperatura, 1);
  String humStr  = isnan(humedad)     ? "0.0" : String(humedad, 1);

  String payload = "{\"pm1\":" + String(pm1_compensado, 1) +
                   ",\"pm25\":" + String(pm25_compensado, 1) +
                   ",\"pm10\":" + String(pm10_compensado, 1) +
                   ",\"co\":" + String(ppmCO, 2) +
                   ",\"temp\":" + tempStr +
                   ",\"hum\":" + humStr +
                   ",\"nivel_pm25\":" + String(nivelPM25) +
                   ",\"nivel_pm10\":" + String(nivelPM10) +
                   ",\"nivel_co\":" + String(nivelCO) +
                   ",\"nivel_general\":" + String(nivelDominante) +
                   ",\"dominante\":\"" + contaminanteDominante + "\"" +
                   ",\"estado\":\"" + estadoCalidad + "\"}";

  client.publish(mqtt_topic.c_str(), payload.c_str());

  // 10. Mostrar datos en el LCD 1602 con rotación dinámica de vistas (16 caracteres exactos por línea)
  static bool vistaLcd = false;
  vistaLcd = !vistaLcd;

  String linea1 = "";
  String linea2 = "";

  if (vistaLcd) {
    // Vista 1: Calidad del aire y contaminante dominante (lo más relevante)
    linea1 = "AIRE: " + estadoCalidad;
    linea2 = "DOM:" + contaminanteDominante;
    if (contaminanteDominante == "PM2.5") {
      linea2 += " " + String((int)pm25_compensado) + "ug";
    } else if (contaminanteDominante == "CO") {
      linea2 += " " + String(ppmCO, 1) + "p";
    } else if (contaminanteDominante == "PM10") {
      linea2 += " " + String((int)pm10_compensado) + "ug";
    }
  } else {
    // Vista 2: Clima y lecturas complementarias
    linea1 = "T:" + tempStr + "C H:" + humStr + "%";
    linea2 = "P2.5:" + String((int)pm25_compensado) + " C:" + String(ppmCO, 1);
  }

  while (linea1.length() < 16) linea1 += " ";
  if (linea1.length() > 16) linea1 = linea1.substring(0, 16);
  lcd.setCursor(0, 0);
  lcd.print(linea1);

  while (linea2.length() < 16) linea2 += " ";
  if (linea2.length() > 16) linea2 = linea2.substring(0, 16);
  lcd.setCursor(0, 1);
  lcd.print(linea2);

  // Depuración Serial
  Serial.println("\n------------------------------------------------");
  Serial.printf("Temp: %s °C | Hum: %s %%\n", tempStr.c_str(), humStr.c_str());
  Serial.printf("PM1: %.1f | PM2.5: %.1f | PM10: %.1f ug/m3 | CO: %.2f PPM\n", pm1_compensado, pm25_compensado, pm10_compensado, ppmCO);
  Serial.printf("Dominante: %s (Nivel %d) | Estado: [%s]\n", contaminanteDominante.c_str(), nivelDominante, estadoCalidad.c_str());
  Serial.print("JSON Enviado: ");
  Serial.println(payload);
  Serial.println("------------------------------------------------");

  delay(2000);
}