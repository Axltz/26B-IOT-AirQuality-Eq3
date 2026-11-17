import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super().showPage()
        super().save()

    def draw_header_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#718096"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 755, "AURA-172 · Sistema Comunitario de Calidad del Aire (NOM-172-SEMARNAT-2023)")
            self.drawRightString(558, 755, "CUCEI · Universidad de Guadalajara")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(54, 748, 558, 748)

        # Footer (all pages)
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 45, 558, 45)
        self.drawString(54, 32, "Equipo 3 · Internet de las Cosas (NRC V0748) · 3er Simposio SKILIKET 2026")
        page_str = f"Página {self._pageNumber} de {page_count}"
        self.drawRightString(558, 32, page_str)
        self.restoreState()

def construir_pdf(ruta_salida):
    doc = SimpleDocTemplate(
        ruta_salida,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    c_verde = colors.HexColor("#0F5132")
    c_verde_oscuro = colors.HexColor("#0A3622")
    c_azul = colors.HexColor("#1E3A8A")
    c_texto = colors.HexColor("#1E293B")
    
    titulo_principal = ParagraphStyle(
        'TituloPrincipal',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=c_verde_oscuro,
        spaceAfter=6,
        alignment=0
    )

    subtitulo_portada = ParagraphStyle(
        'SubtituloPortada',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#475569"),
        spaceAfter=15
    )

    h1_estilo = ParagraphStyle(
        'H1Custom',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=c_verde,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_estilo = ParagraphStyle(
        'H2Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=c_azul,
        spaceBefore=10,
        spaceAfter=6,
        keepWithNext=True
    )

    cuerpo = ParagraphStyle(
        'CuerpoCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=c_texto,
        spaceAfter=6
    )

    cuerpo_negrita = ParagraphStyle(
        'CuerpoNegrita',
        parent=cuerpo,
        fontName='Helvetica-Bold'
    )

    tecnica_header = ParagraphStyle(
        'TecnicaHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#1E3A8A")
    )

    tecnica_texto = ParagraphStyle(
        'TecnicaTexto',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.8,
        leading=12.5,
        textColor=colors.HexColor("#1E293B")
    )

    facil_header = ParagraphStyle(
        'FacilHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#14532D")
    )

    facil_texto = ParagraphStyle(
        'FacilTexto',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.8,
        leading=12.5,
        textColor=colors.HexColor("#14532D")
    )

    codigo_estilo = ParagraphStyle(
        'CodigoEstilo',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#0F172A")
    )

    def caja_dual(titulo_sec, txt_tecnico, txt_facil):
        tabla_data = [
            [
                Paragraph("<b>⚙️ EXPLICACIÓN TÉCNICA (Ingeniería e Implementación)</b>", tecnica_header),
            ],
            [
                Paragraph(txt_tecnico, tecnica_texto),
            ],
            [
                Paragraph("<b>💡 EXPLICACIÓN FÁCIL (Para Todo Público / Ciudadano)</b>", facil_header),
            ],
            [
                Paragraph(txt_facil, facil_texto),
            ]
        ]
        t = Table(tabla_data, colWidths=[504])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), colors.HexColor("#E0E7FF")),
            ('BACKGROUND', (0, 1), (0, 1), colors.HexColor("#F8FAFC")),
            ('BACKGROUND', (0, 2), (0, 2), colors.HexColor("#DCFCE7")),
            ('BACKGROUND', (0, 3), (0, 3), colors.HexColor("#F0FDF4")),
            ('BOX', (0, 0), (0, 1), 1, colors.HexColor("#93C5FD")),
            ('BOX', (0, 2), (0, 3), 1, colors.HexColor("#86EFAC")),
            ('PADDING', (0, 0), (0, -1), 6),
            ('TOPPADDING', (0, 0), (0, 0), 4),
            ('BOTTOMPADDING', (0, 0), (0, 0), 4),
            ('TOPPADDING', (0, 2), (0, 2), 4),
            ('BOTTOMPADDING', (0, 2), (0, 2), 4),
            ('BOTTOMPADDING', (0, 1), (0, 1), 8),
            ('BOTTOMPADDING', (0, 3), (0, 3), 8),
        ]))
        return t

    story = []

    # ═════════════════════════════════════════════════════════════════════════
    # PORTADA Y METADATOS INSTITUCIONALES
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("AURA-172", titulo_principal))
    story.append(Paragraph("<b>Alerta Urbana de Riesgo Ambiental</b> · Monitoreo Hiperlocal Comunitario", subtitulo_portada))
    
    meta_tabla = [
        [
            Paragraph("<b>Institución:</b> Centro Universitario de Ciencias Exactas e Ingenierías (CUCEI)", cuerpo),
            Paragraph("<b>Materia:</b> Internet de las Cosas (NRC V0748 · Sec D06)", cuerpo)
        ],
        [
            Paragraph("<b>Profesora:</b> Mtra. Nayeli Areli Pérez Padilla", cuerpo),
            Paragraph("<b>Evento:</b> 3er Simposio de Proyectos SKILIKET (Nov 2026)", cuerpo)
        ],
        [
            Paragraph("<b>Autores (Equipo 3):</b> Axel G. Martínez Martínez, Camila Suárez Cruz, Ángel M. Villalvazo Vázquez, Víctor A. Ibarra Orozco, Gustavo A. Bonilla Delgado", cuerpo),
            Paragraph("<b>Norma Base:</b> NOM-172-SEMARNAT-2023 (DOF 2024)", cuerpo)
        ]
    ]
    t_meta = Table(meta_tabla, colWidths=[252, 252])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 14))

    # ═════════════════════════════════════════════════════════════════════════
    # RESUMEN EJECUTIVO Y PROBLEMA
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("1. Problema Urbano y Justificación", h1_estilo))
    story.append(Paragraph(
        "En el Área Metropolitana de Guadalajara (AMG), la exposición a material particulado fino (PM2.5) y gases de combustión vehicular (CO) es un detonante crítico de afecciones respiratorias y cardíacas. Actualmente, la red oficial de monitoreo gubernamental (SIMAJ) cuenta con tan solo 13 estaciones para una metrópoli de más de 5 millones de habitantes. Esto crea enormes <i>'zonas ciegas'</i> en escuelas, colonias periféricas e intersecciones viales de alta carga.",
        cuerpo
    ))
    
    story.append(caja_dual(
        "Problema y Solución",
        "<b>Técnica:</b> La dispersión espacial de microcontaminantes exhibe microclimas urbanos heterogéneos con gradientes de concentración que varían drásticamente en radios menores a 800 metros. Las estaciones macroambientales oficiales filtran estas variaciones locales al promediar cuencas atmosféricas completas. AURA-172 despliega nodos IoT de sensado óptico y electroquímico calibrados con computación de borde (Edge Computing) que calculan el Índice de Aire y Salud según la fórmula de corte de la NOM-172-SEMARNAT-2023 en ciclos de 2 segundos.",
        "<b>Fácil:</b> Imagina que el clima oficial te dice que en toda la ciudad hace calor, pero en tu calle justo está cayendo una tormenta. Con la contaminación pasa igual: una avenida con camiones o una fogata vecinal puede hacer que tu escuela o parque respire veneno aunque la estación del gobierno que está a 10 km marque 'Verde'. AURA-172 pone un 'guardián ambiental' directo en tu colonia que avisa al instante con luces de colores si el aire se volvió peligroso."
    ))
    story.append(Spacer(1, 14))

    # ═════════════════════════════════════════════════════════════════════════
    # ARQUITECTURA DE LAS 5 CAPAS DEL SISTEMA IOT
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("2. Arquitectura del Sistema: Explicación de Cada Capa", h1_estilo))
    story.append(Paragraph(
        "AURA-172 se estructura siguiendo el modelo estándar de 5 capas de Internet de las Cosas:",
        cuerpo
    ))

    # CAPA 1: SENSORES Y PERCEPCIÓN
    story.append(Paragraph("Capa 1: Sensado y Percepción Físca (Hardware)", h2_estilo))
    story.append(caja_dual(
        "Capa 1",
        "<b>Componentes:</b><br/>"
        "• <b>PMS5003 (Plantower):</b> Sensor de dispersión de luz láser Mie (Laser Particle Scattering) conectado a UART2 (Pines GPIO16/RX y GPIO17/TX). Cuantifica concentración en masa (µg/m³) de PM1.0, PM2.5 y PM10.<br/>"
        "• <b>MQ-7:</b> Sensor electroquímico de óxido de estaño (SnO2) operado con ciclo de calentamiento térmico variable para detección selectiva de Monóxido de Carbono (CO en ppm), conectado al canal ADC1 (GPIO34).<br/>"
        "• <b>DHT22:</b> Sensor capacitivo digital (GPIO4) para corrección higroscópica de partículas y sensación térmica.<br/>"
        "• <b>Actuadores:</b> Semáforo LED RGBW de 5 niveles y Pantalla LCD 1602 I2C (PCF8574 en 0x27, pines GPIO21/SDA y GPIO22/SCL).",
        "<b>Analogía cotidiana:</b><br/>"
        "Esta capa son los 'ojos, nariz y boca' del dispositivo. El sensor láser PMS5003 cuenta las partículas de polvo microscópico y hollín como si contara personas entrando por una puerta. El sensor MQ-7 'huele' los gases tóxicos de los escapes de autos. Los focos de colores y la pantallita son la cara que le muestra a los alumnos y vecinos en la calle si el aire está limpio o peligroso sin que tengan que sacar su celular."
    ))
    story.append(Spacer(1, 10))

    # CAPA 2: EDGE COMPUTING & FIRMWARE
    story.append(Paragraph("Capa 2: Procesamiento en el Borde (Edge Computing / ESP32)", h2_estilo))
    story.append(caja_dual(
        "Capa 2",
        "<b>Implementación en Firmware (C++):</b><br/>"
        "El microcontrolador ESP32 ejecuta FreeRTOS con procesamiento local. No delega la lógica de riesgo a la nube; procesa en tiempo real:<br/>"
        "1. Clasificación estricta de la <b>NOM-172-SEMARNAT-2023</b> evaluando PM2.5 (cortes 15, 33, 79, 130 µg/m³), PM10 (50, 75, 155, 235 µg/m³) y CO (5, 9, 12, 16 ppm).<br/>"
        "2. Determinación del <b>Contaminante Dominante</b> según el principio del peor caso (<i>Worst-Case Principle</i>) entre PM2.5, PM10 y CO.<br/>"
        "3. <b>Variables de estado en RAM:</b> El firmware conserva la última lectura válida del PMS5003 y el promedio de PM para evitar publicar ceros cuando el sensor tarda en entregar una trama nueva.<br/>"
        "4. <b>Rotación dinámica en pantalla LCD 1602:</b> Alternancia cada 2 s entre la pantalla de riesgo ('AIRE: [ESTADO] / DOMINANTE') y la meteorológica ('T: 24.5C H: 58%').",
        "<b>Analogía cotidiana:</b><br/>"
        "El ESP32 es el 'cerebro' del nodo. En lugar de mandar datos crudos a internet y esperar a que un servidor lejano le diga qué hacer, el propio aparato sabe las leyes de salud de México de memoria. Si alguien quema basura cerca, en 2 segundos el cerebro se da cuenta, prende el foco rojo y cambia la pantalla LCD para avisar 'AIRE PELIGROSO'. No depende de que haya internet para proteger a los niños que están jugando en el patio."
    ))
    story.append(Spacer(1, 10))

    # CAPA 3: RED Y PROVISIONAMIENTO
    story.append(Paragraph("Capa 3: Red y Conectividad (Wi-Fi & Captive Portal)", h2_estilo))
    story.append(caja_dual(
        "Capa 3",
        "<b>Provisionamiento Autónomo y Manejo de Nuevos Nodos:</b><br/>"
        "• <b>Captive Portal (WiFiManager):</b> Si el nodo se enciende por primera vez o pierde la red configurada, levanta un Access Point (AP) SoftAP con servidor DNS/HTTP local (IP 192.168.4.1). Al conectarse, despliega la interfaz web para escanear y almacenar SSID/Password en la partición NVS (Non-Volatile Storage).<br/>"
        "• <b>Identidad Única de Estación:</b> Cada ESP32 se compila con un <code>NODO_ID</code> distinto (<code>nodo1</code>, <code>nodo2</code>, <code>nodo3</code>…). El tópico se forma como <code>colectivo/aire/&lt;NODO_ID&gt;</code> y el ClientID MQTT se genera aleatoriamente en cada arranque para evitar colisiones entre nodos. El administrador registra ese mismo tópico desde el Panel de Administración de la app.",
        "<b>Analogía cotidiana:</b><br/>"
        "¿Cómo se conecta un nodo nuevo? Imagina cuando vas a un hotel o cafetería: te conectas a su red Wi-Fi y de inmediato te aparece una página en la pantalla para ingresar. Con AURA-172 es exactamente igual: enchufas un nodo nuevo de la caja, desde tu teléfono te conectas a su red 'ESP32_Aire_Config', le pones el internet de la escuela y listo. Después, el administrador lo da de alta en la app con su tópico MQTT."
    ))
    story.append(Spacer(1, 10))

    # CAPA 4: TRANSPORTE Y MENSAJERÍA
    story.append(Paragraph("Capa 4: Transporte y Mensajería Ligera (MQTT Broker)", h2_estilo))
    story.append(caja_dual(
        "Capa 4",
        "<b>Protocolo y Formato de Serialización:</b><br/>"
        "• <b>MQTT v3.1.1 (Message Queuing Telemetry Transport):</b> Protocolo Publish/Subscribe ultra ligero sobre TCP con QoS 0/1. Reduce el overhead de encabezados comparado con HTTP REST tradicional de ~800 bytes a escasos 2 bytes.<br/>"
        "• <b>WebSockets Seguros (WSS / TLS):</b> Puerto 8884 para consumo web/móvil reactivo.<br/>"
        "• <b>Tópico Jerárquico:</b> <code>colectivo/aire/[nodoId]</code> (ej. <code>colectivo/aire/nodo1</code>).<br/>"
        "• <b>Payload JSON Estandarizado:</b><br/>"
        "<code>{\"pm1\": 8.2, \"pm25\": 14.5, \"pm10\": 22.1, \"co\": 1.8, \"temp\": 24.5, \"hum\": 58, \"nivel_pm25\": 0, \"nivel_pm10\": 0, \"nivel_co\": 0, \"nivel_general\": 0, \"dominante\": \"PM2.5\", \"estado\": \"BUENA\"}</code>",
        "<b>Analogía cotidiana:</b><br/>"
        "MQTT es como un canal de radio o un grupo de avisos. El nodo de la escuela 'publica' un mensaje corto cada 5 segundos diciendo cómo está el aire. La aplicación en el teléfono del director o de los padres está 'suscrita' a ese canal. Si el canal no tiene mensajes nuevos, la app no gasta datos preguntando a lo loco; solo escucha cuando hay novedades."
    ))
    story.append(Spacer(1, 10))

    # CAPA 5: APLICACIÓN Y EXPERIENCIA DE USUARIO
    story.append(Paragraph("Capa 5: Aplicación Móvil / Web (React Native + Expo)", h2_estilo))
    story.append(caja_dual(
        "Capa 5",
        "<b>Diseño React Native con Tipografía Manrope y Tarjetas Minimalistas:</b><br/>"
        "• <b>Hero Principal de Riesgo:</b> Sustituye la temperatura gigante por el estado oficial de salud ambiental ('BUENA', 'MALA') con tipografía Manrope Bold (t=32) y halo de color reactivo al <code>nivel_general</code> (0 a 4).<br/>"
        "• <b>Estado Neutro / Respeto de Conexión:</b> Si no hay datos MQTT recibidos, la interfaz muestra 'SIN SEÑAL' y 'ESPERANDO NODO...', evitando falsas sensaciones de seguridad.<br/>"
        "• <b>Separación Categórica Estricta:</b> Partículas (PMS5003 con pestañas tipo píldora para PM2.5, PM10, PM1) y Gases (MQ-7 para Monóxido de Carbono CO).<br/>"
        "• <b>Gestión Inteligente de Notificaciones (Anti-Spam):</b> Se eliminaron las notificaciones por segundo. La app actualiza telemetría en vivo en pantalla, pero las alertas sonoras al sistema solo ocurren si el aire <i>empeora</i>, si <i>mejora</i> a niveles seguros, o en un <i>resumen programado diario</i> a una hora fija (ej. 08:00 AM).<br/>"
        "• <b>Enlace automático de estación:</b> El usuario general ya no elige manualmente entre una lista de nodos. La app se enlaza sola a la <b>estación más cercana por GPS</b> o al modo <b>Centinela</b> (nodo con mayor riesgo). Esto evita menús saturados y errores de selección.<br/>"
        "• <b>Panel de Administración:</b> El alta, edición, activación y baja de estaciones (nombre, tópico MQTT, broker, zona y coordenadas) está restringida a administradores autenticados.<br/>"
        "• <b>Acceso visible a Ajustes:</b> El engranaje del encabezado abre la pantalla completa de configuración (alertas, grupos vulnerables, reportes y administración).",
        "<b>Analogía cotidiana:</b><br/>"
        "La aplicación es tu tablero personal en el celular. En vez de marearte con números difíciles de entender o mandarte 10 notificaciones por minuto como si fuera spam, te dice claramente en color verde o rojo si puedes salir a hacer ejercicio o si tus hijos deben quedarse en el salón. Además, tú eliges si quieres que te mande un resumen a las 8 de la mañana antes de salir de casa."
    ))
    story.append(Spacer(1, 14))

    # ═════════════════════════════════════════════════════════════════════════
    # PREGUNTAS CLAVE DE IMPLEMENTACIÓN Y CASOS PRÁCTICOS
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("3. Respuestas a Decisiones Críticas del Proyecto", h1_estilo))
    
    preguntas = [
        ("¿Qué pasa si tengo un ESP32 nuevo? ¿Choca con el anterior?",
         "<b>Técnica:</b> El firmware define un <code>NODO_ID</code> configurable (<code>nodo1</code>, <code>nodo2</code>, <code>nodo3</code>…). Antes de flashear cada placa se cambia ese valor, de modo que cada nodo publica en un tópico distinto: <code>colectivo/aire/nodoX</code>. Además, el ClientID MQTT se genera aleatoriamente en cada arranque, evitando desconexiones por identificadores duplicados. El administrador registra cada tópico nuevo desde el Panel de Administración de la app.<br/>"
         "<b>Fácil:</b> Es como comprar 10 teléfonos del mismo modelo: cada uno tiene su propio número. Antes de entregar un nodo nuevo le ponemos su nombre (nodo2, nodo3…) para que la app sepa exactamente de qué aparato viene cada lectura."),

        ("¿Por qué no poner calidad 'BUENA' por defecto si no hay ningún nodo conectado?",
         "<b>Técnica:</b> Asumir un estado 'BUENA' en ausencia de telemetría viola el principio de integridad y fail-safe de sistemas de soporte a la salud pública (ISO/IEC 25010). Un falso negativo en calidad del aire expondría a poblaciones asmáticas o vulnerables a episodios severos de contaminación. Por eso la app muestra 'SIN SEÑAL / ESPERANDO NODO...'.<br/>"
         "<b>Fácil:</b> Si el detector de humo de tu casa se queda sin pilas, no debe decirte 'no hay fuego'; debe avisarte 'no tengo pilas, cámbialas'. Con la salud no se finge."),

        ("¿Por qué separar las Partículas (PM) de los Gases (CO)?",
         "<b>Técnica:</b> El material particulado (PM2.5/PM10) y los gases de combustión (CO) poseen naturalezas fisicoquímicas, cinéticas de dispersión y mecanismos de toxicocinética humana completamente distintas. Las partículas finas penetran la barrera hematoencefálica y los alvéolos pulmonares, mientras que el CO desplaza el oxígeno de la hemoglobina formando carboxihemoglobina (COHb). Mezclarlos en una sola escala confunde el diagnóstico ambiental.<br/>"
         "<b>Fácil:</b> Las partículas son como polvo o ceniza que respiras y te tapa los pulmones; el monóxido de carbono es un gas invisible e inodoro que viene de los tubos de escape de los coches. Juntarlos en la misma tarjeta sería como juntar la temperatura del horno con la sal de la comida."),

        ("¿Por qué limitar la gráfica a los últimos 30 puntos en memoria de sesión?",
         "<b>Técnica:</b> Almacenar series de tiempo continuas cada 2 segundos en el almacenamiento persistente del teléfono (AsyncStorage/SQLite) generaría saturación por I/O thrashing y degradación de memoria flash. Mantener una cola FIFO de 30 muestras en el estado de React (useState) otorga fluidez de 60 FPS en pantalla sin impactar la batería ni el almacenamiento del usuario.<br/>"
         "<b>Fácil:</b> Es como la gráfica de pulso en un monitor de hospital: te enseña el latido de los últimos minutos para que veas la tendencia en vivo, sin llenar la memoria de tu teléfono de fotos viejas.")
    ]

    for preg, resp in preguntas:
        t_box = Table([
            [Paragraph(f"<b>❓ {preg}</b>", cuerpo_negrita)],
            [Paragraph(resp, cuerpo)]
        ], colWidths=[504])
        t_box.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), colors.HexColor("#FEF3C7")),
            ('BACKGROUND', (0, 1), (0, 1), colors.HexColor("#FFFBEB")),
            ('BOX', (0, 0), (0, -1), 1, colors.HexColor("#FCD34D")),
            ('PADDING', (0, 0), (0, -1), 6),
            ('BOTTOMPADDING', (0, 1), (0, 1), 8),
        ]))
        story.append(t_box)
        story.append(Spacer(1, 8))

    # ═════════════════════════════════════════════════════════════════════════
    # SIGUIENTES PASOS Y HOJA DE RUTA (ALINEADO AL POSTER SKILIKET)
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("4. Conexión con el Poster y Siguientes Pasos", h1_estilo))
    story.append(Paragraph(
        "Tal como se postuló en el <b>3er Simposio SKILIKET</b> en el Campus Guadalajara, la evolución de AURA-172 se enfoca en tres ejes estratégicos:",
        cuerpo
    ))

    pasos_data = [
        [
            Paragraph("<b>Fase / Objetivo</b>", cuerpo_negrita),
            Paragraph("<b>Explicación Técnica</b>", cuerpo_negrita),
            Paragraph("<b>Beneficio Ciudadano</b>", cuerpo_negrita)
        ],
        [
            Paragraph("<b>1. Migración a LoRaWAN / NB-IoT</b>", cuerpo),
            Paragraph("Sustituir el módulo Wi-Fi 802.11 b/g/n por transceptores Semtech SX1262 (LoRaWAN 915 MHz) o módem Quectel BG95 (NB-IoT/Cat-M1).", cuerpo),
            Paragraph("Instalar nodos en camellones, parques y carreteras sin necesitar contraseñas de Wi-Fi locales.", cuerpo)
        ],
        [
            Paragraph("<b>2. Autonomía Energética Solar</b>", cuerpo),
            Paragraph("Integración de módulo MPPT (CN3791) con celda fotovoltaica monocristalina de 5W y batería de fosfato de hierro y litio (LiFePO4 3.2V 3200mAh).", cuerpo),
            Paragraph("Los nodos funcionan día y noche 24/7 sin cables a la luz eléctrica.", cuerpo)
        ],
        [
            Paragraph("<b>3. Gabinete Rugerizado IP65</b>", cuerpo),
            Paragraph("Diseño e impresión 3D en PETG/ASA con pantalla de protección solar contra radiación UV y cámara de ventilación forzada para el PMS5003.", cuerpo),
            Paragraph("Soporta tormentas, sol directo y polvo sin descalibrar los sensores.", cuerpo)
        ],
        [
            Paragraph("<b>4. Federación Abierta con SIMAJ</b>", cuerpo),
            Paragraph("Exposición de endpoints REST/GraphQL compatibles con los estándares de datos abiertos del Estado de Jalisco.", cuerpo),
            Paragraph("La ciudadanía y universidades pueden descargar datos históricos para tesis e investigación ambiental.", cuerpo)
        ]
    ]
    t_pasos = Table(pasos_data, colWidths=[120, 210, 174])
    t_pasos.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0F5132")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor("#F8FAFC")),
        ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor("#FFFFFF")),
        ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor("#F8FAFC")),
        ('BACKGROUND', (0, 4), (-1, 4), colors.HexColor("#FFFFFF")),
        ('PADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_pasos)
    story.append(Spacer(1, 14))

    # ═════════════════════════════════════════════════════════════════════════
    # OPERACIÓN MULTINODO, PUESTA EN MARCHA Y DEMOS
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("5. Operación Multinodo, Verificación y Demos", h1_estilo))
    story.append(Paragraph(
        "El sistema está preparado para operar con la estación principal y con nodos adicionales. "
        "Cada ESP32 publica en su propio tópico y el Panel de Administración concentra el alta, la edición, "
        "la activación y la baja de estaciones.",
        cuerpo
    ))

    demo_data = [
        [
            Paragraph("<b>Escenario</b>", cuerpo_negrita),
            Paragraph("<b>Cómo ejecutarlo</b>", cuerpo_negrita),
            Paragraph("<b>Qué se demuestra</b>", cuerpo_negrita)
        ],
        [
            Paragraph("<b>Verificación de calidad</b>", cuerpo),
            Paragraph("<code>cd app<br/>npm test<br/>npm run typecheck</code>", cuerpo),
            Paragraph("12 pruebas NOM-172, JSON del ESP32, alertas e historial; TypeScript sin errores.", cuerpo)
        ],
        [
            Paragraph("<b>Nodo real</b>", cuerpo),
            Paragraph("Cargar <code>MiEntorno_ESP32.ino</code> con <code>NODO_ID=\"nodo1\"</code> y configurar Wi-Fi con <code>ESP32_Aire_Config</code>.", cuerpo),
            Paragraph("Telemetría real cada 2 s por MQTT, LCD, LEDs y app en vivo.", cuerpo)
        ],
        [
            Paragraph("<b>Tres nodos virtuales</b>", cuerpo),
            Paragraph("<code>cd app<br/>npm run demo:multinodo</code>", cuerpo),
            Paragraph("Publica nodo1, nodo2 y nodo3 con el mismo JSON del firmware; el nodo3 simula episodios de aire malo.", cuerpo)
        ],
        [
            Paragraph("<b>Alta de nodo nuevo</b>", cuerpo),
            Paragraph("Ajustes → Panel de Administración → + Agregar Nodo. Tópico: <code>colectivo/aire/nodo2</code>; broker: <code>broker.hivemq.com</code>.", cuerpo),
            Paragraph("El nodo aparece en la red con su tópico, zona, coordenadas y estado; se puede activar, editar o eliminar.", cuerpo)
        ],
        [
            Paragraph("<b>Alerta de riesgo</b>", cuerpo),
            Paragraph("<code>node herramientas/demo-multinodo.mjs --malo</code>", cuerpo),
            Paragraph("La app abre la vista de notificación cuando el nivel cruza el umbral configurado y avisa cuando mejora.", cuerpo)
        ],
        [
            Paragraph("<b>Simulador HTTP local</b>", cuerpo),
            Paragraph("<code>npm run esp32-simulado</code> y registrar <code>localhost:8090</code> como dirección del nodo.", cuerpo),
            Paragraph("Demostración sin internet del flujo de lecturas e historial.", cuerpo)
        ]
    ]
    t_demo = Table(demo_data, colWidths=[105, 215, 184])
    t_demo.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor("#F8FAFC")),
        ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor("#F8FAFC")),
        ('BACKGROUND', (0, 5), (-1, 5), colors.HexColor("#F8FAFC")),
        ('PADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_demo)
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "<b>Documentación de demos:</b> la guía paso a paso está en "
        "<code>docs/demos/GUIA_DEMOS.md</code> dentro del repositorio.",
        cuerpo
    ))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF generado con éxito en: {ruta_salida}")

if __name__ == '__main__':
    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ruta_proyecto = os.path.join(raiz, "AURA-172_Documento_Explicativo_Completo.pdf")
    construir_pdf(ruta_proyecto)

    # Copia opcional dentro de docs/ para consulta desde el repositorio.
    ruta_docs = os.path.join(raiz, "docs", "AURA-172_Documento_Explicativo_Completo.pdf")
    if os.path.isdir(os.path.dirname(ruta_docs)):
        construir_pdf(ruta_docs)
