"""CSS Styles and design constants for Voxnote modern UI."""

# =============================================================================
# PALETA DE COLORES - Cyber-Audio Theme
# =============================================================================

COLORS = {
    # Fondos
    "bg_base": "#0B0B0F",
    "bg_elevated": "#12121A",
    "bg_card": "rgba(255, 255, 255, 0.03)",
    "bg_hover": "rgba(255, 255, 255, 0.06)",
    # Primarios - Violeta Eléctrico
    "primary": "#8B5CF6",
    "primary_light": "#A78BFA",
    "primary_dark": "#7C3AED",
    "primary_glow": "rgba(139, 92, 246, 0.4)",
    # Secundarios - Cian Neón
    "secondary": "#06B6D4",
    "secondary_light": "#67E8F9",
    "secondary_glow": "rgba(6, 182, 212, 0.4)",
    # Acentos
    "accent": "#F43F5E",  # Rosa Coral
    "accent_glow": "rgba(244, 63, 94, 0.5)",
    "accent_alt": "#F59E0B",  # Ámbar
    # Texto
    "text_primary": "#F8FAFC",
    "text_secondary": "#94A3B8",
    "text_muted": "#64748B",
    # Bordes
    "border_default": "rgba(255, 255, 255, 0.08)",
    "border_hover": "rgba(139, 92, 246, 0.3)",
    "border_focus": "#8B5CF6",
    # Estados
    "success": "#10B981",
    "warning": "#F59E0B",
    "error": "#EF4444",
    "info": "#3B82F6",
}

# =============================================================================
# GRADIENTES
# =============================================================================

GRADIENTS = {
    "primary": "linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)",
    "accent": "linear-gradient(135deg, #F43F5E 0%, #F59E0B 100%)",
    "dark": "linear-gradient(180deg, #12121A 0%, #0B0B0F 100%)",
    "glass": "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
    "hero": "radial-gradient(ellipse at 50% 0%, #1A103C 0%, #0B0B0F 50%)",
}

# =============================================================================
# TIPOGRAFÍA
# =============================================================================

FONTS = {
    "display": "'Space Grotesk', sans-serif",
    "heading": "'Plus Jakarta Sans', sans-serif",
    "body": "'Inter', sans-serif",
    "mono": "'JetBrains Mono', monospace",
}

# Google Fonts URL
GOOGLE_FONTS_URL = (
    "https://fonts.googleapis.com/css2?family="
    "Space+Grotesk:wght@500;600;700&family="
    "Plus+Jakarta+Sans:wght@400;500;600;700&family="
    "Inter:wght@300;400;500;600&family="
    "JetBrains+Mono:wght@400;500&display=swap"
)

# =============================================================================
# CSS COMPLETO
# =============================================================================


