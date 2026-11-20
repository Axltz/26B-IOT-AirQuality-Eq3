# 🍃 AURA-172 (Alerta Urbana de Riesgo Ambiental)

> Monitoreo comunitario hiperlocal de la calidad del aire · CUCEI - UdeG  
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

Prototipo IoT de bajo costo que demuestra una **arquitectura de extremo a extremo** para la medición en tiempo real de la calidad del aire y el confort microclimático en entornos escolares y comunitarios de la Zona Metropolitana de Guadalajara. El flujo completo es: adquisición multi-parámetro → filtrado y clasificación normativa en el borde (Edge) → transporte ligero **MQTT** → traducción visual accesible en la app. El hardware del nodo es un demostrador intercambiable, no un instrumento certificado: el sistema **complementa** a la red oficial (SIMAJ) aportando resolución micro-local y lenguaje comprensible para cualquier persona.

---

## 🏗️ Arquitectura del Sistema (Modelo de 3 Capas)

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        1. CAPA DE PERCEPCIÓN                           │
│  • Microcontrolador: ESP32 DevKit (30 pines)                           │
│  • PM1 / PM2.5 / PM10: Plantower PMS5003 (Láser óptico vía UART2)      │
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
│  • Histórico: Supabase (HTTPS, 1 muestra por minuto por nodo)          │
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
| **PMS5003 (TX)** | **GPIO 17 (RX2)** | UART Serial (9600 baud) | Lectura de masa de partículas PM1, PM2.5 y PM10 |
| **PMS5003 (RX)** | **GPIO 16 (TX2)** | UART Serial (9600 baud) | Control y comandos del sensor |
| **MQ-7 (A0)** | **GPIO 34** | Analógica (ADC1) | Concentración de gas CO en PPM |
| **DHT22 (DATA)** | **GPIO 4** | Digital (Single-bus) | Temperatura (°C) y Humedad Relativa (%) |
| **LED Verde** | **GPIO 12** | Digital Output | Nivel Buena (Calidad óptima) |
| **LED Amarillo** | **GPIO 14** | Digital Output | Nivel Aceptable / Alerta moderada |
| **LED Rojo** | **GPIO 27** | Digital Output | Nivel Mala / Muy Mala / Extrema (Parpadeo) |
| **LCD 1602 I2C** | **GPIO 21 (SDA) / 22 (SCL)** | I2C (Dir 0x27) | Despliegue en vivo: `T:25C H:48%` y `P:0 C:0.4 BUENA` |

---

## 📊 Norma Oficial Mexicana: NOM-172-SEMARNAT-2023

El PMS5003 mide **PM1, PM2.5 y PM10**; la NOM-172 define cortes oficiales solo para PM2.5 y PM10. Junto con el CO, el firmware evalúa el principio del contaminante dominante entre **PM2.5, PM10 y CO**:

| Nivel de Calidad | PM2.5 ($\mu g/m^3$) | PM10 ($\mu g/m^3$) | CO ($PPM$) | Semáforo LED | Color de Fondo en App |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Buena** | $0.0 - 15.0$ | $0.0 - 50.0$ | $0.0 - 5.0$ | Verde Fijo | Verde Suave (`#E7F1E5`) |
| **Aceptable** | $15.1 - 33.0$ | $50.1 - 75.0$ | $5.1 - 9.0$ | Amarillo Fijo | Amarillo Suave (`#FBF3DC`) |
| **Mala** | $33.1 - 79.0$ | $75.1 - 155.0$ | $9.1 - 12.0$ | Amarillo + Rojo | Naranja Suave (`#FDEEDF`) |
| **Muy Mala** | $79.1 - 130.0$ | $155.1 - 235.0$ | $12.1 - 16.0$ | Rojo Fijo | Rojo Suave (`#FDE5DE`) |
| **Extremadamente Mala** | $> 130.0$ | $> 235.0$ | $> 16.0$ | Rojo Parpadeante | Morado Suave (`#F5E6F4`) |

> **PM1:** se mide y se muestra como variable complementaria; no participa en la clasificación normativa porque la NOM-172 no establece un corte para ese parámetro.

