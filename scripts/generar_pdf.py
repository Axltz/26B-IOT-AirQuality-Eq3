"""
Genera el documento explicativo de AURA-172 alineado con el enfoque del póster académico:
arquitectura de extremo a extremo, nodo demostrador intercambiable, complementariedad con
el SIMAJ y hoja de ruta explícita.

Uso:
    python scripts/generar_pdf.py
"""

import os

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# ---------------------------------------------------------------------------
# Tipografías TrueType (con respaldo si no existen en el sistema)
# ---------------------------------------------------------------------------
FONT_DIR = os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts")


def _registrar(nombre, archivo, respaldo):
    ruta = os.path.join(FONT_DIR, archivo)
    if os.path.exists(ruta):
        pdfmetrics.registerFont(TTFont(nombre, ruta))
        return nombre
    return respaldo


FONT = _registrar("SegoeUI", "segoeui.ttf", "Helvetica")
FONT_B = _registrar("SegoeUI-Bold", "segoeuib.ttf", "Helvetica-Bold")
FONT_I = _registrar("SegoeUI-Italic", "segoeuii.ttf", "Helvetica-Oblique")
FONT_BI = _registrar("SegoeUI-BoldItalic", "segoeuiz.ttf", "Helvetica-BoldOblique")
FONT_CODE = _registrar("Consolas", "consola.ttf", "Courier")

pdfmetrics.registerFontFamily(
    FONT, normal=FONT, bold=FONT_B, italic=FONT_I, boldItalic=FONT_BI
)

# ---------------------------------------------------------------------------
# Paleta institucional
# ---------------------------------------------------------------------------
C_VERDE = colors.HexColor("#0F5132")
C_VERDE_OSCURO = colors.HexColor("#0A3622")
C_AZUL = colors.HexColor("#1E3A8A")
C_TEXTO = colors.HexColor("#1E293B")
C_GRIS = colors.HexColor("#475569")
C_BORDE = colors.HexColor("#CBD5E1")
C_FONDO = colors.HexColor("#F8FAFC")


class NumberedCanvas(canvas.Canvas):
    """Cabecera y pie de página con numeración consistente."""

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
        self.setFont(FONT, 8)
        self.setFillColor(colors.HexColor("#718096"))

        if self._pageNumber > 1:
            self.drawString(
                54,
                755,
                "AURA-172 · Arquitectura IoT de extremo a extremo (NOM-172-SEMARNAT-2023)",
            )
            self.drawRightString(558, 755, "CUCEI · Universidad de Guadalajara")
            self.setStrokeColor(C_BORDE)
            self.setLineWidth(0.5)
            self.line(54, 748, 558, 748)

        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 45, 558, 45)
        self.drawString(
            54,
            32,
            "Equipo 3 · Internet de las Cosas (NRC V0748) · 3er Simposio SKILIKET 2026",
        )
        self.drawRightString(558, 32, f"Página {self._pageNumber} de {page_count}")
        self.restoreState()


