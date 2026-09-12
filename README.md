# 🍃 Sistema IoT de Monitoreo Ambiental Comunitario (CUCEI - UdeG)

> **Sprint 1: Diseño Conceptual e Infraestructura Base**  
> Prototipo de bajo costo para el monitoreo en tiempo real de la calidad del aire y variables ambientales en entornos escolares y comunitarios de la Zona Metropolitana de Guadalajara.

---

##  Descripción del Proyecto

Este sistema IoT busca brindar transparencia y accesibilidad a los datos de calidad del aire para la sociedad civil, líderes comunitarios y centros educativos. A través de una arquitectura de tres capas y un semáforo visual intuitivo, permite a la población tomar decisiones preventivas ante eventos de contaminación sin depender de lecturas técnicas complejas.

---

##  Arquitectura del Sistema (Modelo de 3 Capas)

El sistema se estructura bajo el modelo arquitectónico de Internet de las Cosas (IoT) integrando los 4 pilares del Internet del Todo (IdT):

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        1. CAPA DE PERCEPCIÓN                           │
│  • Microcontrolador: ESP32 NodeMCU                                     │
│  • Sensores: PMS5003 (PM2.5), MQ-7 (Gases/CO), DHT22 (Temp/Humedad)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼ [Envío de JSON cada 10-30s / Wi-Fi]
┌────────────────────────────────────────────────────────────────────────┐
│                          2. CAPA DE RED                                │
│  • Conectividad: Wi-Fi integrado en ESP32 con protocolo HTTP/MQTT      │
│  • Tolerancia a Fallas: Buffer local en memoria Flash (LittleFS)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼ [Procesamiento & Alertamiento]
┌────────────────────────────────────────────────────────────────────────┐
│                       3. CAPA DE APLICACIÓN                            │
│  • Interfaz Web/Móvil: Semáforo visual de 3 niveles (Verde/Amarillo/Rojo)│
│  • Alertas Push: Notificaciones prioritarias para escuelas/directivos  │
│  • Panel Admin: Calibración de umbrales normados (NOM-020-SSA1/SINAICA) │
└────────────────────────────────────────────────────────────────────────┘