> **Compensación Higroscópica:** Conforme a la literatura técnica, si la humedad relativa supera el $70\%$, el ESP32 aplica un factor correctivo de $0.85$ sobre las tres fracciones de partículas para evitar lecturas infladas por vapor de agua condensado.

---

## 🛡️ Grupos Vulnerables (Población Sensible)

La aplicación integra perfiles normativos para proteger a los sectores más expuestos a daños pulmonares y cardiovasculares:
- **Niñas y Niños (< 12 años):** Menor masa corporal y vías en desarrollo; alertas tempranas para cancelar o reprogramar actividades escolares al aire libre.
- **Adultos Mayores (60+ años):** Reducción de la reserva cardiorrespiratoria ante picos de material particulado (PM2.5 y PM10).
- **Personas con Asma, EPOC o Cardiopatías:** Sensibilidad crítica ante incrementos agudos de partículas y gas CO.
- **Personas Gestantes (Embarazo):** Protección materno-fetal contra hipoxia y toxicidad por monóxido de carbono.

---

## 🔒 Panel de Administración y Diagnóstico de Red

Para evitar manipulaciones de usuarios comunes y garantizar un despliegue seguro en escuelas y colectivos:
- **Acceso Exclusivo:** Los usuarios comunes no ven el panel. Al final de **Ajustes** aparece «¿Eres administrador? Click aquí…», que pide correo y contraseña de administrador. Las contraseñas no se guardan: solo una sal y su hash (SHA-256 iterado). La del administrador principal se genera con `npm run hash-admin` (en `app/`) y se pega en `src/estado/admin.tsx`.
- **Diagnóstico Integral de las 3 Capas:** Muestra en tiempo real el estado de salud del hardware ESP32 (sensores), el enlace con el Broker MQTT (HiveMQ) y el motor de alertas de la app.
- **Gestión de Nodos y Estaciones:** Solo los administradores pueden dar de alta nuevas estaciones de medición comunitarias o retirar nodos defectuosos.
- **Gestión de Roles:** Permite registrar nuevos directores de escuela o coordinadores de colectivo como administradores autorizados.

---

## 📁 Estructura del Repositorio

```text
AURA-172/
├── .gitignore               # Exclusión de binarios, dependencias y documentos explicativos
├── LICENSE                  # Licencia MIT
├── README.md                # Documentación oficial del proyecto
├── firmware/                # Código fuente para microcontroladores
│   └── MiEntorno_ESP32/
│       ├── MiEntorno_ESP32.ino   # Firmware Arduino C++ con MQTT, LCD 1602 e histórico en Supabase
│       └── secretos.ejemplo.h    # Plantilla de credenciales de Supabase (copiar como secretos.h)
├── supabase/migrations/     # SQL de la tabla de histórico `lecturas`
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
│   └── herramientas/        # Configuración de cuenta e inicio de sesión de Expo
└── docs/                    # Evidencias académicas y documentación
    ├── app/capturas/        # Screenshots de la interfaz móvil
    ├── demos/               # Guía de demos con nodos reales
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
   - `HTTPClient` y `WiFiClientSecure` ya vienen con el soporte de placas ESP32; no se instalan aparte.
3. **Asignar un ID único a cada nodo.** En la línea `const char* NODO_ID = "nodo1";` cambia el valor por `nodo2`, `nodo3`, etc. antes de compilar cada ESP32. El tópico MQTT se forma automáticamente como `colectivo/aire/<NODO_ID>`.
4. **(Opcional) Histórico en la nube.** Copia `firmware/MiEntorno_ESP32/secretos.ejemplo.h` como `secretos.h` en la misma carpeta y pon la URL y la clave publicable de Supabase (ver la sección 2). `secretos.h` está en `.gitignore`. Sin ese archivo el nodo compila y funciona igual, solo sin guardar histórico.
5. Seleccionar la placa **ESP32 Dev Module** y el puerto COM.
6. Compilar y subir el programa.
7. Si no hay red guardada, conectarse con un celular a la red Wi-Fi `ESP32_Aire_Config` para ingresar el SSID y contraseña del módem local.

> **Nodos nuevos:** cada ESP32 debe tener un `NODO_ID` distinto y el mismo ID debe registrarse en el Panel de Administración de la app con su tópico `colectivo/aire/nodoX`. El broker por defecto es `broker.hivemq.com`.

### 2. Histórico en la nube (Supabase)

Cada ESP32 guarda **una lectura por minuto** directamente en Supabase por HTTPS; la app la consulta al abrirse para mostrar lo que pasó mientras estaba cerrada. No hace falta ninguna computadora encendida: basta con que el nodo tenga luz y Wi-Fi. El MQTT cada 2 s se mantiene para el modo en vivo.

1. En Supabase, abre **SQL Editor → New query**, pega el contenido de [`supabase/migrations/20261118200000_lecturas.sql`](supabase/migrations/20261118200000_lecturas.sql) y pulsa **Run**. Crea la tabla `lecturas`, activa RLS y deja que la clave publicable solo pueda **leer e insertar** (no editar ni borrar).
2. Copia la **Project URL** (**Connect**) y la **clave publicable** `sb_publishable_…` (**Settings → API Keys**). La clave secreta no se usa en ningún lado.
3. Firmware: crea `secretos.h` a partir de `secretos.ejemplo.h` (paso 4 de la sección 1).
4. App: copia `app/.env.example` como `app/.env.local` con los mismos valores y reinicia Expo. Para el APK, da de alta las variables en EAS (ver `app/README.md`).
5. Comprueba: en el Monitor Serial aparece `[SUPABASE] Lectura guardada en el histórico.` cada minuto y en **Table Editor → lecturas** aparecen filas con el tópico del nodo.

### 3. Ejecución de la Aplicación Móvil
```bash
# Entrar a la carpeta de la aplicación
cd app