def construir_pdf(ruta_salida):
    doc = SimpleDocTemplate(
        ruta_salida,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=58,
    )

    styles = getSampleStyleSheet()

    titulo_principal = ParagraphStyle(
        "TituloPrincipal",
        parent=styles["Heading1"],
        fontName=FONT_B,
        fontSize=25,
        leading=30,
        textColor=C_VERDE_OSCURO,
        spaceAfter=4,
    )

    subtitulo_portada = ParagraphStyle(
        "SubtituloPortada",
        parent=styles["Normal"],
        fontName=FONT,
        fontSize=12,
        leading=16.5,
        textColor=C_GRIS,
        spaceAfter=4,
    )

    bajada_portada = ParagraphStyle(
        "BajadaPortada",
        parent=styles["Normal"],
        fontName=FONT_I,
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#64748B"),
        spaceAfter=14,
    )

    h1_estilo = ParagraphStyle(
        "H1Custom",
        parent=styles["Heading1"],
        fontName=FONT_B,
        fontSize=15,
        leading=19,
        textColor=C_VERDE,
        spaceBefore=12,
        spaceAfter=7,
        keepWithNext=True,
    )

    h2_estilo = ParagraphStyle(
        "H2Custom",
        parent=styles["Heading2"],
        fontName=FONT_B,
        fontSize=12,
        leading=16,
        textColor=C_AZUL,
        spaceBefore=10,
        spaceAfter=5,
        keepWithNext=True,
    )

    h3_estilo = ParagraphStyle(
        "H3Custom",
        parent=styles["Heading3"],
        fontName=FONT_B,
        fontSize=10.2,
        leading=14,
        textColor=colors.HexColor("#334155"),
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True,
    )

    cuerpo = ParagraphStyle(
        "CuerpoCustom",
        parent=styles["Normal"],
        fontName=FONT,
        fontSize=9.5,
        leading=13.8,
        textColor=C_TEXTO,
        spaceAfter=6,
    )

    vineta = ParagraphStyle(
        "Vineta",
        parent=cuerpo,
        leftIndent=13,
        bulletIndent=2,
        spaceAfter=3.5,
    )

    tecnica_header = ParagraphStyle(
        "TecnicaHeader",
        parent=styles["Normal"],
        fontName=FONT_B,
        fontSize=9,
        leading=12,
        textColor=C_AZUL,
    )

    tecnica_texto = ParagraphStyle(
        "TecnicaTexto",
        parent=styles["Normal"],
        fontName=FONT,
        fontSize=8.9,
        leading=12.6,
        textColor=C_TEXTO,
    )

    facil_header = ParagraphStyle(
        "FacilHeader",
        parent=styles["Normal"],
        fontName=FONT_B,
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#14532D"),
    )

    facil_texto = ParagraphStyle(
        "FacilTexto",
        parent=styles["Normal"],
        fontName=FONT,
        fontSize=8.9,
        leading=12.6,
        textColor=colors.HexColor("#14532D"),
    )

    codigo_estilo = ParagraphStyle(
        "CodigoEstilo",
        parent=styles["Normal"],
        fontName=FONT_CODE,
        fontSize=7.6,
        leading=10,
        textColor=colors.HexColor("#0F172A"),
    )

    tabla_header = ParagraphStyle(
        "TablaHeader",
        parent=styles["Normal"],
        fontName=FONT_B,
        fontSize=8.4,
        leading=11,
        textColor=colors.white,
    )

    tabla_celda = ParagraphStyle(
        "TablaCelda",
        parent=styles["Normal"],
        fontName=FONT,
        fontSize=8.2,
        leading=11.3,
        textColor=C_TEXTO,
    )

    tabla_celda_b = ParagraphStyle(
        "TablaCeldaB",
        parent=tabla_celda,
        fontName=FONT_B,
    )

    nota_estilo = ParagraphStyle(
        "Nota",
        parent=cuerpo,
        fontSize=8.4,
        leading=12,
        textColor=C_GRIS,
    )

    def p(texto, estilo=cuerpo):
        return Paragraph(texto, estilo)

    def v(texto):
        return Paragraph(texto, vineta, bulletText="•")

    def caja_dual(txt_tecnico, txt_facil):
        """Contraste deliberado entre lectura de ingeniería y lectura ciudadana."""
        tabla_data = [
            [Paragraph("<b>LECTURA PARA INGENIERÍA</b>", tecnica_header)],
            [Paragraph(txt_tecnico, tecnica_texto)],
            [Paragraph("<b>LECTURA CIUDADANA (traducción accesible)</b>", facil_header)],
            [Paragraph(txt_facil, facil_texto)],
        ]
        t = Table(tabla_data, colWidths=[504])
        t.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#E0E7FF")),
                    ("BACKGROUND", (0, 1), (0, 1), colors.HexColor("#F8FAFC")),
                    ("BACKGROUND", (0, 2), (0, 2), colors.HexColor("#DCFCE7")),
                    ("BACKGROUND", (0, 3), (0, 3), colors.HexColor("#F0FDF4")),
                    ("BOX", (0, 0), (0, 1), 1, colors.HexColor("#93C5FD")),
                    ("BOX", (0, 2), (0, 3), 1, colors.HexColor("#86EFAC")),
                    ("PADDING", (0, 0), (0, -1), 6),
                    ("TOPPADDING", (0, 0), (0, 0), 3),
                    ("BOTTOMPADDING", (0, 0), (0, 0), 3),
                    ("TOPPADDING", (0, 2), (0, 2), 3),
                    ("BOTTOMPADDING", (0, 2), (0, 2), 3),
                    ("BOTTOMPADDING", (0, 1), (0, 1), 7),
                    ("BOTTOMPADDING", (0, 3), (0, 3), 7),
                ]
            )
        )
        return t

    def tabla(headers, filas, anchos, color_header=C_AZUL):
        data = [[Paragraph(h, tabla_header) for h in headers]]
        for fila in filas:
            data.append([Paragraph(c, tabla_celda) for c in fila])
        t = Table(data, colWidths=anchos, repeatRows=1)
        estilo = [
            ("BACKGROUND", (0, 0), (-1, 0), color_header),
            ("GRID", (0, 0), (-1, -1), 0.5, C_BORDE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]
        for i in range(1, len(data)):
            if i % 2 == 0:
                estilo.append(("BACKGROUND", (0, i), (-1, i), C_FONDO))
        t.setStyle(TableStyle(estilo))
        return t

    def caja_nota(titulo, cuerpo_texto, color_fondo, color_borde, color_titulo):
        t = Table(
            [
                [
                    Paragraph(
                        f"<b>{titulo}</b>",
                        ParagraphStyle(
                            "TituloNota",
                            parent=cuerpo,
                            fontName=FONT_B,
                            textColor=color_titulo,
                        ),
                    )
                ],
                [Paragraph(cuerpo_texto, cuerpo)],
            ],
            colWidths=[504],
        )
        t.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (0, 0), color_fondo),
                    ("BACKGROUND", (0, 1), (0, 1), colors.white),
                    ("BOX", (0, 0), (0, -1), 1, color_borde),
                    ("PADDING", (0, 0), (0, -1), 6),
                    ("BOTTOMPADDING", (0, 1), (0, 1), 7),
                ]
            )
        )
        return t

    story = []

    # =====================================================================
    # PORTADA
    # =====================================================================
    story.append(p("AURA-172", titulo_principal))
    story.append(p("<b>Alerta Urbana de Riesgo Ambiental</b>", subtitulo_portada))
    story.append(
        p(
            "Documento explicativo: arquitectura de extremo a extremo para el monitoreo "
            "hiperlocal comunitario de la calidad del aire",
            subtitulo_portada,
        )
    )
    story.append(
        p(
            "Adquisición multi-parámetro  →  filtrado y clasificación normativa en el borde (Edge)  →  "
            "transporte ligero MQTT  →  traducción visual accesible",
            bajada_portada,
        )
    )

    meta_tabla = [
        [
            p("<b>Institución:</b> Centro Universitario de Ciencias Exactas e Ingenierías (CUCEI)", cuerpo),
            p("<b>Materia:</b> Internet de las Cosas (NRC V0748 · Sec D06)", cuerpo),
        ],
        [
            p("<b>Profesora:</b> MC. Nayeli Areli Pérez Padilla", cuerpo),
            p("<b>Evento:</b> 3er Simposio de Proyectos SKILIKET (Nov 2026)", cuerpo),
        ],
        [
            p(
                "<b>Autores (Equipo 3):</b> Axel G. Martínez Martínez, Camila Suárez Cruz, "
                "Ángel M. Villalvazo Vázquez, Víctor A. Ibarra Orozco, Gustavo A. Bonilla Delgado",
                cuerpo,
            ),
            p("<b>Norma de referencia:</b> NOM-172-SEMARNAT-2023", cuerpo),
        ],
    ]
    t_meta = Table(meta_tabla, colWidths=[258, 246])
    t_meta.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
                ("BOX", (0, 0), (-1, -1), 1, C_BORDE),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ("PADDING", (0, 0), (-1, -1), 6),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story.append(t_meta)
    story.append(Spacer(1, 12))

    story.append(
        caja_nota(
            "RESUMEN EJECUTIVO",
            "AURA-172 es una <b>arquitectura IoT de referencia</b> para observar la calidad del aire a escala "
            "micro-local y convertirla en decisiones cotidianas. Su aporte no reside en un sensor aislado, sino "
            "en el <b>flujo completo de extremo a extremo</b>: adquisición de PM1, PM2.5, PM10, CO, temperatura y "
            "humedad en un <b>nodo demostrador de bajo costo e intercambiable</b>; filtrado y clasificación de "
            "umbrales de la <b>NOM-172-SEMARNAT-2023</b> directamente en el borde; publicación de un payload JSON "
            "por <b>MQTT</b>; y <b>traducción visual accesible</b> en una aplicación web/móvil. El sistema está "
            "diseñado para <b>sumar esfuerzos con el SIMAJ</b>, no para sustituirlo: aporta resolución espacial "
            "donde la red oficial no llega y lenguaje comprensible donde el dato técnico no basta. Hoy opera de "
            "punta a punta con nodos locales en tiempo real; el consumo directo de datos abiertos del SIMAJ y el "
            "enlace LoRaWAN forman parte de la hoja de ruta.",
            colors.HexColor("#ECFDF5"),
            colors.HexColor("#6EE7B7"),
            C_VERDE_OSCURO,
        )
    )
    story.append(Spacer(1, 6))

    # Tres pilares del proyecto (cierre visual de portada)
    pilares = [
        [
            p("<b>Arquitectura abierta</b>", ParagraphStyle("P1", parent=tabla_celda_b, textColor=C_AZUL)),
            p("<b>Edge normativo</b>", ParagraphStyle("P2", parent=tabla_celda_b, textColor=C_AZUL)),
            p("<b>Traducción ciudadana</b>", ParagraphStyle("P3", parent=tabla_celda_b, textColor=C_AZUL)),
        ],
        [
            p("Flujo completo y modular: del sensor a la app con un contrato de datos estable.", tabla_celda),
            p("Clasificación NOM-172 en el nodo, con autonomía aunque falle la red.", tabla_celda),
            p("Niveles técnicos convertidos en color, mensaje y recomendación útil.", tabla_celda),
        ],
    ]
    t_pilares = Table(pilares, colWidths=[168, 168, 168])
    t_pilares.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EFF6FF")),
                ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#F8FAFC")),
                ("BOX", (0, 0), (-1, -1), 1, C_BORDE),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, C_BORDE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(t_pilares)

    # =====================================================================
    # 1. VISIÓN GENERAL Y PROPÓSITO
    # =====================================================================
    story.append(PageBreak())
    story.append(p("1. Visión general y propósito de AURA-172", h1_estilo))
    story.append(
        p(
            "AURA-172 nace de una pregunta de ingeniería y de comunicación pública: <b>cómo llevar la medición "
            "de la calidad del aire al lugar donde las personas viven, estudian y caminan, y cómo traducir ese "
            "dato en una decisión comprensible sin perder rigor técnico</b>. La respuesta es una arquitectura "
            "modular, replicable y de bajo costo que integra adquisición de datos, lógica normativa en el "
            "dispositivo, transporte ligero y una interfaz que jerarquiza el riesgo.",
            cuerpo,
        )
    )
    story.append(p("1.1 El problema: escala micro-local y brecha de comunicación", h2_estilo))
    story.append(
        p(
            "La calidad del aire es un fenómeno con <b>alta variabilidad espacial</b>. En radios menores a "
            "800 metros conviven microclimas urbanos distintos: una avenida con tráfico pesado, un patio escolar "
            "arbolado, una zona de quemas agrícolas o una intersección con congestión vehicular pueden presentar "
            "concentraciones muy diferentes. Las redes oficiales, por su diseño y costo, optimizan cobertura "
            "macroambiental y publican índices agregados; esa es su fortaleza y también el límite natural de su "
            "resolución para explicar lo que ocurre en una banqueta específica.",
            cuerpo,
        )
    )
    story.append(
        p(
            "Existe, además, una <b>brecha de comunicación</b>: un índice numérico o una tabla normativa no "
            "siempre se traduce en una acción concreta para una madre, un docente o una persona con asma. "
            "AURA-172 ataca ambos problemas con la misma arquitectura: agrega una capa de observación local "
            "y una capa de traducción visual que responde a la pregunta práctica: <i>¿puedo salir ahora, o conviene "
            "esperar?</i>",
            cuerpo,
        )
    )
    story.append(
        caja_dual(
            "<b>Encuadre técnico:</b> el proyecto demuestra un pipeline completo de IoT: sensado multi-parámetro, "
            "acondicionamiento y validación de datos, clasificación normativa en el borde, serialización JSON y "
            "transporte publish/subscribe, con una capa de presentación reactiva. El hardware se asume como "
            "<b>nodo demostrador intercambiable</b>: la arquitectura sobrevive al cambio de sensor, de placa o de "
            "radio, siempre que se conserve el contrato de datos.",
            "<b>En palabras sencillas:</b> no construimos «el sensor definitivo», construimos el camino completo "
            "que va del aire de tu colonia a una alerta clara en tu celular. Es como una cadena de relevos: cada "
            "tramo puede cambiar de corredor, pero el mensaje llega igual a la meta.",
        )
    )
    story.append(Spacer(1, 8))
    story.append(p("1.2 Cómo suma esfuerzos con la red oficial (SIMAJ)", h2_estilo))
    story.append(
        p(
            "El Sistema de Monitoreo Atmosférico de Jalisco (SIMAJ) opera estaciones con instrumentación de "
            "referencia y protocolos de aseguramiento de calidad. AURA-172 <b>no compite con esa infraestructura "
            "ni pretende sustituirla</b>. Su propósito es <b>complementarla</b> en dos dimensiones:",
            cuerpo,
        )
    )
    story.append(
        v(
            "<b>Resolución espacial:</b> nodos de bajo costo que pueden desplegarse en escuelas, centros "
            "comunitarios y corredores viales para observar variaciones locales."
        )
    )
    story.append(
        v(
            "<b>Traducción pública:</b> una interfaz que convierte niveles normativos en mensajes, colores y "
            "recomendaciones por grupo vulnerable."
        )
    )
    story.append(
        p(
            "La comparación futura con datos abiertos del SIMAJ permitirá usar la referencia oficial como "
            "contexto y validación externa, no como adversario. La red oficial dice cómo está la cuenca "
            "atmosférica; AURA-172 ayuda a entender cómo se vive esa cuenca en una cuadra concreta.",
            cuerpo,
        )
    )
    story.append(Spacer(1, 6))

    story.append(p("1.3 Qué es y qué no es AURA-172", h2_estilo))
    story.append(
        tabla(
            ["AURA-172 sí es", "AURA-172 no es"],
            [
                [
                    "Una arquitectura de referencia de extremo a extremo, modular y replicable.",
                    "Un instrumento certificado de medición ambiental ni una estación oficial.",
                ],
                [
                    "Un nodo demostrador de bajo costo con sensores intercambiables y contrato de datos estable.",
                    "Una promesa de precisión metrológica equivalente a instrumentación de referencia.",
                ],
                [
                    "Una capa complementaria de observación micro-local y traducción ciudadana.",
                    "Un sustituto del SIMAJ ni un dictamen de cumplimiento normativo oficial.",
                ],
                [
                    "Un sistema operando hoy con nodos locales en tiempo real.",
                    "Un producto terminado con SIMAJ integrado o despliegue LoRaWAN ya realizado.",
                ],
            ],
            [252, 252],
            color_header=C_VERDE,
        )
    )
    story.append(Spacer(1, 8))

    # =====================================================================
    # 2. ARQUITECTURA POR CAPAS
    # =====================================================================
    story.append(p("2. Arquitectura por capas", h1_estilo))
    story.append(
        p(
            "La arquitectura se organiza en tres capas funcionales y un flujo de valor explícito. Cada capa "
            "tiene una responsabilidad acotada y una interfaz clara con la siguiente, lo que permite sustituir "
            "componentes sin rehacer el sistema.",
            cuerpo,
        )
    )

    flujo = [
        [
            p("<b>1. Adquisición</b>", tabla_celda_b),
            p("<b>2. Edge</b>", tabla_celda_b),
            p("<b>3. Transporte</b>", tabla_celda_b),
            p("<b>4. Traducción visual</b>", tabla_celda_b),
        ],
        [
            p("PM1, PM2.5, PM10, CO, temperatura y humedad", tabla_celda),
            p("Filtrado, compensación higroscópica y clasificación NOM-172", tabla_celda),
            p("Payload JSON por MQTT sobre Wi-Fi", tabla_celda),
            p("Semáforo, estado dominante y recomendaciones", tabla_celda),
        ],
    ]
    t_flujo = Table(flujo, colWidths=[126, 126, 126, 126])
    t_flujo.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), C_AZUL),
                ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#EFF6FF")),
                ("BOX", (0, 0), (-1, -1), 1, C_BORDE),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, C_BORDE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(t_flujo)
    story.append(Spacer(1, 8))

    # ---------------------------------------------------------------------
    # 2.1 CAPA FÍSICA Y EDGE
    # ---------------------------------------------------------------------
    story.append(p("2.1 Capa física y Edge: el nodo demostrador", h2_estilo))
    story.append(
        p(
            "El nodo actual es un <b>demostrador tecnológico</b>: un ESP32 DevKit con tres familias de sensores "
            "de bajo costo, salidas físicas locales y conectividad Wi-Fi. Su valor es probar el flujo completo con "
            "hardware accesible, no certificar metrológicamente el aire de una ciudad. Cualquier componente puede "
            "reemplazarse por un sensor de mayor calidad conservando la misma interfaz de datos y la misma lógica "
            "de clasificación.",
            cuerpo,
        )
    )

    story.append(p("2.1.1 Adquisición multi-parámetro", h3_estilo))
    story.append(
        tabla(
            ["Variable", "Sensor del nodo demostrador", "Principio / interfaz", "Rol en el sistema"],
            [
                [
                    "PM1, PM2.5 y PM10",
                    "Plantower PMS5003",
                    "Dispersión láser (Mie), UART2 a 9600 baudios (GPIO16/17)",
                    "Material particulado en µg/m³; PM2.5 y PM10 se clasifican con NOM-172",
                ],
                [
                    "Monóxido de carbono (CO)",
                    "MQ-7",
                    "Óxido de estaño (SnO₂), lectura analógica ADC1 (GPIO34)",
                    "Gas de combustión en ppm; se clasifica con NOM-172",
                ],
                [
                    "Temperatura y humedad",
                    "DHT22",
                    "Capacitivo digital, bus único (GPIO4)",
                    "Contexto microclimático y disparo de la compensación higroscópica",
                ],
            ],
            [78, 96, 150, 180],
        )
    )
    story.append(Spacer(1, 4))
    story.append(
        p(
            "<b>Intercambiabilidad por contrato de datos:</b> la lógica de negocio no depende del modelo de sensor, "
            "sino de los campos <code>pm1</code>, <code>pm25</code>, <code>pm10</code>, <code>co</code>, "
            "<code>temp</code> y <code>hum</code>. Sustituir el PMS5003 por un sensor óptico de otra marca, o el "
            "MQ-7 por un sensor electroquímico calibrado, implica adaptar únicamente el driver de adquisición y "
            "mantener el mismo payload. Esa es la base de la modularidad del proyecto.",
            cuerpo,
        )
    )

    story.append(p("2.1.2 Filtrado y compensación higroscópica", h3_estilo))
    story.append(
        p("Antes de clasificar, el firmware aplica tres controles de calidad sobre los datos crudos:", cuerpo)
    )
    story.append(
        v(
            "<b>Persistencia de la última lectura válida:</b> si el PMS5003 aún no entrega una trama nueva, se "
            "conserva la última lectura coherente en lugar de publicar ceros que simulen aire limpio."
        )
    )
    story.append(
        v(
            "<b>Descarte de valores fuera de rango:</b> las tramas con valores superiores a 1000 µg/m³ se "
            "consideran inválidas y no sobrescriben el estado."
        )
    )
    story.append(
        v(
            "<b>Compensación higroscópica:</b> cuando la humedad relativa supera el 70 %, se aplica un factor de "
            "0.85 a PM1, PM2.5 y PM10 para reducir la sobreestimación óptica asociada al vapor de agua condensado."
        )
    )
    story.append(
        p(
            "La compensación es una <b>heurística de ingeniería documentada</b>, no una corrección oficial de la "
            "norma ni un algoritmo de calibración metrológica. Su efecto es acotado y transparente: se aplica solo "
            "con humedad válida y su objetivo es evitar alertas infladas por condiciones ambientales, no maquillar "
            "la medición.",
            cuerpo,
        )
    )

    story.append(p("2.1.3 Clasificación normativa local y contaminante dominante", h3_estilo))
    story.append(
        p(
            "La evaluación de umbrales ocurre <b>en el borde</b>, dentro del ESP32. El nodo no espera a un servidor "
            "para decidir si el aire es riesgoso: aplica los cortes de la NOM-172-SEMARNAT-2023 y determina un "
            "nivel de 0 a 4 para cada parámetro normado.",
            cuerpo,
        )
    )
    story.append(
        tabla(
            ["Nivel", "Estado", "PM2.5 (µg/m³)", "PM10 (µg/m³)", "CO (ppm)", "Semáforo físico"],
            [
                ["0", "Buena", "0 – 15", "0 – 50", "0 – 5", "Verde fijo"],
                ["1", "Aceptable", "15.1 – 33", "50.1 – 75", "5.1 – 9", "Amarillo fijo"],
                ["2", "Mala", "33.1 – 79", "75.1 – 155", "9.1 – 12", "Amarillo + rojo"],
                ["3", "Muy mala", "79.1 – 130", "155.1 – 235", "12.1 – 16", "Rojo fijo"],
                ["4", "Extremadamente mala", "> 130", "> 235", "> 16", "Rojo parpadeante"],
            ],
            [40, 108, 90, 90, 76, 100],
            color_header=C_VERDE,
        )
    )
    story.append(Spacer(1, 4))
    story.append(
        p(
            "<b>Contaminante dominante:</b> el estado general no se promedia. Se aplica el principio del peor caso "
            "(<i>worst-case principle</i>): el nivel general es el máximo entre PM2.5, PM10 y CO, y el contaminante "
            "dominante es el parámetro que alcanza ese nivel. Así se evita que un promedio oculto diluya un pico "
            "peligroso. <b>PM1 se mide y se muestra como variable complementaria</b>, pero no participa en la "
            "clasificación normativa porque la NOM-172 no define cortes para ese parámetro. Esta distinción es "
            "deliberada y se explicita para no atribuir a la norma un alcance que no tiene.",
            cuerpo,
        )
    )

    story.append(p("2.1.4 Portal cautivo Wi-Fi y semáforo físico de cinco estados", h3_estilo))
    story.append(
        p(
            "El nodo se aprovisiona sin reprogramación: si no encuentra una red guardada, levanta un punto de "
            "acceso <b>ESP32_Aire_Config</b> con portal cautivo (WiFiManager). El usuario se conecta desde su "
            "teléfono, selecciona la red local e ingresa la contraseña; las credenciales quedan en la memoria "
            "no volátil (NVS). Cada placa se compila con un <code>NODO_ID</code> propio (<code>nodo1</code>, "
            "<code>nodo2</code>, …), que define su tópico MQTT y permite que varios nodos convivan en el mismo "
            "broker sin colisiones.",
            cuerpo,
        )
    )
    story.append(
        p(
            "La salida física es un <b>semáforo de cinco estados</b> con tres LEDs (verde GPIO12, amarillo GPIO14, "
            "rojo GPIO27) y una pantalla LCD 1602 I2C que alterna dos vistas: riesgo y microclima. El objetivo es "
            "que cualquier persona entienda el estado del aire sin abrir una aplicación. El detalle de la "
            "correspondencia entre nivel, color y mensaje se resume en la tabla anterior.",
            cuerpo,
        )
    )
    story.append(
        caja_dual(
            "<b>Decisión de diseño:</b> la clasificación local garantiza <b>autonomía funcional</b>. Si el Wi-Fi "
            "o el broker fallan, el semáforo y la LCD siguen alertando con la última lectura válida. La nube y la "
            "app agregan alcance y trazabilidad, pero no son requisito para la protección inmediata.",
            "<b>En la práctica:</b> el nodo es como un guardián que no necesita pedir permiso para avisar. Si ve "
            "que el aire se pone malo, cambia de color ahí mismo, aunque en ese momento se haya caído el internet.",
        )
    )
    story.append(Spacer(1, 8))

    # ---------------------------------------------------------------------
    # 2.2 CAPA DE RED Y TRANSPORTE
    # ---------------------------------------------------------------------
    story.append(p("2.2 Capa de red y transporte: MQTT", h2_estilo))
    story.append(
        p(
            "El nodo publica telemetría en <b>MQTT</b> (Message Queuing Telemetry Transport), un protocolo "
            "publish/subscribe diseñado para dispositivos con recursos limitados. Frente a un esquema HTTP de "
            "sondeo constante, MQTT reduce el overhead de encabezados, evita que la aplicación pregunte sin "
            "necesidad y desacopla productores de consumidores: el nodo publica y cualquier cliente suscrito "
            "recibe, sin conocerse entre sí.",
            cuerpo,
        )
    )
    story.append(
        tabla(
            ["Elemento", "Configuración actual", "Propósito"],
            [
                ["Broker", "broker.hivemq.com (público, para demostración)", "Punto de encuentro entre nodos y aplicación"],
                ["Puerto del nodo", "1883 (TCP)", "Publicación ligera desde el ESP32"],
                ["Puerto de la app", "8884 (WebSockets seguro / TLS)", "Suscripción reactiva desde web y móvil"],
                ["Tópico", "colectivo/aire/{nodoId}", "Aislamiento por nodo y escalabilidad horizontal"],
                ["Cadencia", "Una publicación cada 2 segundos", "Baja latencia sin saturar la red"],
                ["Formato", "JSON plano", "Legible, validable y fácil de versionar"],
            ],
            [86, 226, 192],
        )
    )
    story.append(Spacer(1, 4))
    story.append(p("2.2.1 Contrato de datos (payload JSON)", h3_estilo))
    story.append(
        p(
            "Todos los nodos publican exactamente la misma estructura. Este contrato es el núcleo de la "
            "interoperabilidad: un nodo nuevo solo necesita respetarlo para ser visible en la aplicación.",
            cuerpo,
        )
    )
    payload_ejemplo = (
        "{<br/>"
        '&nbsp;&nbsp;"pm1": 8.2, "pm25": 14.5, "pm10": 22.1, "co": 1.80,<br/>'
        '&nbsp;&nbsp;"temp": 24.5, "hum": 58.0,<br/>'
        '&nbsp;&nbsp;"nivel_pm25": 0, "nivel_pm10": 0, "nivel_co": 0,<br/>'
        '&nbsp;&nbsp;"nivel_general": 0, "dominante": "PM2.5", "estado": "BUENA"<br/>'
        "}"
    )
    t_codigo = Table([[Paragraph(payload_ejemplo, codigo_estilo)]], colWidths=[504])
    t_codigo.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
                ("BOX", (0, 0), (-1, -1), 1, C_BORDE),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    story.append(t_codigo)
    story.append(Spacer(1, 6))
    story.append(
        tabla(
            ["Campo", "Tipo", "Unidad", "Significado"],
            [
                ["pm1", "número", "µg/m³", "Partículas ultrafinas; variable complementaria, sin corte normativo"],
                ["pm25", "número", "µg/m³", "Material particulado fino; se clasifica con NOM-172"],
                ["pm10", "número", "µg/m³", "Material particulado inhalable; se clasifica con NOM-172"],
                ["co", "número", "ppm", "Monóxido de carbono; se clasifica con NOM-172"],
                ["temp / hum", "número", "°C / %", "Contexto microclimático y control de compensación"],
                ["nivel_pm25 / nivel_pm10 / nivel_co", "entero 0-4", "nivel", "Clasificación individual de cada parámetro"],
                ["nivel_general", "entero 0-4", "nivel", "Máximo de los tres niveles (peor caso)"],
                ["dominante", "texto", "—", "PM2.5, PM10 o CO: parámetro que define el nivel general"],
                ["estado", "texto", "—", "BUENA, ACEPTABLE, MALA, MUY MALA o EXT. MALA"],
            ],
            [136, 64, 58, 246],
        )
    )
    story.append(Spacer(1, 4))
    story.append(
        p(
            "<b>Ventajas para escalar:</b> agregar un nodo no requiere modificar la aplicación; basta compilar el "
            "firmware con otro <code>NODO_ID</code> y registrarlo en el Panel de Administración. El tópico "
            "jerárquico permite suscribirse a un nodo específico o a todos los nodos del colectivo con un comodín. "
            "El broker público de HiveMQ es adecuado para demostración y pruebas académicas; en producción se "
            "reemplazaría por un broker privado con autenticación y TLS.",
            cuerpo,
        )
    )

    # ---------------------------------------------------------------------
    # 2.3 CAPA DE APLICACIÓN
    # ---------------------------------------------------------------------
    story.append(p("2.3 Capa de aplicación y traducción visual: frontend React", h2_estilo))
    story.append(
        p(
            "La aplicación está construida con <b>React Native + Expo Router + TypeScript</b>, lo que permite "
            "ejecutarla como app móvil y como aplicación web desde el mismo código. Su función no es solo mostrar "
            "números: es <b>jerarquizar el riesgo y traducirlo</b> en una lectura comprensible.",
            cuerpo,
        )
    )
    story.append(p("2.3.1 Consumo en tiempo real sin saturar el dispositivo", h3_estilo))
    story.append(
        p(
            "El cliente se suscribe al tópico MQTT por <b>WebSockets</b> y recibe cada publicación sin sondeo "
            "periódico. Para el historial se mantiene una <b>cola FIFO de 30 muestras en memoria de sesión</b>: "
            "suficiente para dibujar la tendencia reciente (alrededor de un minuto con cadencia de 2 segundos) sin "
            "escribir series continuas en el almacenamiento del teléfono. Esta decisión evita desgaste de memoria "
            "flash, consumo innecesario de batería y crecimiento indefinido de datos locales. La persistencia "
            "histórica es una decisión de producto que se reserva para una etapa posterior.",
            cuerpo,
        )
    )
    story.append(p("2.3.2 Jerarquía visual y exploración por pestañas", h3_estilo))
    story.append(
        v(
            "<b>Estado general como hero:</b> la pantalla principal prioriza el estado de riesgo y el contaminante "
            "dominante, no la temperatura ni el dato crudo."
        )
    )
    story.append(
        v(
            "<b>Parámetros por pestañas:</b> PM2.5, PM10, PM1, CO, temperatura y humedad se exploran en pestañas "
            "tipo píldora para evitar saturación visual."
        )
    )
    story.append(
        v(
            "<b>Estado neutro honesto:</b> si no hay telemetría, la app muestra «SIN SEÑAL» y «ESPERANDO NODO». No "
            "asume aire limpio, porque un falso negativo en salud pública es más costoso que reconocer la falta de "
            "datos."
        )
    )
    story.append(
        v(
            "<b>Alertas con criterio anti-spam:</b> la pantalla se actualiza en vivo, pero las notificaciones se "
            "reservan para empeoramientos, mejoras a niveles seguros o un resumen diario programado."
        )
    )
    story.append(
        v(
            "<b>Grupos vulnerables:</b> niñas y niños, adultos mayores, personas con asma/EPOC/cardiopatías y "
            "personas gestantes reciben recomendaciones específicas."
        )
    )
    story.append(
        v(
            "<b>Panel de Administración:</b> el alta, edición, activación y baja de estaciones (nombre, tópico, "
            "broker, zona y coordenadas) queda restringida a administradores autenticados."
        )
    )
    story.append(Spacer(1, 5))
    story.append(
        tabla(
            ["Nivel normativo", "Lectura técnica", "Traducción para cualquier persona"],
            [
                ["0 - Buena", "PM2.5, PM10 y CO dentro del primer corte", "Aire limpio: actividad normal al aire libre"],
                ["1 - Aceptable", "Al menos un parámetro en el segundo corte", "Aire aceptable: precaución con personas sensibles"],
                ["2 - Mala", "Al menos un parámetro en el tercer corte", "Aire malo: reducir esfuerzo prolongado al aire libre"],
                ["3 - Muy mala", "Al menos un parámetro en el cuarto corte", "Aire muy malo: evitar actividades al aire libre"],
                ["4 - Extremadamente mala", "Al menos un parámetro supera el último corte", "Riesgo alto: permanecer en interiores y ventilar con criterio"],
            ],
            [98, 172, 234],
            color_header=C_VERDE,
        )
    )
    story.append(Spacer(1, 4))
    story.append(
        caja_dual(
            "<b>Arquitectura de presentación:</b> el frontend separa el modelo de datos del componente visual. "
            "Un mismo payload alimenta el hero de riesgo, las pestañas de parámetros, la gráfica de tendencia y "
            "el motor de alertas. Esto reduce el acoplamiento y permite cambiar la interfaz sin tocar el firmware.",
            "<b>En la práctica:</b> la app no te obliga a interpretar una tabla de la norma. Te dice en lenguaje "
            "claro si puedes salir a correr, si conviene mover el recreo al salón o si tu hijo con asma debe "
            "quedarse adentro, y te muestra el dato técnico si quieres profundizar.",
        )
    )
    story.append(Spacer(1, 8))

    # =====================================================================
    # 3. VALIDACIÓN Y ALCANCE
    # =====================================================================
    story.append(PageBreak())
    story.append(p("3. Validación y alcance del prototipo", h1_estilo))
    story.append(
        p(
            "La validación del prototipo se concentró en comprobar el <b>funcionamiento del flujo de extremo a "
            "extremo</b> y la <b>coherencia de la clasificación</b>, no en certificar precisión metrológica. Esta "
            "distinción es central para describir el proyecto con honestidad.",
            cuerpo,
        )
    )
    story.append(p("3.1 Qué se comprobó", h2_estilo))
    story.append(
        tabla(
            ["Aspecto validado", "Cómo se comprobó", "Resultado observado"],
            [
                [
                    "Clasificación normativa",
                    "Suite automatizada (<code>npm test</code>) sobre los cortes de PM2.5, PM10 y CO y el principio del peor caso",
                    "Los niveles 0 a 4 y el contaminante dominante coinciden con los umbrales de la NOM-172 definidos en el diseño",
                ],
                [
                    "Contrato de datos",
                    "Pruebas sobre el JSON publicado por el firmware y consumido por la app",
                    "Los 12 campos del payload se interpretan correctamente y las pruebas de TypeScript no reportan errores",
                ],
                [
                    "Latencia de extremo a extremo",
                    "Nodo publicando cada 2 segundos y app suscrita por WebSockets en red local",
                    "Actualización percibida del orden de 2 segundos en condiciones controladas de laboratorio",
                ],
                [
                    "Sincronización semáforo físico – web",
                    "Comparación del nivel general del firmware con el color y el estado mostrados en la app",
                    "Coincidencia de los cinco estados entre LCD/LEDs y la interfaz durante las pruebas",
                ],
                [
                    "Operación multinodo",
                    "Tres nodos simulados publicando tópicos <code>nodo1</code>, <code>nodo2</code> y <code>nodo3</code>",
                    "La app recibe y distingue los tres flujos; el Panel de Administración registra y activa cada estación",
                ],
                [
                    "Aprovisionamiento",
                    "Primer arranque sin credenciales guardadas",
                    "El portal cautivo <code>ESP32_Aire_Config</code> permite configurar la red y persistirla en NVS",
                ],
            ],
            [100, 210, 194],
        )
    )
    story.append(Spacer(1, 5))
    story.append(
        p(
            "También se verificó la <b>resiliencia básica</b>: el nodo mantiene la última lectura válida, evita "
            "publicar ceros cuando el sensor no entrega trama nueva y conserva el aviso físico si se interrumpe la "
            "conexión. La aplicación, por su parte, no presenta un estado verde falso cuando no hay datos.",
            cuerpo,
        )
    )

    story.append(p("3.2 Limitaciones metrológicas asumidas", h2_estilo))
    story.append(
        tabla(
            ["Limitación", "Implicación", "Cómo se comunica"],
            [
                [
                    "Sensores de bajo costo no certificados",
                    "No sustituyen instrumentación de referencia ni emiten dictámenes oficiales",
                    "El hardware se presenta como nodo demostrador intercambiable",
                ],
                [
                    "PMS5003 óptico frente a métodos gravimétricos",
                    "Puede desviarse por humedad, composición y distribución de tamaño de partícula",
                    "Se aplica compensación higroscópica y se declara como heurística, no calibración",
                ],
                [
                    "MQ-7 con aproximación lineal",
                    "El CO es una estimación; requiere calibración y co-locación para uso cuantitativo fino",
                    "Se reporta como indicador de tendencia y alerta, no como medición de referencia",
                ],
                [
                    "Sin co-locación con estación oficial",
                    "No es posible afirmar equivalencia ni trazabilidad metrológica",
                    "La comparación con SIMAJ se plantea como siguiente paso",
                ],
                [
                    "Broker público sin SLA",
                    "Adecuado para demostración, no para operación crítica",
                    "Se propone broker privado con TLS y autenticación en producción",
                ],
                [
                    "Gabinete y autonomía energética en desarrollo",
                    "El nodo actual opera en condiciones controladas o semiprotegidas",
                    "Se incluye gabinete IP65 y energía solar en la hoja de ruta",
                ],
            ],
            [128, 196, 180],
        )
    )
    story.append(Spacer(1, 5))
    story.append(
        KeepTogether(
            caja_nota(
                "ALCANCE DECLARADO",
                "AURA-172 es un <b>prototipo académico de arquitectura</b> que demuestra adquisición, clasificación "
                "normativa en el borde, transporte MQTT y traducción visual con nodos locales en tiempo real. No es un "
                "instrumento de vigilancia ambiental oficial, no certifica el cumplimiento de la NOM-172 y no pretende "
                "reemplazar al SIMAJ. Su contribución es metodológica y de comunicación: probar que una arquitectura "
                "abierta y de bajo costo puede complementar la observación oficial y acercar el dato a la decisión "
                "ciudadana.",
                colors.HexColor("#FEF3C7"),
                colors.HexColor("#FCD34D"),
                colors.HexColor("#92400E"),
            )
        )
    )
    story.append(Spacer(1, 8))

    # =====================================================================
    # 4. ESCALABILIDAD Y SIGUIENTES PASOS
    # =====================================================================
    story.append(p("4. Escalabilidad y siguientes pasos", h1_estilo))
    story.append(
        p(
            "La arquitectura actual ya permite escalar horizontalmente: cada nodo es independiente, publica en su "
            "propio tópico y se registra desde el Panel de Administración. Con el mismo código pueden operar 1, 10 "
            "o 20 nodos locales, siempre que compartan el contrato de datos. Lo que cambia al crecer no es la "
            "lógica, sino la operación: gestión de estaciones, monitoreo de disponibilidad y gobierno de datos.",
            cuerpo,
        )
    )
    story.append(p("4.1 Capacidades de escalamiento ya presentes", h2_estilo))
    story.append(
        v(
            "<b>Identidad por nodo:</b> <code>NODO_ID</code> configurable y tópico "
            "<code>colectivo/aire/{nodoId}</code>; sin colisiones entre placas."
        )
    )
    story.append(
        v(
            "<b>Registro centralizado:</b> el Panel de Administración da de alta, edita, activa o retira "
            "estaciones con su tópico, broker, zona y coordenadas."
        )
    )
    story.append(
        v(
            "<b>Selección automática de estación:</b> la app puede enlazarse a la estación más cercana por GPS o "
            "al nodo Centinela de mayor riesgo, sin menús saturados."
        )
    )
    story.append(
        v(
            "<b>Despliegue sin hardware:</b> el simulador multinodo publica el mismo JSON del firmware para validar "
            "la app y las demos sin depender de un dispositivo físico."
        )
    )
    story.append(Spacer(1, 5))

    story.append(p("4.2 Hoja de ruta (siguientes pasos, no estado actual)", h2_estilo))
    story.append(
        tabla(
            ["Eje de trabajo", "Descripción técnica", "Valor esperado"],
            [
                [
                    "Integración con datos abiertos del SIMAJ",
                    "Consumir la API pública del SIMAJ y mostrar la referencia oficial como contexto y contraste junto a la lectura local",
                    "Comparación transparente y validación externa; complementa la red oficial sin duplicar su función",
                ],
                [
                    "Enlace LoRaWAN / NB-IoT",
                    "Sustituir o complementar el Wi-Fi con un módulo LoRaWAN (915 MHz) o NB-IoT para nodos sin red local disponible",
                    "Despliegue en camellones, parques y zonas periféricas con mayor autonomía de cobertura",
                ],
                [
                    "Autonomía energética solar",
                    "Panel fotovoltaico, controlador MPPT y batería LiFePO4 para operación continua 24/7",
                    "Nodos autónomos sin dependencia de la red eléctrica del sitio",
                ],
                [
                    "Gabinete rugerizado IP65",
                    "Encapsulado con protección UV y ventilación forzada para el PMS5003",
                    "Operación estable ante polvo, lluvia y radiación solar directa",
                ],
                [
                    "Calibración y co-locación",
                    "Comparación prolongada contra instrumentación de referencia y ajuste de factores de corrección",
                    "Mayor confiabilidad cuantitativa y trazabilidad metodológica",
                ],
                [
                    "Endurecimiento de seguridad",
                    "Broker privado con TLS, autenticación por nodo y control de acceso a tópicos",
                    "Operación responsable fuera del entorno académico",
                ],
            ],
            [104, 234, 166],
            color_header=C_VERDE,
        )
    )
    story.append(Spacer(1, 6))
    story.append(
        p(
            "Estos ejes son <b>hoja de ruta</b>. El estado actual del proyecto es un sistema que ya opera de punta "
            "a punta con nodos locales en tiempo real; la integración directa con el SIMAJ y el despliegue LoRaWAN "
            "son las siguientes metas, no funcionalidades ya entregadas. Declararlo así protege la credibilidad "
            "técnica del trabajo y permite defender con claridad que el aporte central ya está demostrado: el flujo "
            "completo funciona.",
            cuerpo,
        )
    )

    story.append(Spacer(1, 6))
    story.append(
        KeepTogether(
            caja_nota(
                "CIERRE PARA EL PÓSTER: TRES IDEAS FUERZA",
                "<b>1. El valor es la arquitectura, no el sensor.</b> El nodo es un demostrador intercambiable; el "
                "aporte es el flujo adquisición → Edge → MQTT → traducción visual.<br/>"
                "<b>2. Sumamos, no competimos.</b> AURA-172 complementa al SIMAJ con resolución micro-local y lenguaje "
                "ciudadano, y puede integrar sus datos abiertos en la siguiente etapa.<br/>"
                "<b>3. Honestidad técnica.</b> Hoy funciona de punta a punta con nodos locales; la integración SIMAJ y "
                "LoRaWAN son hoja de ruta. No hay certificación metrológica ni sustituto de estaciones oficiales.",
                colors.HexColor("#EFF6FF"),
                colors.HexColor("#93C5FD"),
                C_AZUL,
            )
        )
    )
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=0.6, color=C_BORDE, spaceBefore=2, spaceAfter=6))
    story.append(
        p(
            "<b>Documentación de apoyo:</b> guía de demos en <code>docs/demos/GUIA_DEMOS.md</code>; firmware en "
            "<code>firmware/MiEntorno_ESP32/MiEntorno_ESP32.ino</code>; lógica normativa y cliente MQTT en "
            "<code>app/src/logica</code> y <code>app/src/servicios</code>.",
            nota_estilo,
        )
    )

    # =====================================================================
    # ANEXO: GUION DE DEFENSA
    # =====================================================================
    story.append(Spacer(1, 10))
    story.append(p("Anexo. Guion breve para defender el póster", h2_estilo))
    story.append(
        p(
            "Recorrido sugerido de 60 segundos para la evaluación, con el orden que mejor comunica el aporte:",
            cuerpo,
        )
    )
    guion = [
        ["10 s", "<b>Problema:</b> la calidad del aire varía en menos de 800 metros y el dato técnico no siempre se traduce en una decisión ciudadana."],
        ["20 s", "<b>Arquitectura:</b> nodo demostrador → filtrado y clasificación NOM-172 en el borde → MQTT → app con traducción visual. El sensor es intercambiable; el valor es el flujo."],
        ["15 s", "<b>Evidencia:</b> el sistema opera de punta a punta con nodos locales, publica cada 2 segundos y sincroniza semáforo físico y app en los cinco estados."],
        ["10 s", "<b>Límites:</b> no hay certificación metrológica; los sensores son de bajo costo y la compensación higroscópica es una heurística declarada."],
        ["5 s", "<b>Ruta:</b> integrar datos abiertos del SIMAJ, añadir LoRaWAN, energía solar, gabinete IP65 y calibración por co-locación."],
    ]
    t_guion = Table(
        [[Paragraph(c, tabla_celda) for c in fila] for fila in guion],
        colWidths=[42, 462],
    )
    t_guion.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#EFF6FF")),
                ("BOX", (0, 0), (-1, -1), 1, C_BORDE),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, C_BORDE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("PADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(t_guion)
    story.append(Spacer(1, 8))

    story.append(p("Preguntas esperadas del jurado y respuesta breve", h3_estilo))
    story.append(
        tabla(
            ["Pregunta probable", "Respuesta breve recomendada"],
            [
                [
                    "¿Por qué no usan sensores certificados?",
                    "Porque el objetivo es demostrar la arquitectura, no certificar un instrumento. El nodo es intercambiable y la ruta incluye calibración por co-locación.",
                ],
                [
                    "¿Esto sustituye al SIMAJ?",
                    "No. Lo complementa con resolución micro-local y traducción ciudadana; la referencia oficial se integra como contexto en la siguiente etapa.",
                ],
                [
                    "¿Qué tan preciso es el sistema?",
                    "Es un indicador de tendencia y alerta, no una medición de referencia. Se declaran las limitaciones y se evita cualquier afirmación de certificación.",
                ],
                [
                    "¿Qué falta para operar en producción?",
                    "Broker privado con TLS, gabinete IP65, autonomía solar, enlace LoRaWAN y un plan de calibración y mantenimiento.",
                ],
            ],
            [152, 352],
        )
    )

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF generado con éxito en: {ruta_salida}")


if __name__ == "__main__":
    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ruta_proyecto = os.path.join(raiz, "AURA-172_Documento_Explicativo_Completo.pdf")
    construir_pdf(ruta_proyecto)

    ruta_docs = os.path.join(raiz, "docs", "AURA-172_Documento_Explicativo_Completo.pdf")
    if os.path.isdir(os.path.dirname(ruta_docs)):
        construir_pdf(ruta_docs)
