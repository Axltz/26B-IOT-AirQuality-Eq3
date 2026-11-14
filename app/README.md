# Mi Entorno (React Native + Expo)

App móvil que muestra la **temperatura, humedad y calidad del aire** que mide
un **ESP32**, guarda el historial de las últimas horas y manda una
**notificación** cuando la calidad del aire es mala. Hecha a partir de las
vistas de Figma (`app iot1-4.jpeg`).

## Qué hace

- **Resumen**: temperatura actual, sensación térmica, máxima y mínima del día y
  tarjetas de temperatura / humedad / aire (tócalas para cambiar la gráfica).
- **Partículas y gases** (tarjeta *Aire*): PM2.5 con su barra, PM10, CO2, CO,
  COV y NO2.
- **Últimas horas**: promedio por hora de las últimas 5 horas + *Ahora*. Toca o
  desliza sobre la gráfica para ver cada valor.
- **Alertas**: cuando la calidad del aire llega al umbral de la NOM-172 (por
  defecto *Mala*) llega la
  notificación *"MALA CALIDAD DEL AIRE"* y aparece la pestaña *Notificación*.
  Cuando el aire mejora llega otra.
- **Simular alerta de aire**: durante 60 s la app ve PM2.5 = 68 µg/m³.
- **Varios ESP32**: toca *Casa ▾* para cambiar de dispositivo, agregar uno o
  entrar a *Ajustes* (umbral, intervalo, push, borrar historial).
- **Modo demostración**: sin ESP32 la app funciona con datos simulados.

## Requisitos

- **Node.js 22.13 o más nuevo** (Expo SDK 58 no arranca con Node 20).
  Esta PC usa **nvm** y ya tiene activo Node 26.13 (LTS). Para revisarlo:

  ```bash
  nvm list
  ```

  Si algún otro proyecto necesitara el Node anterior, `nvm use 20.18.2`, y
  para volver a este, `nvm use 26.13.0`. En otra computadora sin nvm basta con
  instalar la versión LTS de <https://nodejs.org>.
- Dependencias del proyecto: `npm install` (ya están instaladas).

## Cómo abrirla

Doble clic en **`Iniciar Mi Entorno.bat`**.

**La primera vez en cada computadora** la ventana instala lo que necesita
(puede tardar hasta 10 minutos) y luego te guía paso a paso:

1. Crear tu cuenta gratis de Expo, si no tienes (abre la página).
2. Iniciar sesión en el navegador. La sesión queda guardada en esa
   computadora.
3. Registrar el proyecto en tu cuenta, solo, sin preguntar (Expo Go en
   iPhone solo abre proyectos de tu propia cuenta).

Si usas Android y no quieres cuenta, escribe `omitir` en el paso 2.
**Las siguientes veces** se salta todo eso y va directo al código QR, que
muestra arriba con qué cuenta estás. En esa ventana:

- **En el teléfono**: instala **Expo Go** (App Store o Play Store), conecta el
  teléfono al mismo Wi-Fi que la PC y escanea el código QR (con la cámara en
  iPhone, desde Expo Go en Android).
- **En la computadora**: presiona `w` y se abre en el navegador. Para verla
  del tamaño de un teléfono: F12 → Ctrl+Shift+M.
- **Para cerrarla**: cierra la ventana.

Es lo mismo que escribir `npx expo start` en una terminal dentro de esta
carpeta. Si PowerShell dice que "la ejecución de scripts está deshabilitada",
escribe `npx.cmd` / `npm.cmd` en lugar de `npx` / `npm`, o usa `cmd`.

El código QR tarda un poco en aparecer; espera a que salga antes de presionar
teclas.

Si el teléfono no la abre:

- **iPhone: "You need to be signed in to Expo Go and Expo CLI"**: en iPhone,
  Expo Go pide iniciar sesión con la **misma cuenta gratuita de Expo** en la
  computadora y en el teléfono (en Android no hace falta).
  1. En la computadora: cierra la ventana y abre otra vez
     `Iniciar Mi Entorno.bat`; si no hay sesión, te guía (o usa
     `npm run iniciar-sesion`). En Windows no uses `npx expo login` directo:
     abre una dirección cortada y falla sin guardar la sesión.
  2. En Expo Go: icono de cuenta arriba a la derecha → inicia sesión con la
     **misma** cuenta que muestra la ventana (`CUENTA DE EXPO: ...`).
  3. En el error, toca **Try Again**.

  El proyecto queda registrado en la cuenta de cada computadora (`owner` y
  `extra.eas.projectId` en `app.json` cambian en cada una; es normal).