# Instalar dependencias
npm install

# Correr suite de pruebas unitarias
npm test

# Verificar tipos sin errores
npm run typecheck

# Iniciar el entorno de desarrollo Expo
npm start
```
- Presiona `w` para abrir en navegador web.
- O escanea el código QR con **Expo Go** en tu dispositivo físico Android/iOS (asegúrate de que el celular esté en la misma red local que la computadora).

### 4. Demos con nodos reales

La demostración del sistema se hace con nodos ESP32 físicos. Cada placa se flashea con un `NODO_ID` distinto y publica en `colectivo/aire/<NODO_ID>` cada 2 segundos. Después, en la app entra a **Ajustes → «¿Eres administrador? Click aquí»**, inicia sesión, agrega el tópico de cada nodo y usa **Activar** para cambiar la estación visualizada.

La guía completa de demos está en [`docs/demos/GUIA_DEMOS.md`](docs/demos/GUIA_DEMOS.md).

### 5. Generación de APK Autónomo para Android (EAS Build)
Para instalar la aplicación de forma permanente en cualquier dispositivo Android sin necesidad de encender la computadora ni usar Expo Go:
```bash
cd app

# Opción A: Generar APK instalable directo (Perfil preview)
npx eas-cli build --platform android --profile preview

# Opción B: O utilizando el script de npm configurado
npm run build:android
```
Al finalizar la compilación en los servidores en la nube de Expo (EAS), la terminal proporcionará un código QR y un enlace directo para descargar el archivo `.apk` e instalarlo en el móvil.

> [!NOTE]
> **¿Por qué Expo Go solicita inicio de sesión en móviles?**  
> A partir de Expo SDK 50+, Expo implementó una política de seguridad estricta para sincronización local. Si en tu teléfono tienes la app **Expo Go** iniciada con una cuenta (por ejemplo `tu_usuario`), Expo CLI en tu computadora requiere que ejecutes `npx expo login` con esa misma cuenta para permitir el túnel de desarrollo. De forma alternativa, puedes cerrar sesión en la app Expo Go en tu teléfono para abrir proyectos locales en modo anónimo sin requerir login en la terminal.

> [!NOTE]
> **¿Por qué Expo Go solicita inicio de sesión en móviles?**  
> A partir de Expo SDK 50+, Expo implementó una política de seguridad estricta para sincronización local. Si en tu teléfono tienes la app **Expo Go** iniciada con una cuenta (por ejemplo `tu_usuario`), Expo CLI en tu computadora requiere que ejecutes `npx expo login` con esa misma cuenta para permitir el túnel de desarrollo. De forma alternativa, puedes cerrar sesión en la app Expo Go en tu teléfono para abrir proyectos locales en modo anónimo sin requerir login en la terminal.
