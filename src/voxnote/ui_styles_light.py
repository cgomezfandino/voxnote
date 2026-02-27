"""CSS Styles for Voxnote LIGHT theme - Professional & Clean."""

# =============================================================================
# PALETA DE COLORES - Tema Claro Profesional
# =============================================================================

COLORS = {
    # Fondos - CLAROS
    "bg_base": "#F8FAFC",  # Gris muy claro
    "bg_elevated": "#FFFFFF",  # Blanco puro
    "bg_card": "rgba(255, 255, 255, 0.9)",
    "bg_card_hover": "#FFFFFF",
    "bg_input": "#FFFFFF",
    # Primarios - Púrpura vibrante
    "primary": "#7C3AED",
    "primary_light": "#A78BFA",
    "primary_lighter": "#DDD6FE",
    "primary_dark": "#5B21B6",
    "primary_glow": "rgba(124, 58, 237, 0.2)",
    # Secundarios - Cian
    "secondary": "#0891B2",
    "secondary_light": "#22D3EE",
    "secondary_lighter": "#CFFAFE",
    "secondary_glow": "rgba(8, 145, 178, 0.2)",
    # Acentos
    "accent": "#E11D48",
    "accent_light": "#FB7185",
    "accent_lighter": "#FFE4E6",
    "accent_glow": "rgba(225, 29, 72, 0.2)",
    "accent_alt": "#F59E0B",
    # Texto - OSCURO sobre fondo claro
    "text_primary": "#0F172A",  # Casi negro
    "text_secondary": "#475569",  # Gris oscuro
    "text_muted": "#64748B",  # Gris medio
    # Bordes
    "border_default": "rgba(203, 213, 225, 0.6)",
    "border_hover": "rgba(124, 58, 237, 0.4)",
    "border_focus": "#7C3AED",
    # Estados
    "success": "#10B981",
    "success_light": "#D1FAE5",
    "success_bg": "rgba(16, 185, 129, 0.1)",
    "warning": "#F59E0B",
    "warning_light": "#FEF3C7",
    "warning_bg": "rgba(245, 158, 11, 0.1)",
    "error": "#EF4444",
    "error_light": "#FEE2E2",
    "error_bg": "rgba(239, 68, 68, 0.1)",
    "info": "#3B82F6",
    "info_light": "#DBEAFE",
    "info_bg": "rgba(59, 130, 246, 0.1)",
}

# =============================================================================
# GRADIENTES
# =============================================================================

GRADIENTS = {
    "primary": "linear-gradient(135deg, #7C3AED 0%, #0891B2 100%)",
    "accent": "linear-gradient(135deg, #E11D48 0%, #F59E0B 100%)",
    "hero": "linear-gradient(180deg, #F1F5F9 0%, #F8FAFC 100%)",
    "glass": "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)",
}

# =============================================================================
# CSS COMPLETO - TEMA CLARO
# =============================================================================