def get_custom_css() -> str:
    """Returns the complete custom CSS for Streamlit."""
    return f"""
    @import url('{GOOGLE_FONTS_URL}');
    
    /* ========================================
       BASE & RESET
       ======================================== */
    
    .stApp {{
        background: {COLORS["bg_base"]};
        background-image: {GRADIENTS["hero"]};
        background-attachment: fixed;
        font-family: {FONTS["body"]};
    }}
    
    /* Hide default Streamlit elements */
    #MainMenu {{visibility: hidden;}}
    footer {{visibility: hidden;}}
    header {{visibility: hidden;}}
    
    /* ========================================
       TIPOGRAFÍA
       ======================================== */
    
    h1, h2, h3, h4, h5, h6 {{
        font-family: {FONTS["heading"]} !important;
        color: {COLORS["text_primary"]} !important;
        font-weight: 600;
    }}
    
    .gradient-text {{
        background: {GRADIENTS["primary"]};
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }}
    
    .hero-title {{
        font-family: {FONTS["display"]} !important;
        font-size: 3rem !important;
        font-weight: 700 !important;
        background: {GRADIENTS["primary"]};
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        letter-spacing: -0.02em;
    }}
    
    .subtitle {{
        color: {COLORS["text_secondary"]};
        font-size: 1.1rem;
        font-weight: 400;
    }}
    
    /* ========================================
       GLASSMORPHISM CARDS
       ======================================== */
    
    .glass-card {{
        background: {COLORS["bg_card"]};
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid {COLORS["border_default"]};
        border-radius: 20px;
        padding: 24px;
        transition: all 0.3s ease;
    }}
    
    .glass-card:hover {{
        border-color: {COLORS["border_hover"]};
        box-shadow: 0 8px 32px rgba(139, 92, 246, 0.15);
        background: {COLORS["bg_hover"]};
    }}
    
    .glass-card-sm {{
        background: {COLORS["bg_card"]};
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid {COLORS["border_default"]};
        border-radius: 16px;
        padding: 16px;
        transition: all 0.3s ease;
    }}
    
    /* ========================================
       BOTONES
       ======================================== */
    
    .stButton > button {{
        background: {GRADIENTS["primary"]} !important;
        color: white !important;
        border: none !important;
        border-radius: 12px !important;
        padding: 14px 28px !important;
        font-family: {FONTS["heading"]} !important;
        font-weight: 600 !important;
        font-size: 1rem !important;
        transition: all 0.3s ease !important;
        box-shadow: 0 4px 20px {COLORS["primary_glow"]} !important;
    }}
    
    .stButton > button:hover {{
        transform: translateY(-2px) scale(1.02) !important;
        box-shadow: 0 8px 30px {COLORS["primary_glow"]} !important;
    }}
    
    .stButton > button:active {{
        transform: translateY(0) scale(0.98) !important;
    }}
    
    /* Botón de acción (Grabar) */
    .btn-action > button {{
        background: {COLORS["accent"]} !important;
        box-shadow: 0 4px 20px {COLORS["accent_glow"]} !important;
        font-size: 1.1rem !important;
        padding: 18px 36px !important;
    }}
    
    .btn-action > button:hover {{
        box-shadow: 0 8px 30px rgba(244, 63, 94, 0.6) !important;
        animation: pulse-glow 2s infinite !important;
    }}
    
    /* Botón secundario */
    .btn-secondary > button {{
        background: {COLORS["bg_card"]} !important;
        border: 1px solid {COLORS["border_default"]} !important;
        box-shadow: none !important;
    }}
    
    .btn-secondary > button:hover {{
        border-color: {COLORS["primary"]} !important;
        background: {COLORS["bg_hover"]} !important;
    }}
    
    /* ========================================
       SIDEBAR
       ======================================== */
    
    section[data-testid="stSidebar"] {{
        background: {COLORS["bg_elevated"]} !important;
        border-right: 1px solid {COLORS["border_default"]};
    }}
    
    section[data-testid="stSidebar"] .stMarkdown h2 {{
        font-family: {FONTS["display"]} !important;
        color: {COLORS["primary_light"]} !important;
        font-size: 1.25rem !important;
    }}
    
    section[data-testid="stSidebar"] .stMarkdown h3 {{
        font-size: 0.875rem !important;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: {COLORS["text_muted"]} !important;
    }}
    
    /* ========================================
       TABS
       ======================================== */
    
    .stTabs [data-baseweb="tab-list"] {{
        background: {COLORS["bg_card"]};
        border-radius: 16px;
        padding: 8px;
        border: 1px solid {COLORS["border_default"]};
        gap: 8px;
    }}
    
    .stTabs [data-baseweb="tab"] {{
        color: {COLORS["text_secondary"]};
        font-family: {FONTS["heading"]};
        font-weight: 500;
        padding: 12px 24px;
        border-radius: 12px;
        transition: all 0.2s ease;
    }}
    
    .stTabs [data-baseweb="tab"]:hover {{
        color: {COLORS["text_primary"]};
        background: {COLORS["bg_hover"]};
    }}
    
    .stTabs [aria-selected="true"] {{
        background: {GRADIENTS["primary"]} !important;
        color: white !important;
        font-weight: 600;
    }}
    
    /* ========================================
       INPUTS & SELECTS
       ======================================== */
    
    .stTextInput > div > div > input,
    .stSelectbox > div > div > div,
    .stNumberInput > div > div > input {{
        background: rgba(0, 0, 0, 0.3) !important;
        border: 1px solid {COLORS["border_default"]} !important;
        border-radius: 12px !important;
        color: {COLORS["text_primary"]} !important;
        font-family: {FONTS["body"]} !important;
        padding: 12px 16px !important;
        transition: all 0.2s ease !important;
    }}
    
    .stTextInput > div > div > input:focus,
    .stSelectbox > div > div > div:focus {{
        border-color: {COLORS["primary"]} !important;
        box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2) !important;
    }}
    
    .stSelectbox > div > div {{
        background: rgba(0, 0, 0, 0.3) !important;
    }}
    
    /* ========================================
       EXPANDER & CONTAINERS
       ======================================== */
    
    .streamlit-expanderHeader {{
        background: {COLORS["bg_card"]} !important;
        border: 1px solid {COLORS["border_default"]} !important;
        border-radius: 12px !important;
        font-family: {FONTS["heading"]} !important;
        font-weight: 500 !important;
        color: {COLORS["text_primary"]} !important;
    }}
    
    .streamlit-expanderContent {{
        background: {COLORS["bg_elevated"]} !important;
        border: 1px solid {COLORS["border_default"]};
        border-top: none;
        border-radius: 0 0 12px 12px;
    }}
    
    /* ========================================
       BADGES & TAGS
       ======================================== */
    
    .badge {{
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }}
    
    .badge-primary {{
        background: {GRADIENTS["primary"]};
        color: white;
    }}
    
    .badge-accent {{
        background: {COLORS["accent"]};
        color: white;
    }}
    
    .badge-success {{
        background: {COLORS["success"]};
        color: white;
    }}
    
    /* ========================================
       ANIMACIONES
       ======================================== */
    
    @keyframes pulse-glow {{
        0%, 100% {{ box-shadow: 0 0 20px rgba(244, 63, 94, 0.5); }}
        50% {{ box-shadow: 0 0 40px rgba(244, 63, 94, 0.8); }}
    }}
    
    @keyframes gradient-shift {{
        0% {{ background-position: 0% 50%; }}
        50% {{ background-position: 100% 50%; }}
        100% {{ background-position: 0% 50%; }}
    }}
    
    @keyframes float {{
        0%, 100% {{ transform: translateY(0); }}
        50% {{ transform: translateY(-5px); }}
    }}
    
    @keyframes shimmer {{
        0% {{ background-position: -200% 0; }}
        100% {{ background-position: 200% 0; }}
    }}
    
    .animate-pulse {{
        animation: pulse-glow 2s infinite;
    }}
    
    .animate-float {{
        animation: float 3s ease-in-out infinite;
    }}
    
    /* ========================================
       COMPONENTES ESPECIALES
       ======================================== */
    
    /* Audio recorder area */
    .recorder-zone {{
        background: {GRADIENTS["glass"]};
        border: 2px dashed {COLORS["border_default"]};
        border-radius: 24px;
        padding: 48px;
        text-align: center;
        transition: all 0.3s ease;
    }}
    
    .recorder-zone:hover {{
        border-color: {COLORS["primary"]};
        background: rgba(139, 92, 246, 0.05);
    }}
    
    .recorder-zone.recording {{
        border-color: {COLORS["accent"]};
        animation: pulse-glow 2s infinite;
    }}
    
    /* Status indicators */
    .status-dot {{
        width: 8px;
        height: 8px;
        border-radius: 50%;
        display: inline-block;
        margin-right: 8px;
    }}
    
    .status-online {{
        background: {COLORS["success"]};
        box-shadow: 0 0 10px {COLORS["success"]};
    }}
    
    /* Metric cards */
    .metric-card {{
        background: {COLORS["bg_card"]};
        border: 1px solid {COLORS["border_default"]};
        border-radius: 16px;
        padding: 20px;
        text-align: center;
    }}
    
    .metric-value {{
        font-family: {FONTS["display"]};
        font-size: 2rem;
        font-weight: 700;
        background: {GRADIENTS["primary"]};
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }}
    
    .metric-label {{
        color: {COLORS["text_secondary"]};
        font-size: 0.875rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }}
    
    /* Processing steps */
    .step-card {{
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px 20px;
        background: {COLORS["bg_card"]};
        border: 1px solid {COLORS["border_default"]};
        border-radius: 12px;
        margin-bottom: 12px;
    }}
    
    .step-number {{
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: {GRADIENTS["primary"]};
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 0.875rem;
    }}
    
    /* ========================================
       SCROLLBAR
       ======================================== */
    
    ::-webkit-scrollbar {{
        width: 8px;
        height: 8px;
    }}
    
    ::-webkit-scrollbar-track {{
        background: {COLORS["bg_elevated"]};
    }}
    
    ::-webkit-scrollbar-thumb {{
        background: {COLORS["primary"]};
        border-radius: 4px;
    }}
    
    ::-webkit-scrollbar-thumb:hover {{
        background: {COLORS["primary_light"]};
    }}
    
    /* ========================================
       UTILITIES
       ======================================== */
    
    .text-gradient {{
        background: {GRADIENTS["primary"]};
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }}
    
    .text-accent {{
        color: {COLORS["accent"]};
    }}
    
    .text-muted {{
        color: {COLORS["text_muted"]};
    }}
    
    .divider {{
        height: 1px;
        background: {GRADIENTS["primary"]};
        margin: 24px 0;
        opacity: 0.3;
    }}
    
    .icon-lg {{
        font-size: 2rem;
    }}
    
    .icon-xl {{
        font-size: 3rem;
    }}
"""


