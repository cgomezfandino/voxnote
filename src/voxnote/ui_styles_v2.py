"""CSS Styles and design constants for Voxnote modern UI - Enhanced Version."""

# =============================================================================
# PALETA DE COLORES - Cyber-Audio Theme v2 (Mejorado para contraste)
# =============================================================================

COLORS = {
    # Fondos
    "bg_base": "#0D0D12",
    "bg_elevated": "#16161F",
    "bg_card": "rgba(255, 255, 255, 0.04)",
    "bg_card_hover": "rgba(255, 255, 255, 0.08)",
    "bg_input": "rgba(0, 0, 0, 0.4)",
    # Primarios
    "primary": "#9F7AEA",
    "primary_light": "#B794F6",
    "primary_dark": "#805AD5",
    "primary_glow": "rgba(159, 122, 234, 0.5)",
    # Secundarios
    "secondary": "#22D3EE",
    "secondary_light": "#67E8F9",
    "secondary_glow": "rgba(34, 211, 238, 0.5)",
    # Acentos
    "accent": "#FB7185",
    "accent_glow": "rgba(251, 113, 133, 0.5)",
    "accent_alt": "#FBBF24",
    # Texto - MEJORADO para contraste
    "text_primary": "#FAFAFA",
    "text_secondary": "#E2E8F0",
    "text_muted": "#94A3B8",
    "text_dark": "#1E293B",
    # Bordes
    "border_default": "rgba(255, 255, 255, 0.12)",
    "border_hover": "rgba(159, 122, 234, 0.5)",
    "border_focus": "#9F7AEA",
    # Estados
    "success": "#34D399",
    "warning": "#FBBF24",
    "error": "#F87171",
    "info": "#60A5FA",
}

# =============================================================================
# GRADIENTES MEJORADOS
# =============================================================================

GRADIENTS = {
    "primary": "linear-gradient(135deg, #9F7AEA 0%, #22D3EE 100%)",
    "accent": "linear-gradient(135deg, #FB7185 0%, #FBBF24 100%)",
    "dark": "linear-gradient(180deg, #16161F 0%, #0D0D12 100%)",
    "glass": (
        "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, "
        "rgba(255,255,255,0.03) 100%)"
    ),
    "hero": (
        "radial-gradient(ellipse at 50% 0%, rgba(159, 122, 234, 0.15) 0%, "
        "#0D0D12 50%)"
    ),
}

# =============================================================================
# TIPOGRAFIA
# =============================================================================

FONTS = {
    "display": "'Space Grotesk', sans-serif",
    "heading": "'Plus Jakarta Sans', sans-serif",
    "body": "'Inter', sans-serif",
    "mono": "'JetBrains Mono', monospace",
}

GOOGLE_FONTS_URL = (
    "https://fonts.googleapis.com/css2?family="
    "Space+Grotesk:wght@500;600;700&family="
    "Plus+Jakarta+Sans:wght@400;500;600;700&family="
    "Inter:wght@300;400;500;600&family="
    "JetBrains+Mono:wght@400;500&display=swap"
)


# =============================================================================
# CSS COMPLETO MEJORADO
# =============================================================================

