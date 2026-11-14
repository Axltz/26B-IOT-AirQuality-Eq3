# 🍃 Sistema IoT de Monitoreo Ambiental Comunitario (CUCEI - UdeG)

> **Materia:** Internet de las Cosas – 26B  
> **Equipo 3 - Agencia:** Sociedad Civil / Colectivo  
> **Integrantes:**  
> - **Líder de Proyecto:** Axel Guillermo Martínez Martínez (220450053)  
> - Camila Suárez Cruz (223992426)  
> - Ángel Miguel Villalvazo Vázquez (220653671)  
> - Víctor Abraham Ibarra Orozco (218026295)  
> - Gustavo Alejandro Bonilla Delgado (217225359)  
> 
> **Profesora:** MC. Nayeli Areli Pérez Padilla  

---

## 📌 Descripción del Proyecto

Prototipo IoT de bajo costo y alta precisión para la medición en tiempo real de la calidad del aire y confort microclimático en entornos escolares y comunitarios de la Zona Metropolitana de Guadalajara. El sistema procesa contaminantes atmosféricos normados, calcula el nivel de riesgo conforme a la **NOM-172-SEMARNAT-2023** (Índice AIRE Y SALUD), muestra el alertamiento en hardware físico local y transmite la telemetría a una aplicación móvil vía **MQTT**.

---

## 🏗️ Arquitectura del Sistema (Modelo de 3 Capas)

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        1. CAPA DE PERCEPCIÓN                           │
│  • Microcontrolador: ESP32 DevKit (30 pines)                           │
│  • PM2.5 / Partículas: Plantower PMS5003 (Láser óptico vía UART2)      │
│  • Monóxido de Carbono: MQ-7 (Sensor electroquímico vía ADC G34)       │
│  • Microclima: DHT22 (Temperatura y Humedad vía GPIO 4)                 │
│  • Salidas Físicas: Semáforo LED 3 colores (G12, G14, G27) + LCD 1602  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼ [Publicación JSON cada 2s vía TCP / Wi-Fi]
┌────────────────────────────────────────────────────────────────────────┐
│                    2. CAPA DE RED Y TRANSPORTE                         │
│  • Enlace: Wi-Fi 802.11 b/g/n (Configuración con WiFiManager)          │
│  • Transporte: TCP (Puerto 1883 para ESP32, Puerto 8884 WebSockets)    │
│  • Protocolo de Aplicación: MQTT (Broker broker.hivemq.com)            │
│  • Tópico de Difusión: "colectivo/aire/nodo1"                          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼ [Suscripción en Tiempo Real]
┌────────────────────────────────────────────────────────────────────────┐
│                       3. CAPA DE APLICACIÓN                            │
│  • App Móvil Multiplataforma: React Native + Expo Router + TypeScript  │
│  • Cliente MQTT: Suscripción por WebSockets (telemetría en vivo)       │
│  • Semáforo Normativo: 5 Niveles NOM-172 con fondo dinámico adaptativo │
│  • Tendencias y Gráficas: Historial de últimas horas en SVG            │
│  • Grupos Vulnerables: Perfiles para Niños, Adultos Mayores, Asma, etc.│
│  • Panel de Administración: Diagnóstico de capas y gestión de nodos    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📐 Asignación de Pines y Hardware (ESP32)

| Componente | Pin ESP32 | Tipo de Interfaz | Función |
| :--- | :---: | :---: | :--- |
| **PMS5003 (TX)** | **GPIO 17 (RX2)** | UART Serial (9600 baud) | Lectura de masa de partículas PM2.5 |
| **PMS5003 (RX)** | **GPIO 16 (TX2)** | UART Serial (9600 baud) | Control y comandos del sensor |
| **MQ-7 (A0)** | **GPIO 34** | Analógica (ADC1) | Concentración de gas CO en PPM |
| **DHT22 (DATA)** | **GPIO 4** | Digital (Single-bus) | Temperatura (°C) y Humedad Relativa (%) |
| **LED Verde** | **GPIO 12** | Digital Output | Nivel Buena (Calidad óptima) |
| **LED Amarillo** | **GPIO 14** | Digital Output | Nivel Aceptable / Alerta moderada |
| **LED Rojo** | **GPIO 27** | Digital Output | Nivel Mala / Muy Mala / Extrema (Parpadeo) |
| **LCD 1602 I2C** | **GPIO 21 (SDA) / 22 (SCL)** | I2C (Dir 0x27) | Despliegue en vivo: `T:25C H:48%` y `P:0 C:0.4 BUENA` |

---

## 📊 Norma Oficial Mexicana: NOM-172-SEMARNAT-2023

El sistema clasifica la calidad del aire aplicando el principio del contaminante dominante entre **PM2.5** y **CO**:

| Nivel de Calidad | PM2.5 ($\mu g/m^3$) | CO ($PPM$) | Semáforo LED | Color de Fondo en App |
| :--- | :---: | :---: | :---: | :---: |
| **Buena** | $0.0 - 15.0$ | $0.0 - 5.0$ | Verde Fijo | Verde Suave (`#E7F1E5`) |
| **Aceptable** | $15.1 - 25.0$ | $5.1 - 9.0$ | Amarillo Fijo | Amarillo Suave (`#FBF3DC`) |
| **Mala** | $25.1 - 79.0$ | $9.1 - 12.0$ | Amarillo + Rojo | Naranja Suave (`#FDEEDF`) |
| **Muy Mala** | $79.1 - 130.0$ | $12.1 - 16.0$ | Rojo Fijo | Rojo Suave (`#FDE5DE`) |
| **Extremadamente Mala** | $> 130.0$ | $> 16.0$ | Rojo Parpadeante | Morado Suave (`#F5E6F4`) |