def get_header_html(title: str = "Voxnote", subtitle: str = "") -> str:
    """Returns the HTML for the app header with logo."""
    return f"""
    <div style="
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 8px;
    ">
        <div style="
            width: 48px;
            height: 48px;
            background: {GRADIENTS["primary"]};
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            box-shadow: 0 4px 20px {COLORS["primary_glow"]};
        ">
            🎙️
        </div>
        <div>
            <h1 style="
                font-family: {FONTS["display"]};
                font-size: 2.5rem;
                font-weight: 700;
                margin: 0;
                background: {GRADIENTS["primary"]};
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                letter-spacing: -0.02em;
            ">{title}</h1>
            {f'<p style="margin: 4px 0 0 0; color: {COLORS["text_secondary"]};'
            f' font-size: 1rem;">{subtitle}</p>' if subtitle else ""}
        </div>
    </div>
    <div style="
        height: 2px;
        background: {GRADIENTS["primary"]};
        margin: 20px 0 32px 0;
        border-radius: 2px;
        opacity: 0.5;
    "></div>
    """


def get_badge_html(text: str, variant: str = "primary") -> str:
    """Returns HTML for a badge."""
    gradients = {
        "primary": GRADIENTS["primary"],
        "accent": COLORS["accent"],
        "success": COLORS["success"],
    }
    bg = gradients.get(variant, GRADIENTS["primary"])
    return f"""
    <span style="
        display: inline-flex;
        align-items: center;
        padding: 6px 14px;
        background: {bg};
        color: white;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    ">{text}</span>
    """