def get_custom_css() -> str:
    """Returns CSS for light theme."""
    c = COLORS
    g = GRADIENTS

    return f"""
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');

    /* ========================================
       BASE & RESET
       ======================================== */

    /* Force light backgrounds everywhere */
    html, body {{
        background: {c["bg_base"]} !important;
    }}

    .stApp {{
        background: {c["bg_base"]};
        background-image: {g["hero"]};
        background-attachment: fixed;
        font-family: 'Inter', sans-serif;
        color: {c["text_primary"]};
    }}

    /* Ocultar solo menú de Streamlit y footer, NO el header del sidebar */
    #MainMenu {{visibility: hidden;}}
    footer {{visibility: hidden;}}

    /* Mantener visible el botón de collapse del sidebar */
    [data-testid="collapsedControl"] {{
        visibility: visible !important;
        display: flex !important;
        color: {c["text_primary"]} !important;
        background: {c["bg_elevated"]} !important;
        border-radius: 8px !important;
        padding: 8px !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
    }}

    [data-testid="collapsedControl"] svg {{
        color: {c["text_primary"]} !important;
        fill: {c["text_primary"]} !important;
    }}

    /* Estilos para el header toolbar de Streamlit */
    header[data-testid="stHeader"] {{
        background: transparent !important;
    }}

    /* Botón de abrir sidebar cuando está colapsado */
    button[kind="header"] {{
        color: {c["text_primary"]} !important;
        background: {c["bg_elevated"]} !important;
    }}

    button[kind="header"] svg {{
        color: {c["text_primary"]} !important;
    }}
    
    /* ========================================
       TIPOGRAFÍA
       ======================================== */
    
    h1, h2, h3, h4, h5, h6 {{
        font-family: 'Plus Jakarta Sans', sans-serif !important;
        color: {c["text_primary"]} !important;
        font-weight: 600;
    }}
    
    /* ========================================
       LABELS - AHORA VISIBLES
       ======================================== */
    
    .stTextInput label,
    .stSelectbox label,
    .stNumberInput label,
    .stFileUploader label,
    .stCheckbox label {{
        color: {c["text_primary"]} !important;
        font-family: 'Plus Jakarta Sans', sans-serif !important;
        font-weight: 500 !important;
        font-size: 0.9rem !important;
    }}
    
    /* ========================================
       INPUTS CLAROS
       ======================================== */
    
    .stTextInput input,
    .stNumberInput input {{
        background: {c["bg_input"]} !important;
        border: 1px solid {c["border_default"]} !important;
        border-radius: 12px !important;
        color: {c["text_primary"]} !important;
        padding: 12px 16px !important;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255,255,255,0.8) !important;
    }}

    /* Number inputs más compactos en sidebar */
    section[data-testid="stSidebar"] .stNumberInput input {{
        padding: 8px 10px !important;
        text-align: center !important;
        min-width: 0 !important;
        width: 56px !important;
    }}

    section[data-testid="stSidebar"] .stNumberInput {{
        max-width: 100% !important;
    }}

    section[data-testid="stSidebar"] .stNumberInput > div {{
        flex-wrap: nowrap !important;
    }}

    /* Botones +/- más compactos */
    section[data-testid="stSidebar"] .stNumberInput button {{
        padding: 6px 10px !important;
        min-width: 32px !important;
    }}
    
    .stTextInput input:hover,
    .stNumberInput input:hover {{
        border-color: {c["border_hover"]} !important;
        background: #F8FAFC !important;
    }}
    
    .stTextInput input:focus,
    .stNumberInput input:focus {{
        border-color: {c["primary"]} !important;
        box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1) !important;
    }}
    
    /* ========================================
       AUDIO INPUT - MEJORADO
       ======================================== */

    .stAudioInput {{
        background: transparent !important;
        border: none !important;
        padding: 0 !important;
    }}

    .stAudioInput > div {{
        background: {c["bg_card"]} !important;
        border: 1px solid {c["border_default"]} !important;
        border-radius: 16px !important;
        padding: 16px !important;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03) !important;
        transition: all 0.3s ease !important;
    }}

    .stAudioInput > div:hover {{
        border-color: {c["border_hover"]} !important;
        box-shadow: 0 4px 20px rgba(124, 58, 237, 0.1) !important;
    }}

    /* Botón de grabación */
    .stAudioInput button {{
        background: {g["primary"]} !important;
        color: white !important;
        border: none !important;
        border-radius: 12px !important;
        padding: 12px 24px !important;
        font-weight: 600 !important;
        transition: all 0.3s ease !important;
        box-shadow: 0 4px 15px {c["primary_glow"]} !important;
    }}

    .stAudioInput button:hover {{
        transform: translateY(-2px) !important;
        box-shadow: 0 6px 20px {c["primary_glow"]} !important;
    }}

    /* Timer y controles */
    .stAudioInput div[data-testid="stAudioInputTimer"],
    .stAudioInput time,
    .stAudioInput [role="timer"] {{
        color: {c["text_muted"]} !important;
        font-weight: 500 !important;
        font-family: 'JetBrains Mono', monospace !important;
        background: transparent !important;
        border: none !important;
    }}

    /* Waveform time code */
    [data-testid="stAudioInputWaveformTimeCode"] {{
        background: #F1F5F9 !important;
        color: {c["text_muted"]} !important;
        border-radius: 6px !important;
        padding: 2px 8px !important;
        border: none !important;
    }}

    /* Texto dentro del audio input */
    .stAudioInput span,
    .stAudioInput div {{
        color: {c["text_muted"]} !important;
    }}

    /* Audio input button must keep white text */
    .stAudioInput button {{
        color: white !important;
    }}
    
    .stTextInput input::placeholder {{
        color: {c["text_muted"]} !important;
    }}
    
    /* ========================================
       SELECTBOX CLARO
       ======================================== */
    
    .stSelectbox > div > div {{
        background: {c["bg_input"]} !important;
        border: 1px solid {c["border_default"]} !important;
        border-radius: 12px !important;
        color: {c["text_primary"]} !important;
    }}

    /* Asegurar que el texto del selectbox sea visible */
    .stSelectbox [data-baseweb="select"] span,
    .stSelectbox [data-baseweb="select"] div,
    .stSelectbox [data-baseweb="select"] {{
        color: {c["text_primary"]} !important;
    }}

    /* SVG del selectbox (flecha dropdown solamente) */
    .stSelectbox [data-baseweb="select"] svg {{
        fill: {c["text_secondary"]} !important;
    }}

    /* Excluir tooltip icons dentro de selectbox */
    .stSelectbox .stTooltipIcon svg {{
        fill: none !important;
    }}
    
    .stSelectbox [data-baseweb="popover"] {{
        background: #FFFFFF !important;
        border: 1px solid {c["border_default"]} !important;
        border-radius: 12px !important;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1) !important;
    }}
    
    .stSelectbox [data-baseweb="menu"] li {{
        color: {c["text_secondary"]} !important;
    }}
    
    .stSelectbox [data-baseweb="menu"] li:hover {{
        background: {c["primary_lighter"]} !important;
        color: {c["primary_dark"]} !important;
    }}
    
    .stSelectbox [data-baseweb="menu"] li[aria-selected="true"] {{
        background: {g["primary"]} !important;
        color: white !important;
    }}
    
    /* ========================================
       AUDIO PLAYER - CLARO
       ======================================== */

    .stAudio {{
        background: {c["bg_card"]} !important;
        border: 1px solid {c["border_default"]} !important;
        border-radius: 16px !important;
        padding: 16px !important;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04) !important;
        margin-top: -12px !important;
        overflow: hidden !important;
    }}

    .stAudio audio {{
        width: 100% !important;
        border-radius: 8px !important;
    }}

    /* Expander inside note preview - better markdown rendering */
    .stExpander {{
        border: 1px solid {c["border_default"]} !important;
        border-radius: 16px !important;
        overflow: hidden !important;
    }}

    .stExpander [data-testid="stExpanderDetails"] {{
        background: {c["bg_elevated"]} !important;
        padding: 24px !important;
    }}
    
    /* ========================================
       CARDS CLAROS
       ======================================== */
    
    .glass-card {{
        background: {c["bg_card"]};
        backdrop-filter: blur(20px);
        border: 1px solid {c["border_default"]};
        border-radius: 20px;
        padding: 24px;
        transition: all 0.3s ease;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    }}
    
    .glass-card:hover {{
        border-color: {c["border_hover"]};
        box-shadow: 0 8px 30px rgba(124, 58, 237, 0.1);
        transform: translateY(-2px);
    }}
    
    .glass-card-sm {{
        background: {c["bg_card"]};
        backdrop-filter: blur(20px);
        border: 1px solid {c["border_default"]};
        border-radius: 16px;
        padding: 20px;
        transition: all 0.3s ease;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
    }}
    
    /* ========================================
       BOTONES CLAROS
       ======================================== */
    
    .stButton > button {{
        background: {g["primary"]} !important;
        color: white !important;
        border: none !important;
        border-radius: 12px !important;
        padding: 14px 28px !important;
        font-weight: 600 !important;
        transition: all 0.3s ease !important;
        box-shadow: 0 4px 15px {c["primary_glow"]} !important;
    }}
    
    .stButton > button:hover {{
        transform: translateY(-2px) scale(1.02) !important;
        box-shadow: 0 8px 25px {c["primary_glow"]} !important;
    }}
    
    /* Botón de acción */
    .btn-action > button {{
        background: {g["accent"]} !important;
        box-shadow: 0 4px 15px {c["accent_glow"]} !important;
    }}
    
    .btn-action > button:hover {{
        box-shadow: 0 8px 25px {c["accent_glow"]} !important;
    }}
    
    /* ========================================
       SIDEBAR CLARO
       ======================================== */
    
    section[data-testid="stSidebar"] {{
        background: linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%) !important;
        border-right: 1px solid {c["border_default"]};
        box-shadow: 4px 0 24px rgba(0, 0, 0, 0.03);
    }}
    
    section[data-testid="stSidebar"] .stMarkdown h2 {{
        color: {c["primary"]} !important;
    }}

    /* Botón de colapsar sidebar */
    section[data-testid="stSidebar"] [data-testid="baseButton-header"] {{
        color: {c["text_primary"]} !important;
    }}

    section[data-testid="stSidebar"] button[kind="header"] {{
        color: {c["text_primary"]} !important;
    }}

    /* ========================================
       CHECKBOXES VISIBLES
       ======================================== */

    .stCheckbox {{
        color: {c["text_primary"]} !important;
    }}

    .stCheckbox label {{
        color: {c["text_primary"]} !important;
    }}

    .stCheckbox label span[class*="st-"] {{
        background-color: {c["bg_input"]} !important;
        border-color: {c["border_default"]} !important;
    }}

    .stCheckbox input[type="checkbox"] {{
        accent-color: {c["primary"]} !important;
    }}

    .stCheckbox input[type="checkbox"]:checked + span[class*="st-"] {{
        background-color: {c["primary"]} !important;
        border-color: {c["primary"]} !important;
    }}

    /* ========================================
       TOOLTIP / HELP ICONS
       ======================================== */

    .stTooltipIcon,
    .stTooltipIcon * {{
        color: {c["text_muted"]} !important;
    }}

    .stTooltipIcon svg,
    .stSelectbox .stTooltipIcon svg,
    .stCheckbox .stTooltipIcon svg,
    .stTextInput .stTooltipIcon svg,
    section[data-testid="stSidebar"] .stTooltipIcon svg {{
        fill: none !important;
        stroke: {c["primary_light"]} !important;
        color: {c["primary_light"]} !important;
    }}

    .stTooltipIcon svg circle,
    .stTooltipIcon svg path,
    .stTooltipIcon svg line,
    .stSelectbox .stTooltipIcon svg circle,
    .stSelectbox .stTooltipIcon svg path,
    .stSelectbox .stTooltipIcon svg line {{
        fill: none !important;
        stroke: {c["primary_light"]} !important;
    }}

    .stTooltipIcon button {{
        color: {c["text_muted"]} !important;
    }}

    /* ========================================
       ELEMENT TOOLBAR - LIGHT
       ======================================== */

    [data-testid="stElementToolbarButtonContainer"] {{
        background: {c["bg_elevated"]} !important;
        border: 1px solid {c["border_default"]} !important;
        border-radius: 6px !important;
    }}

    [data-testid="stElementToolbarButtonContainer"] button {{
        color: {c["text_muted"]} !important;
    }}

    [data-testid="stElementToolbarButtonContainer"] svg {{
        color: {c["text_muted"]} !important;
        fill: {c["text_muted"]} !important;
    }}

    /* ========================================
       FILE UPLOADER MEJORADO
       ======================================== */

    .stFileUploader {{
        background: transparent !important;
    }}

    .stFileUploader > div {{
        background: {c["bg_input"]} !important;
        border: 2px dashed {c["border_default"]} !important;
        border-radius: 12px !important;
        padding: 24px !important;
        transition: all 0.3s ease !important;
    }}

    .stFileUploader > div:hover {{
        border-color: {c["border_hover"]} !important;
        background: #F8FAFC !important;
    }}

    .stFileUploader label {{
        color: {c["text_primary"]} !important;
    }}

    /* ========================================
       TABS CLAROS
       ======================================== */
    
    .stTabs [data-baseweb="tab-list"] {{
        background: #FFFFFF;
        border-radius: 16px;
        padding: 8px;
        border: 1px solid {c["border_default"]};
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }}
    
    .stTabs [data-baseweb="tab"] {{
        color: {c["text_muted"]};
        font-weight: 500;
        padding: 12px 24px;
        border-radius: 12px;
        transition: all 0.2s ease;
    }}
    
    .stTabs [data-baseweb="tab"]:hover {{
        color: {c["text_primary"]};
        background: #F1F5F9;
    }}
    
    .stTabs [aria-selected="true"] {{
        background: {g["primary"]} !important;
        color: white !important;
        box-shadow: 0 4px 15px rgba(124, 58, 237, 0.25);
    }}
    
    /* ========================================
       ALERTAS CLARAS
       ======================================== */
    
    .stAlert[data-testid="stAlert"][kind="info"] {{
        background: {c["info_bg"]} !important;
        border-color: {c["info"]}40 !important;
        color: {c["info"]} !important;
    }}
    
    .stAlert[data-testid="stAlert"][kind="success"] {{
        background: {c["success_bg"]} !important;
        border-color: {c["success"]}40 !important;
        color: #047857 !important;
    }}
    
    .stAlert[data-testid="stAlert"][kind="warning"] {{
        background: {c["warning_bg"]} !important;
        border-color: {c["warning"]}40 !important;
        color: #B45309 !important;
    }}
    
    /* ========================================
       SCROLLBAR CLARA
       ======================================== */
    
    ::-webkit-scrollbar {{
        width: 10px;
    }}
    
    ::-webkit-scrollbar-track {{
        background: #F1F5F9;
        border-radius: 5px;
    }}
    
    ::-webkit-scrollbar-thumb {{
        background: linear-gradient(180deg, {c["primary"]}, {c["secondary"]});
        border-radius: 5px;
        border: 2px solid #F1F5F9;
    }}
    
    /* ========================================
       UTILIDADES
       ======================================== */
    
    .text-gradient {{
        background: {g["primary"]};
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }}
    
    .divider {{
        height: 2px;
        background: {g["primary"]};
        margin: 24px 0;
        opacity: 0.5;
        border-radius: 2px;
    }}
    """