- **"No se encontraron datos utilizables"**: se escaneó con la cámara normal.
  En Android abre **Expo Go** y toca *Scan QR code*; en iPhone primero
  instala Expo Go y luego escanea con la Cámara. También puedes tocar
  *Enter URL manually* en Expo Go y escribir la dirección `exp://...` que
  aparece debajo del QR.
- **Se queda cargando o no se puede conectar**: Windows está bloqueando al
  teléfono.
  1. Pon tu Wi-Fi como red **privada**: icono de Wi-Fi en la barra de tareas
     → *Propiedades* → *Perfil de red* → **Privado**.
  2. Cierra la ventana negra y abre otra vez `Iniciar Mi Entorno.bat`. Cuando
     Windows pregunte por Node.js, marca *Redes privadas* y dale
     **Permitir acceso**.
  3. Si no aparece esa pregunta: Panel de control → *Firewall de Windows
     Defender* → *Permitir una aplicación o una característica...* →
     *Cambiar la configuración* → *Permitir otra aplicación...* → busca
     `node.exe` (normalmente en `C:\Program Files\nodejs`, o en
     `C:\nvm4w\nodejs` si usas nvm) → *Agregar* y marca **Privada**.
  4. El teléfono no debe estar en la red de invitados del módem.

En Expo Go funcionan todas las pantallas, la conexión con el ESP32 y las
**notificaciones locales** (las lanza la app mientras está abierta o en
segundo plano).

## Compartirla con tu equipo

### Opción 1: cada quien en su laptop (recomendada)

1. Copia la carpeta del proyecto **sin** `node_modules`, `.expo` ni `.git`
   (pesa menos de 1 MB; cada quien instala lo demás), comprímela y mándala
   (WhatsApp, Drive, correo...).
2. Cada compañero instala **Node.js LTS** de <https://nodejs.org>,
   descomprime la carpeta y abre **`Iniciar Mi Entorno.bat`**.
3. La ventana le dice qué hacer: crear su cuenta de Expo, iniciar sesión y
   (sola) registrar el proyecto en su cuenta. Después escanea el QR con su
   teléfono, con Expo Go iniciado en **su** cuenta.

Cada laptop queda con su propia cuenta guardada; no se comparten
contraseñas. Si ya escribiste la contraseña de tu Wi-Fi en el programa del
ESP32, bórrala de la copia antes de mandarla.

### Opción 2: un APK para Android (sin computadora)

La app queda instalada como cualquier otra, sin Expo Go ni PC encendida.

1. Abre una vez `Iniciar Mi Entorno.bat` para tener sesión de Expo y el
   proyecto registrado en tu cuenta.
2. En una terminal dentro de esta carpeta:

   ```bash
   npx eas-cli@latest build --platform android --profile preview
   ```

   La primera vez pregunta si crea la llave para firmar la app: responde
   que sí. Se compila en la nube (gratis, tarda unos
   minutos) y al final te da un enlace y un QR para descargar el APK.
3. Manda ese enlace. En el teléfono, al instalar, Android pide permitir
   "instalar apps de origen desconocido".

En iPhone no se puede instalar así sin una cuenta de Apple Developer (de
pago); quien tenga iPhone puede usar la opción 1 con Expo Go.

## Notificaciones con la app cerrada (push)

El programa incluido del ESP32 funciona **solo en la red local** y no manda
avisos por internet: la app avisa mientras está abierta o en segundo plano.
Lo siguiente aplica solo si algún día usan un ESP32 que mande push por
internet a través del servicio de Expo (como el ESP32 simulado,
`npm run esp32-simulado`):

1. Cuenta de Expo y proyecto registrado: `Iniciar Mi Entorno.bat` ya lo hace
   la primera vez (agrega el `projectId` a `app.json`).