def get_metric_card_html(value: str, label: str) -> str:
    """Returns HTML for a metric card."""
    return f"""
    <div style="
        background: {COLORS["bg_card"]};
        backdrop-filter: blur(20px);
        border: 1px solid {COLORS["border_default"]};
        border-radius: 16px;
        padding: 20px;
        text-align: center;
        transition: all 0.3s ease;
    " class="glass-card-hover">
        <div style="
            font-family: {FONTS["display"]};
            font-size: 1.75rem;
            font-weight: 700;
            background: {GRADIENTS["primary"]};
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 4px;
        ">{value}</div>
        <div style="
            color: {COLORS["text_secondary"]};
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 500;
        ">{label}</div>
    </div>
    """


def get_step_html(step_number: int, title: str, status: str = "pending") -> str:
    """Returns HTML for a processing step."""
    status_colors = {
        "pending": COLORS["text_muted"],
        "active": COLORS["primary"],
        "completed": COLORS["success"],
    }
    color = status_colors.get(status, COLORS["text_muted"])
    return f"""
    <div style="
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px 20px;
        background: {COLORS["bg_card"]};
        border: 1px solid {color if status != "pending" else COLORS["border_default"]};
        border-radius: 12px;
        margin-bottom: 12px;
        transition: all 0.3s ease;
    ">
        <div style="
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: {color};
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 0.875rem;
            flex-shrink: 0;
        ">{step_number}</div>
        <div style="
            color: {COLORS["text_primary"] if status != "pending" else COLORS["text_muted"]};
            font-weight: 500;
        ">{title}</div>
    </div>
    """