> **Compensación Higroscópica:** Conforme a la literatura técnica, si la humedad relativa supera el $70\%$, el ESP32 aplica un factor correctivo de $0.85$ sobre el sensor óptico láser para evitar lecturas infladas por vapor de agua condensado.

---

## 🛡️ Grupos Vulnerables (Población Sensible)

La aplicación integra perfiles normativos para proteger a los sectores más expuestos a daños pulmonares y cardiovasculares:
- **Niñas y Niños (< 12 años):** Menor masa corporal y vías en desarrollo; alertas tempranas para cancelar o reprogramar actividades escolares al aire libre.
- **Adultos Mayores (60+ años):** Reducción de la reserva cardiorrespiratoria ante picos de PM2.5.
- **Personas con Asma, EPOC o Cardiopatías:** Sensibilidad crítica ante incrementos agudos de partículas y gas CO.
- **Personas Gestantes (Embarazo):** Protección materno-fetal contra hipoxia y toxicidad por monóxido de carbono.

---

## 🔒 Panel de Administración y Diagnóstico de Red

Para evitar manipulaciones de usuarios comunes y garantizar un despliegue seguro en escuelas y colectivos:
- **Acceso Exclusivo:** El panel está protegido por credenciales de administrador (cuenta root: `axelmtz9880@gmail.com`).
- **Diagnóstico Integral de las 3 Capas:** Muestra en tiempo real el estado de salud del hardware ESP32 (sensores), el enlace con el Broker MQTT (HiveMQ) y el motor de alertas de la app.
- **Gestión de Nodos y Estaciones:** Solo los administradores pueden dar de alta nuevas estaciones de medición comunitarias o retirar nodos defectuosos.
- **Gestión de Roles:** Permite registrar nuevos directores de escuela o coordinadores de colectivo como administradores autorizados.

---

## 📁 Estructura del Repositorio

```text
26B-IOT-AirQuality-Eq3/
├── .gitignore               # Exclusión de binarios, dependencias y cachés
├── LICENSE                  # Licencia MIT
├── README.md                # Documentación oficial del proyecto
├── firmware/                # Código fuente para microcontroladores
│   └── MiEntorno_ESP32/
│       └── MiEntorno_ESP32.ino   # Firmware Arduino C++ con MQTT y LCD 1602
├── app/                     # Aplicación móvil React Native (Expo)
│   ├── assets/              # Iconos y recursos gráficos
│   ├── src/
│   │   ├── app/             # Rutas y vistas principales (Expo Router)
│   │   ├── componentes/     # Componentes visuales (Semáforo, Gráficas, Panel Admin)
│   │   ├── estado/          # Gestores de estado (Monitor ambiental y Admin)
│   │   ├── logica/          # Algoritmos NOM-172, confort, alertas y grupos
│   │   ├── modelos/         # Interfaces y modelos de TypeScript
│   │   └── servicios/       # Cliente MQTT WebSockets y persistencia
│   ├── pruebas/             # Suite de pruebas unitarias automáticas
│   └── herramientas/        # Simulador de nodo ESP32 para pruebas de escritorio
└── docs/                    # Evidencias académicas y documentación
    ├── app/capturas/        # Screenshots de la interfaz móvil
    ├── hardware/evidencias/ # Diagrama esquemático y fotos del circuito
    └── sprints/             # Reportes técnicos oficiales (Sprints 1, 2 y 3)
```

---

## 🚀 Guía de Puesta en Marcha

### 1. Carga del Firmware (ESP32)
1. Abrir `firmware/MiEntorno_ESP32/MiEntorno_ESP32.ino` en **Arduino IDE**.
2. Instalar las siguientes librerías desde el Gestor de Bibliotecas:
   - `WiFiManager` (por tzapu)
   - `PubSubClient` (por Nick O'Leary)
   - `DHT sensor library` (por Adafruit)
   - `LiquidCrystal I2C` (por Frank de Brabander)
3. Seleccionar la placa **ESP32 Dev Module** y el puerto COM.
4. Compilar y subir el programa.
5. Si no hay red guardada, conectarse con un celular a la red Wi-Fi `ESP32_Aire_Config` para ingresar el SSID y contraseña del módem local.

### 2. Ejecución de la Aplicación Móvil
```bash
# Entrar a la carpeta de la aplicación
cd app

# Instalar dependencias
npm install

# Correr suite de pruebas unitarias (11 tests automáticos)
npm test

# Verificar tipos sin errores
npm run typecheck

# Iniciar el entorno de desarrollo Expo
npm start
```
- Presiona `w` para abrir en navegador web.
- O escanea el código QR con **Expo Go** en tu dispositivo físico Android/iOS (asegúrate de que el celular esté en la misma red local que la computadora).

> [!NOTE]
> **¿Por qué Expo Go solicita inicio de sesión en móviles?**  
> A partir de Expo SDK 50+, Expo implementó una política de seguridad estricta para sincronización local. Si en tu teléfono tienes la app **Expo Go** iniciada con una cuenta (por ejemplo `tu_usuario`), Expo CLI en tu computadora requiere que ejecutes `npx expo login` con esa misma cuenta para permitir el túnel de desarrollo. De forma alternativa, puedes cerrar sesión en la app Expo Go en tu teléfono para abrir proyectos locales en modo anónimo sin requerir login en la terminal.