def get_custom_css() -> str:
    """Returns the complete custom CSS for Streamlit with better contrast."""
    c = COLORS
    g = GRADIENTS
    f = FONTS

    return f"""
    @import url('{GOOGLE_FONTS_URL}');

    /* ========================================
       BASE & RESET
       ======================================== */

    .stApp {{
        background: {c["bg_base"]};
        background-image: {g["hero"]};
        background-attachment: fixed;
        font-family: {f["body"]};
        color: {c["text_primary"]};
    }}

    #MainMenu {{visibility: hidden;}}
    footer {{visibility: hidden;}}
    header {{visibility: hidden;}}

    /* ========================================
       TIPOGRAFIA GLOBAL
       ======================================== */

    html, body, [class*="css"] {{
        font-family: {f["body"]};
    }}

    h1, h2, h3, h4, h5, h6 {{
        font-family: {f["heading"]} !important;
        color: {c["text_primary"]} !important;
        font-weight: 600;
        letter-spacing: -0.01em;
    }}

    p, span, div {{
        color: {c["text_secondary"]};
    }}

    /* ========================================
       LABELS Y TEXTOS DE FORMULARIO
       ======================================== */

    .stTextInput label,
    .stSelectbox label,
    .stNumberInput label,
    .stFileUploader label,
    .stCheckbox label,
    .stRadio label,
    .stTextArea label {{
        color: {c["text_primary"]} !important;
        font-family: {f["heading"]} !important;
        font-weight: 500 !important;
        font-size: 0.9rem !important;
        margin-bottom: 8px !important;
    }}

    /* Caption y help text */
    .stTextInput .css-1ahnt2p,
    .stSelectbox .css-1ahnt2p,
    .stMarkdown small,
    .css-1kyxreq,
    [data-testid="stWidgetLabel"] .css-1dj3z7n {{
        color: {c["text_muted"]} !important;
        font-size: 0.8rem !important;
    }}

    /* ========================================
       INPUTS Y SELECTS
       ======================================== */

    .stTextInput > div,
    .stSelectbox > div,
    .stNumberInput > div {{
        background: transparent !important;
    }}

    .stTextInput input,
    .stNumberInput input {{
        background: {c["bg_input"]} !important;
        border: 1px solid {c["border_default"]} !important;
        border-radius: 12px !important;
        color: {c["text_primary"]} !important;
        font-family: {f["body"]} !important;
        font-size: 0.95rem !important;
        padding: 12px 16px !important;
        transition: all 0.2s ease !important;
    }}

    .stTextInput input:hover,
    .stNumberInput input:hover {{
        border-color: {c["border_hover"]} !important;
        background: rgba(0, 0, 0, 0.5) !important;
    }}

    .stTextInput input:focus,
    .stNumberInput input:focus {{
        border-color: {c["primary"]} !important;
        box-shadow: 0 0 0 3px rgba(159, 122, 234, 0.2) !important;
        background: rgba(0, 0, 0, 0.6) !important;
    }}

    .stTextInput input::placeholder {{
        color: {c["text_muted"]} !important;
        opacity: 0.7 !important;
    }}

    /* ========================================
       SELECTBOX / DROPDOWN
       ======================================== */

    .stSelectbox > div > div {{
        background: {c["bg_input"]} !important;
        border: 1px solid {c["border_default"]} !important;
        border-radius: 12px !important;
    }}

    .stSelectbox [data-baseweb="select"] > div {{
        background: transparent !important;
        color: {c["text_primary"]} !important;
        font-family: {f["body"]} !important;
    }}

    .stSelectbox [data-baseweb="select"] span {{
        color: {c["text_primary"]} !important;
    }}

    .stSelectbox [data-baseweb="select"] svg {{
        fill: {c["primary"]} !important;
    }}

    .stSelectbox [data-baseweb="popover"] {{
        background: {c["bg_elevated"]} !important;
        border: 1px solid {c["border_default"]} !important;
        border-radius: 12px !important;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4) !important;
    }}

    .stSelectbox [data-baseweb="menu"] {{
        background: transparent !important;
    }}

    .stSelectbox [data-baseweb="menu"] li {{
        color: {c["text_secondary"]} !important;
        background: transparent !important;
    }}

    .stSelectbox [data-baseweb="menu"] li:hover {{
        background: {c["bg_card"]} !important;
        color: {c["text_primary"]} !important;
    }}

    .stSelectbox [data-baseweb="menu"] li[aria-selected="true"] {{
        background: {g["primary"]} !important;
        color: white !important;
    }}

    /* ========================================
       AUDIO PLAYER
       ======================================== */

    .stAudio {{
        background: {c["bg_card"]};
        border: 1px solid {c["border_default"]};
        border-radius: 16px;
        padding: 16px;
        margin: 12px 0;
    }}

    .stAudio audio {{
        width: 100%;
        height: 48px;
        border-radius: 8px;
        background: {c["bg_input"]};
    }}

    .stAudio audio::-webkit-media-controls-panel {{
        background: {c["bg_elevated"]};
        border-radius: 8px;
    }}

    .stAudio audio::-webkit-media-controls-current-time-display,
    .stAudio audio::-webkit-media-controls-time-remaining-display {{
        color: {c["text_secondary"]};
        font-family: {f["mono"]};
        font-size: 0.8rem;
    }}

    /* ========================================
       GLASS CARDS
       ======================================== */

    .glass-card {{
        background: {g["glass"]};
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid {c["border_default"]};
        border-radius: 20px;
        padding: 24px;
        transition: all 0.3s ease;
    }}

    .glass-card:hover {{
        border-color: {c["border_hover"]};
        box-shadow: 0 8px 32px rgba(159, 122, 234, 0.15);
        background: {c["bg_card_hover"]};
    }}

    .glass-card-sm {{
        background: {g["glass"]};
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid {c["border_default"]};
        border-radius: 16px;
        padding: 20px;
        transition: all 0.3s ease;
    }}

    .glass-card-sm:hover {{
        border-color: {c["border_hover"]};
        background: {c["bg_card_hover"]};
    }}

    /* ========================================
       BOTONES
       ======================================== */

    .stButton > button {{
        background: {g["primary"]} !important;
        color: white !important;
        border: none !important;
        border-radius: 12px !important;
        padding: 14px 28px !important;
        font-family: {f["heading"]} !important;
        font-weight: 600 !important;
        font-size: 1rem !important;
        transition: all 0.3s ease !important;
        box-shadow: 0 4px 20px {c["primary_glow"]} !important;
        text-shadow: 0 1px 2px rgba(0,0,0,0.2) !important;
    }}

    .stButton > button:hover {{
        transform: translateY(-2px) scale(1.02) !important;
        box-shadow: 0 8px 30px {c["primary_glow"]} !important;
    }}

    .stButton > button:active {{
        transform: translateY(0) scale(0.98) !important;
    }}

    .btn-action > button {{
        background: linear-gradient(135deg, #FB7185 0%, #F472B6 100%) !important;
        box-shadow: 0 4px 20px {c["accent_glow"]} !important;
        font-size: 1.1rem !important;
        padding: 18px 36px !important;
    }}

    .btn-action > button:hover {{
        box-shadow: 0 8px 30px rgba(251, 113, 133, 0.6) !important;
    }}

    /* ========================================
       SIDEBAR
       ======================================== */

    section[data-testid="stSidebar"] {{
        background: linear-gradient(
            180deg, {c["bg_elevated"]} 0%, {c["bg_base"]} 100%
        ) !important;
        border-right: 1px solid {c["border_default"]};
    }}

    section[data-testid="stSidebar"] .stMarkdown h2 {{
        font-family: {f["display"]} !important;
        color: {c["primary_light"]} !important;
        font-size: 1.25rem !important;
    }}

    .stCheckbox > div {{
        background: {c["bg_card"]};
        border: 1px solid {c["border_default"]};
        border-radius: 12px;
        padding: 12px 16px;
        transition: all 0.2s ease;
    }}

    .stCheckbox > div:hover {{
        border-color: {c["border_hover"]};
    }}

    .stCheckbox [data-baseweb="checkbox"] {{
        border-color: {c["primary"]} !important;
    }}

    .stCheckbox [data-baseweb="checkbox"][aria-checked="true"] {{
        background: {g["primary"]} !important;
    }}

    /* ========================================
       TABS
       ======================================== */

    .stTabs [data-baseweb="tab-list"] {{
        background: {c["bg_card"]};
        backdrop-filter: blur(10px);
        border-radius: 16px;
        padding: 8px;
        border: 1px solid {c["border_default"]};
        gap: 8px;
    }}

    .stTabs [data-baseweb="tab"] {{
        color: {c["text_muted"]};
        font-family: {f["heading"]};
        font-weight: 500;
        font-size: 0.95rem;
        padding: 12px 24px;
        border-radius: 12px;
        transition: all 0.2s ease;
        border: 1px solid transparent;
    }}

    .stTabs [data-baseweb="tab"]:hover {{
        color: {c["text_primary"]};
        background: {c["bg_card_hover"]};
        border-color: {c["border_default"]};
    }}

    .stTabs [aria-selected="true"] {{
        background: {g["primary"]} !important;
        color: white !important;
        font-weight: 600;
        border-color: transparent;
        box-shadow: 0 4px 15px rgba(159, 122, 234, 0.3);
    }}

    /* ========================================
       EXPANDER
       ======================================== */

    .streamlit-expanderHeader {{
        background: {c["bg_card"]} !important;
        border: 1px solid {c["border_default"]} !important;
        border-radius: 12px !important;
        font-family: {f["heading"]} !important;
        font-weight: 500 !important;
        color: {c["text_primary"]} !important;
        padding: 16px 20px !important;
    }}

    .streamlit-expanderHeader:hover {{
        border-color: {c["border_hover"]} !important;
        background: {c["bg_card_hover"]} !important;
    }}

    .streamlit-expanderContent {{
        background: {c["bg_elevated"]} !important;
        border: 1px solid {c["border_default"]};
        border-top: none;
        border-radius: 0 0 12px 12px;
        padding: 20px !important;
    }}

    /* ========================================
       SPINNER
       ======================================== */

    .stSpinner > div {{
        border-color: {c["primary"]} !important;
        border-top-color: transparent !important;
    }}

    /* ========================================
       SCROLLBAR
       ======================================== */

    ::-webkit-scrollbar {{
        width: 10px;
        height: 10px;
    }}

    ::-webkit-scrollbar-track {{
        background: {c["bg_elevated"]};
        border-radius: 5px;
    }}

    ::-webkit-scrollbar-thumb {{
        background: linear-gradient(180deg, {c["primary"]}, {c["secondary"]});
        border-radius: 5px;
        border: 2px solid {c["bg_elevated"]};
    }}

    ::-webkit-scrollbar-thumb:hover {{
        background: linear-gradient(
            180deg, {c["primary_light"]}, {c["secondary_light"]}
        );
    }}

    /* ========================================
       ALERTAS
       ======================================== */

    .stAlert {{
        border-radius: 12px;
        border: 1px solid;
    }}

    .stAlert [data-baseweb="notification"] {{
        border-radius: 12px;
    }}

    .stAlert[data-testid="stAlert"][kind="info"] {{
        background: rgba(96, 165, 250, 0.1) !important;
        border-color: rgba(96, 165, 250, 0.3) !important;
    }}

    .stAlert[data-testid="stAlert"][kind="success"] {{
        background: rgba(52, 211, 153, 0.1) !important;
        border-color: rgba(52, 211, 153, 0.3) !important;
    }}

    .stAlert[data-testid="stAlert"][kind="warning"] {{
        background: rgba(251, 191, 36, 0.1) !important;
        border-color: rgba(251, 191, 36, 0.3) !important;
    }}

    .stAlert[data-testid="stAlert"][kind="error"] {{
        background: rgba(248, 113, 113, 0.1) !important;
        border-color: rgba(248, 113, 113, 0.3) !important;
    }}

    /* ========================================
       FILE UPLOADER
       ======================================== */

    .stFileUploader {{
        background: {c["bg_card"]};
        border: 2px dashed {c["border_default"]};
        border-radius: 16px;
        padding: 24px;
        transition: all 0.3s ease;
    }}

    .stFileUploader:hover {{
        border-color: {c["primary"]};
        background: rgba(159, 122, 234, 0.05);
    }}

    .stFileUploader [data-testid="stFileUploaderDropzone"] {{
        background: transparent !important;
        border: none !important;
    }}

    .stFileUploader [data-testid="stFileUploaderDropzone"] div {{
        color: {c["text_secondary"]} !important;
    }}

    /* ========================================
       ANIMACIONES
       ======================================== */

    @keyframes pulse-glow {{
        0%, 100% {{ box-shadow: 0 0 20px rgba(251, 113, 133, 0.4); }}
        50% {{ box-shadow: 0 0 40px rgba(251, 113, 133, 0.7); }}
    }}

    @keyframes shimmer {{
        0% {{ background-position: -200% 0; }}
        100% {{ background-position: 200% 0; }}
    }}

    .animate-pulse {{
        animation: pulse-glow 2s infinite;
    }}

    /* ========================================
       UTILIDADES
       ======================================== */

    .text-gradient {{
        background: {g["primary"]};
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }}

    .text-primary {{ color: {c["text_primary"]} !important; }}
    .text-secondary {{ color: {c["text_secondary"]} !important; }}
    .text-muted {{ color: {c["text_muted"]} !important; }}
    .text-accent {{ color: {c["accent"]} !important; }}

    .divider {{
        height: 1px;
        background: {g["primary"]};
        margin: 24px 0;
        opacity: 0.4;
    }}

    .css-1aehpvj,
    .css-1dp5vir,
    .css-1544g2n {{
        display: none !important;
    }}
    """