2. **Android** (Expo Go en Android ya no recibe push):
   - Crea un proyecto en Firebase (gratis), registra la app Android con el
     paquete `com.mientorno.app`, descarga `google-services.json` a esta
     carpeta y agrega en `app.json` → `expo.android`:
     `"googleServicesFile": "./google-services.json"`.
   - Sube la clave de FCM V1 a Expo: <https://docs.expo.dev/push-notifications/fcm-credentials/>
   - Compila el APK como en *Compartirla con tu equipo → Opción 2* e
     instálalo.

3. **iPhone**: las push en una app compilada requieren una cuenta de Apple
   Developer (de pago).
4. En la app: *Casa ▾* → *Ajustes* → **Avisos con la app cerrada** →
   *Activar en …*. El teléfono queda registrado en el ESP32.
5. El ESP32 necesita salida a internet (tu Wi-Fi normal) para llegar a
   `exp.host`.

Mientras el push esté activo, la app no repite el aviso local para no
duplicarlo.

## Conectar el ESP32

El programa `esp32/MiEntorno_ESP32/MiEntorno_ESP32.ino` es para la placa
**ESP32-WROOM-32 DevKit** con DHT22, MQ-7, PMS5003 y semáforo de LEDs
(clasificación NOM-172-SEMARNAT-2023). Funciona solo en la red local, sin
internet.

| Componente        | Pin del ESP32                                        |
|-------------------|------------------------------------------------------|
| DHT22 (datos)     | G4                                                   |
| MQ-7 (AO)         | G34 (si el módulo va a 5V, usa un divisor: AO puede pasar de 3.3V) |
| PMS5003 **TX**    | **G16**                                              |
| PMS5003 **RX**    | **G17**                                              |
| PMS5003 VCC / GND | **5V** / GND (con 3.3V el ventilador no gira bien)   |
| PMS5003 SET/RESET | sin conectar                                         |
| LED verde / amarillo / rojo | G12 / G14 / G27                            |

1. En Arduino IDE instala (Administrar bibliotecas): **WiFiManager** (de
   tzapu), **DHT sensor library** (de Adafruit) y **Adafruit Unified
   Sensor**. Placa: **ESP32 Dev Module**.
2. Sube el programa y abre el Monitor Serie (115200).
3. **Wi-Fi (solo la primera vez):** el ESP32 crea la red
   **MiEntorno-Config** (clave `mientorno`). Conéctate con el teléfono, se
   abre una página (si no, entra a `http://192.168.4.1`), elige tu Wi-Fi,
   escribe su contraseña y guarda. Queda guardada en el ESP32.
4. El Monitor Serie muestra `En la app escribe esta IP: ...`.
5. En la app: *Casa ▾* → **Agregar ESP32** → nombre + IP → *Probar conexión*
   → *Guardar*.

- **Cambiar de red:** mantén el botón **BOOT** 3 s (vuelve a abrir
  MiEntorno-Config). 10 s borra la red guardada y reinicia.
- **Qué red usar:** una red local normal (módem de casa o el **hotspot de un
  teléfono**). El ESP32, el teléfono y la laptop que corre la app deben estar
  en la misma red. Las redes públicas con página de inicio de sesión o de
  invitados no sirven: no dejan que el teléfono vea al ESP32.
- Aunque no haya Wi-Fi, el ESP32 sigue midiendo y el semáforo funciona.
- En tu módem puedes reservar la IP del ESP32 (DHCP estático) para que no
  cambie. `mientorno.local` funciona en iPhone y en la PC, pero muchos
  Android no lo resuelven: usa la IP.
- La app califica el aire igual que el semáforo (NOM-172) y, si el ESP32 manda
  su `nivel_nom172`, usa ese, así que siempre coinciden.

### Lo que la app espera del ESP32

`GET http://<IP>/api/lecturas` → JSON. Todos los campos son opcionales.

```json
{ "temperatura": 24.1, "humedad": 58, "pm25": 8.4, "pm10": 15, "co2": 612, "co": 0.3, "cov": 0.18, "no2": 14 }
```

