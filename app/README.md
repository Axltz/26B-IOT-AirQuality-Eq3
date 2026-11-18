# AURA-172 · Aplicación (React Native + Expo)

Cliente web/móvil de **AURA-172 (Alerta Urbana de Riesgo Ambiental)**. Consume por MQTT/WebSockets la telemetría de los nodos ESP32, clasifica el riesgo con la **NOM-172-SEMARNAT-2023** y traduce el dato técnico en colores, mensajes y recomendaciones.

## Requisitos

- Node.js 22.13 o superior (Expo SDK 58).
- Dependencias: `npm install`.

## Comandos

```bash
npm start          # Expo (offline)
npm run web        # versión web
npm test           # pruebas de la lógica
npm run typecheck  # verificación de tipos
npm run iniciar-sesion  # iniciar sesión en Expo (si tu cuenta lo requiere)
```

## Cuenta de Expo del equipo

El proyecto vive en la organización de Expo **`amiguelv05s-team`** (`owner` y
`extra.eas.projectId` en `app.json`). Ambos valores son los mismos para todo el
equipo: **no los cambies ni corras `eas init`**.

1. Crea tu cuenta gratis en [expo.dev](https://expo.dev) y pide que te agreguen
   como miembro de la organización (expo.dev → organización → *Members*).
2. Inicia sesión en tu computadora: `npm run iniciar-sesion`.
3. Comprueba el acceso: `node herramientas/configurar-cuenta.mjs` debe decir
   *"tiene acceso al proyecto @amiguelv05s-team/mi-entorno"*.
4. En el iPhone, inicia sesión en Expo Go con tu cuenta para abrir el proyecto.

Para generar el APK con EAS Build:

```bash
npm run build:android
```

## Flujo de datos

1. El PMS5003 mide PM1, PM2.5 y PM10 (µg/m³); el firmware publica esas tres fracciones cada 2 segundos en `colectivo/aire/<NODO_ID>` usando `broker.hivemq.com`.
2. La app se suscribe por WebSockets (puerto 8884) y actualiza la pantalla en vivo.
3. El payload incluye `pm1`, `pm25`, `pm10`, `co`, `temp`, `hum`, `nivel_pm25`, `nivel_pm10`, `nivel_co`, `nivel_general`, `dominante` y `estado`.
4. El historial se mantiene en memoria de sesión (colo FIFO de 30 muestras) para no saturar el almacenamiento del dispositivo.
5. Si no hay telemetría, la app muestra **SIN SEÑAL**: nunca asume un estado verde falso.

## Pantallas principales

- **Resumen**: estado de riesgo, contaminante dominante, parámetros y tendencia reciente.
- **Ajustes**: umbrales de alerta, grupos vulnerables y notificaciones.
- **Panel de Administración**: alta, edición, activación y baja de nodos (nombre, tópico, broker, zona y coordenadas).

## Estructura

```text
src/app/          pantallas (Expo Router)
src/componentes/  encabezado, resumen, gráfica, hojas y panel admin
src/estado/       monitor ambiental y sesión de administración
src/logica/       NOM-172, confort, alertas y grupos vulnerables
src/modelos/      lecturas, ajustes y estaciones
src/servicios/    cliente MQTT, almacenamiento y notificaciones
pruebas/          suite de pruebas de la lógica
herramientas/     configuración de cuenta e inicio de sesión de Expo
```

El firmware correspondiente está en `firmware/MiEntorno_ESP32/MiEntorno_ESP32.ino`. La guía de demos con nodos reales está en `docs/demos/GUIA_DEMOS.md`.