def get_header_html(title: str = "Voxnote", subtitle: str = "") -> str:
    """Returns the HTML for the app header with logo."""
    c = COLORS
    f = FONTS

    subtitle_html = ""
    if subtitle:
        subtitle_html = (
            f'<p style="margin: 8px 0 0 0; color: {c["text_secondary"]}; '
            f'font-size: 1.1rem; font-weight: 400;">{subtitle}</p>'
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
                font-family: {f["display"]};
                font-size: 2.75rem;
                font-weight: 700;
                margin: 0;
                background: linear-gradient(135deg, {c["primary"]} 0%, {c["secondary"]} 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                letter-spacing: -0.02em;
                line-height: 1.1;
            ">{title}</h1>
            {subtitle_html}
        </div>
    </div>
    <div style="
        height: 2px;
        background: linear-gradient(90deg, {c["primary"]} 0%, {c["secondary"]} 50%,
            transparent 100%);
        margin: 24px 0 32px 0;
        border-radius: 2px;
        opacity: 0.6;
    "></div>
    """


def get_badge_html(text: str, variant: str = "primary") -> str:
    """Returns HTML for a badge."""
    c = COLORS

    variants = {
        "primary": (f"linear-gradient(135deg, {c['primary']} 0%, {c['secondary']} 100%)", "white"),
        "accent": (c["accent"], "white"),
        "success": (c["success"], "white"),
        "warning": (c["accent_alt"], c["bg_base"]),
    }

    bg, text_color = variants.get(variant, variants["primary"])

    return f"""
    <span style="
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        background: {bg};
        color: {text_color};
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    ">{text}</span>
    """


def get_metric_card_html(value: str, label: str, color: str = "primary") -> str:
    """Returns HTML for a metric card."""
    c = COLORS
    f = FONTS

    colors = {
        "primary": c["primary"],
        "secondary": c["secondary"],
        "accent": c["accent"],
        "accent_alt": c["accent_alt"],
    }
    value_color = colors.get(color, c["primary"])

    return f"""
    <div style="
        background: {c["bg_card"]};
        backdrop-filter: blur(20px);
        border: 1px solid {c["border_default"]};
        border-radius: 16px;
        padding: 20px;
        text-align: center;
        transition: all 0.3s ease;
    ">
        <div style="
            font-family: {f["display"]};
            font-size: 1.75rem;
            font-weight: 700;
            color: {value_color};
            margin-bottom: 4px;
            text-shadow: 0 0 20px {value_color}40;
        ">{value}</div>
        <div style="
            color: {c["text_muted"]};
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 500;
        ">{label}</div>
    </div>
    """


def get_step_html(step_number: int, title: str, status: str = "pending") -> str:
    """Returns HTML for a processing step."""
    c = COLORS

    status_config = {
        "pending": (c["text_muted"], c["border_default"]),
        "active": (c["primary"], c["primary"]),
        "completed": (c["success"], c["success"]),
    }

    text_color, border_color = status_config.get(status, status_config["pending"])

    return f"""
    <div style="
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px 20px;
        background: {c["bg_card"]};
        border: 1px solid {border_color if status != "pending" else c["border_default"]};
        border-radius: 12px;
        margin-bottom: 12px;
        transition: all 0.3s ease;
    ">
        <div style="
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: {border_color};
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 0.875rem;
            flex-shrink: 0;
            box-shadow: 0 0 15px {border_color}40;
        ">{step_number}</div>
        <div style="
            color: {c["text_primary"] if status != "pending" else c["text_muted"]};
            font-weight: 500;
        ">{title}</div>
    </div>
    """


def get_success_banner_html(message: str, submessage: str = "") -> str:
    """Returns HTML for a success banner."""
    c = COLORS

    submessage_html = ""
    if submessage:
        submessage_html = (
            f'<div style="color: {c["text_muted"]}; margin-top: 8px;">'
            f"{submessage}</div>"
        )

    return f"""
    <div style="
        padding: 20px 24px;
        background: linear-gradient(135deg, rgba(52, 211, 153, 0.1) 0%,
            rgba(34, 211, 238, 0.1) 100%);
        border: 1px solid rgba(52, 211, 153, 0.3);
        border-radius: 16px;
        margin: 24px 0;
    ">
        <div style="font-size: 1.25rem; font-weight: 600; color: {c["success"]};
            margin-bottom: 4px;">
            ✅ {message}
        </div>
        {submessage_html}
    </div>
    """