| Campo         | Unidad  | También acepta                       |
|---------------|---------|--------------------------------------|
| `temperatura` | °C      | `temperature`, `temp`                |
| `humedad`     | %       | `humidity`, `hum`, `rh`              |
| `pm25`        | µg/m³   | `pm2_5`, `pm2.5`                     |
| `pm10`        | µg/m³   |                                      |
| `co2`         | ppm     | `eco2`                               |
| `co`          | ppm     |                                      |
| `cov`         | ppm     | `voc`, `tvoc` (o `tvoc_ppb` en ppb)  |
| `no2`         | ppb     |                                      |
| `nivel_nom172`| 0–4     | nivel del semáforo (0 Buena … 4 Extremadamente mala) |

El programa incluido además manda `pm1`, `nivel_nom172`, `estado_nom172`,
`pms5003` (`ok`, `calentando` o `sin datos`) y `uptime_s`; la app los ignora.

Rutas opcionales:

- `GET /api/historial` → `{ "muestras": [ { "hace_s": 3600, "temperatura": 23.4, ... } ] }`
  para recuperar lo medido mientras la app estaba cerrada (el programa
  incluido la tiene).
- `GET /simular/malo` y `GET /simular/normal` para probar la alerta de punta
  a punta (el programa incluido la tiene).
- `POST /api/push` → `{ "token": "ExponentPushToken[...]", "umbral": 2, "avisarMejora": true }`
  y `POST /api/push/borrar` → `{ "token": "..." }`: solo para un ESP32 que
  mande push por internet (el simulado las tiene; el programa incluido no).

### Probar sin hardware

```bash
npm run esp32-simulado
```

Levanta un ESP32 falso en el puerto 8090 con las mismas rutas. Agrégalo en la
app con `localhost:8090` (navegador) o `<IP de tu PC>:8090` (teléfono). Abre
`http://localhost:8090/simular/malo` para ver la alerta y
`http://localhost:8090/simular/normal` para volver.

## Cómo se calcula la calidad del aire

Igual que el semáforo del ESP32: **NOM-172-SEMARNAT-2023** (Índice AIRE Y
SALUD), con los mismos cortes que el programa del ESP32.

| Nivel               | PM2.5 (µg/m³) | CO (ppm) | Riesgo              |
|---------------------|---------------|----------|---------------------|
| Buena               | ≤ 15          | ≤ 5      | Bajo                |
| Aceptable           | ≤ 25          | ≤ 9      | Moderado            |
| Mala                | ≤ 79          | ≤ 12     | Alto                |
| Muy mala            | ≤ 130         | ≤ 16     | Muy alto            |
| Extremadamente mala | > 130         | > 16     | Extremadamente alto |

- Se califican PM2.5 y CO y **manda el peor** (regla de dominancia). PM10,
  CO2, COV y NO2 se muestran pero no cambian el nivel.
- Si el ESP32 manda `nivel_nom172` (el programa incluido lo hace), la app usa
  ese nivel para que coincida exactamente con el semáforo.
- La gráfica de *Aire* muestra PM2.5 en µg/m³.
- Alertas: avisan a partir del nivel elegido en *Ajustes* (Aceptable, Mala o
  Muy mala). Terminan cuando el aire baja dos niveles o se queda un minuto por
  debajo del umbral; una alerta nueva dentro de los 15 min siguientes no
  vuelve a sonar; si sube de nivel, sí.

## Estructura

`Iniciar Mi Entorno.bat` abre la app (y la primera vez prepara la cuenta de
Expo con `herramientas/configurar-cuenta.mjs`) y `eas.json` tiene el perfil
`preview` que compila el APK.

```
src/app/                    pantallas (Expo Router): _layout, index, ajustes
src/componentes/            encabezado, resumen, gráfica, alerta, hojas
src/estado/monitor.ts       consulta al ESP32, historial, alertas, push
src/logica/                 NOM-172, sensación térmica, gráfica, reglas de alerta
src/modelos/                lectura, dispositivos y ajustes
src/servicios/              cliente del ESP32, simulador, notificaciones
esp32/MiEntorno_ESP32/      programa para el ESP32 (Arduino)
herramientas/               ESP32 simulado, cuenta e inicio de sesión de Expo
pruebas/                    pruebas de la lógica
```

```bash
npm test
```

```bash
npm run typecheck
```