def get_header_html(title: str = "Voxnote", subtitle: str = "") -> str:
    """Returns HTML header for light theme."""
    c = COLORS

    subtitle_html = (
        f'<p style="margin: 8px 0 0 0; color: {c["text_muted"]}; font-size: 1.1rem;">{subtitle}</p>'
        if subtitle
        else ""
    )

    return f"""
    <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 8px;">
        <div style="
            width: 56px;
            height: 56px;
            background: linear-gradient(135deg, {c["primary"]} 0%, {c["secondary"]} 100%);
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.75rem;
            box-shadow: 0 8px 30px {c["primary_glow"]};
            flex-shrink: 0;
        ">
            🎙️
        </div>
        <div>
            <h1 style="
                font-family: 'Space Grotesk', sans-serif;
                font-size: 2.75rem;
                font-weight: 700;
                margin: 0;
                background: linear-gradient(135deg, {c["primary"]} 0%, {c["secondary"]} 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                letter-spacing: -0.02em;
            ">{title}</h1>
            {subtitle_html}
        </div>
    </div>
    <div class="divider"></div>
    """


def get_step_html(step_number: int, title: str, status: str = "pending") -> str:
    """Returns HTML for step in light theme."""
    c = COLORS

    if status == "completed":
        bg = c["success"]
        text = "#FFFFFF"
        border = c["success"]
        title_color = c["text_primary"]
    elif status == "active":
        bg = c["primary"]
        text = "#FFFFFF"
        border = c["primary"]
        title_color = c["text_primary"]
    else:
        bg = "#F1F5F9"
        text = c["text_muted"]
        border = c["border_default"]
        title_color = c["text_muted"]

    content = "✓" if status == "completed" else str(step_number)

    return f"""
    <div style="
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px 20px;
        background: {c["bg_card"]};
        border: 1px solid {border};
        border-radius: 12px;
        margin-bottom: 12px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    ">
        <div style="
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: {bg};
            color: {text};
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 0.875rem;
            flex-shrink: 0;
        ">{content}</div>
        <div style="color: {title_color}; font-weight: 500;">{title}</div>
    </div>
    """
