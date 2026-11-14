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

WiFiClient espClient;
PubSubClient client(espClient);

// CONFIGURACIÓN DE PINES Y SENSORES
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
  lcd.backlight(); // Enciende la luz de fondo azul
  lcd.clear();

  dht.begin();
  pinMode(LED_VERDE, OUTPUT);
  pinMode(LED_AMARILLO, OUTPUT);
  pinMode(LED_ROJO, OUTPUT);
  pinMode(PIN_MQ7, INPUT);

  setup_wifi_manager();
  
  client.setServer(mqtt_server, mqtt_port);
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

  // 2. Lectura del MQ-7 (CO) - Corregido con el operador de multiplicación (*)
  int rawGas = analogRead(PIN_MQ7);
  float ppmCO = (rawGas / 4095.0) * 25.0; 

  // 3. Lectura Directa y Confiable del PMS5003 (PM2.5)
  static float pm25 = 0.0;
  
  while (Serial2.available() > 32) {
    Serial2.read();
  }

  if (Serial2.available() >= 32) {
    if (Serial2.read() == 0x42) {
      if (Serial2.read() == 0x4D) {
        uint8_t buf[30];
        Serial2.readBytes(buf, 30);
        uint16_t valPM25 = (buf[10] << 8) | buf[11];
        if (valPM25 < 1000) {
          pm25 = (float)valPM25;
        }
      }
    }
  }

  // 4. Compensación Higroscópica (NOM-172)
  float pm25_compensado = pm25;
  if (!isnan(humedad) && humedad > 70.0) {
    pm25_compensado = pm25 * 0.85; 
  }

  // 5. Clasificación PM2.5 (NOM-172)
  int nivelPM25 = 0;
  if (pm25_compensado <= 15.0) nivelPM25 = 0;
  else if (pm25_compensado <= 25.0) nivelPM25 = 1;
  else if (pm25_compensado <= 79.0) nivelPM25 = 2;
  else if (pm25_compensado <= 130.0) nivelPM25 = 3;
  else nivelPM25 = 4;

  // 6. Clasificación CO (NOM-172)
  int nivelCO = 0;
  if (ppmCO <= 5.0) nivelCO = 0;
  else if (ppmCO <= 9.0) nivelCO = 1;
  else if (ppmCO <= 12.0) nivelCO = 2;
  else if (ppmCO <= 16.0) nivelCO = 3;
  else nivelCO = 4;

  // 7. Contaminante Dominante y Semáforo LED de 5 Estados
  int nivelDominante = max(nivelPM25, nivelCO);
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
      estadoCalidad = "EXT. MALA"; // Reducido para ajustarse a 16 chars
      break;
  }

  // 8. Payload JSON y Envío por MQTT
  String tempStr = isnan(temperatura) ? "0.0" : String(temperatura, 1);
  String humStr  = isnan(humedad)     ? "0.0" : String(humedad, 1);

  String payload = "{\"pm25\":" + String(pm25_compensado, 1) +
                   ",\"co\":" + String(ppmCO, 2) +
                   ",\"temp\":" + tempStr +
                   ",\"hum\":" + humStr +
                   ",\"estado\":\"" + estadoCalidad + "\"}";

  client.publish("colectivo/aire/nodo1", payload.c_str());

  // 9. Mostrar datos en el LCD 1602 de forma limpia (16 caracteres exactos por línea)
  String linea1 = "T:" + tempStr + "C H:" + humStr + "%";
  while (linea1.length() < 16) linea1 += " ";
  lcd.setCursor(0, 0);
  lcd.print(linea1);

  // Exactamente como en la foto de prueba: "P:0 C:0.4 BUENA" (15 caracteres, cabe perfecto)
  String linea2 = "P:" + String((int)pm25_compensado) + " C:" + String(ppmCO, 1) + " " + estadoCalidad;
  while (linea2.length() < 16) linea2 += " ";
  lcd.setCursor(0, 1);
  lcd.print(linea2);

  // Depuración Serial
  Serial.println("\n------------------------------------------------");
  Serial.printf("Temperatura: %s °C | Humedad: %s %%\n", tempStr.c_str(), humStr.c_str());
  Serial.printf("Gas CO: %.2f PPM | Polvo PM2.5: %.1f ug/m3\n", ppmCO, pm25_compensado);
  Serial.printf("Nivel Dominante: %d | Estado: [%s]\n", nivelDominante, estadoCalidad.c_str());
  Serial.print("JSON Enviado: ");
  Serial.println(payload);
  Serial.println("------------------------------------------------");

  delay(2000);
}