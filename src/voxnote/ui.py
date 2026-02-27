"""Streamlit web UI for Voxnote - Light Professional Theme."""

import sys
from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING

import streamlit as st

if TYPE_CHECKING:
    from voxnote.config import Settings

# Set page config FIRST
st.set_page_config(
    page_title="Voxnote",
    page_icon="🎙️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# =============================================================================
# STYLES
# =============================================================================


def inject_custom_styles() -> None:
    """Inject custom CSS for light theme."""
    from voxnote.ui_styles_light import get_custom_css

    st.markdown(
        f"<style>{get_custom_css()}</style>",
        unsafe_allow_html=True,
    )


def render_header() -> None:
    """Render the app header with logo."""
    from voxnote.ui_styles_light import get_header_html

    st.markdown(
        get_header_html(
            title="Voxnote",
            subtitle="Transcripción inteligente con IA local",
        ),
        unsafe_allow_html=True,
    )


def render_sidebar_config(settings: "Settings") -> tuple:
    """Render sidebar configuration panels.

    Returns:
        Tuple of (whisper_model, llm_provider, diarize_enabled)
    """
    import os

    with st.sidebar:
        # Header
        st.markdown(
            """
            <div style="margin-bottom: 24px;">
                <h2 style="
                    font-family: 'Space Grotesk', sans-serif;
                    color: #B794F6;
                    font-size: 1.25rem;
                    margin-bottom: 4px;
                ">⚙️ Configuración</h2>
                <p style="color: #64748B; font-size: 0.875rem; margin: 0;">
                    Personaliza tu experiencia
                </p>
            </div>
        """,
            unsafe_allow_html=True,
        )

        # Whisper Config
        whisper_model = st.selectbox(
            "🎯 Modelo Whisper",
            ["tiny", "base", "small", "medium", "turbo", "large-v3"],
            index=4 if settings.whisper_model == "turbo" else 0,
            help="Mayor tamaño = mejor precisión pero más lento",
        )

        st.text_input(
            "🌐 Idioma",
            value=settings.language,
            placeholder="ej: es, en, fr (vacío = auto-detectar)",
            help="Código ISO del idioma (es, en, fr, etc.)",
        )

        st.markdown("<div style='height: 8px;'></div>", unsafe_allow_html=True)

        # LLM Provider
        llm_provider = st.selectbox(
            "🤖 Proveedor LLM",
            ["ollama", "openai", "kimi", "glm", "google"],
            index=["ollama", "openai", "kimi", "glm", "google"].index(settings.llm_provider),
        )

        # Provider-specific configuration
        if llm_provider == "openai":
            api_key = st.text_input(
                "🔑 OpenAI API Key",
                value=os.getenv("OPENAI_API_KEY", ""),
                type="password",
            )
            if api_key:
                os.environ["OPENAI_API_KEY"] = api_key

            model = st.selectbox(
                "📦 Modelo",
                ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"],
                index=0,
            )
            if model:
                os.environ["OPENAI_MODEL"] = model

        elif llm_provider == "kimi":
            api_key = st.text_input(
                "🔑 Kimi API Key",
                value=os.getenv("KIMI_API_KEY", ""),
                type="password",
            )
            if api_key:
                os.environ["KIMI_API_KEY"] = api_key

            model = st.selectbox(
                "📦 Modelo",
                ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
                index=0,
            )
            if model:
                os.environ["KIMI_MODEL"] = model

        elif llm_provider == "glm":
            api_key = st.text_input(
                "🔑 GLM API Key",
                value=os.getenv("GLM_API_KEY", ""),
                type="password",
            )
            if api_key:
                os.environ["GLM_API_KEY"] = api_key

            base_url = st.text_input(
                "🔗 Base URL",
                value=os.getenv("GLM_BASE_URL", "https://api.z.ai/api/coding/paas/v4"),
                help="Endpoint personalizado",
            )
            if base_url:
                os.environ["GLM_BASE_URL"] = base_url

            model = st.selectbox(
                "📦 Modelo",
                ["glm-5", "glm-4", "glm-4-plus", "glm-4-air", "glm-4.7"],
                index=0,
            )
            if model:
                os.environ["GLM_MODEL"] = model

        elif llm_provider == "google":
            api_key = st.text_input(
                "🔑 Google API Key",
                value=os.getenv("GOOGLE_API_KEY", ""),
                type="password",
            )
            if api_key:
                os.environ["GOOGLE_API_KEY"] = api_key

            model = st.selectbox(
                "📦 Modelo Gemini",
                ["gemini-2.0-flash-exp", "gemini-pro", "gemini-1.5-pro"],
                index=0,
            )
            if model:
                os.environ["GOOGLE_MODEL"] = model

        elif llm_provider == "ollama":
            st.markdown(
                f"""
                <div style="
                    margin-top: 12px;
                    padding: 16px;
                    background: rgba(52, 211, 153, 0.1);
                    border: 1px solid rgba(52, 211, 153, 0.3);
                    border-radius: 12px;
                    font-size: 0.875rem;
                ">
                    <div style="color: #059669; font-weight: 600; margin-bottom: 8px;">
                        🟢 Modo Local
                    </div>
                    <div style="color: #0F172A;">
                        <strong>Modelo:</strong> {settings.ollama_model}<br>
                        <strong>URL:</strong> <span style="color: #64748B; font-size: 0.8rem;">
                            {settings.ollama_url}
                        </span>
                    </div>
                </div>
            """,
                unsafe_allow_html=True,
            )

        st.markdown("<div style='height: 8px;'></div>", unsafe_allow_html=True)

        # Diarization
        diarize_enabled = st.checkbox(
            "👥 Identificar hablantes",
            value=settings.diarize,
            help="Requiere whisperx y HuggingFace token",
        )

        if diarize_enabled:
            hf_token = st.text_input(
                "🔑 HuggingFace Token",
                value=os.getenv("VOXNOTE_HF_TOKEN", ""),
                type="password",
            )
            if hf_token:
                os.environ["VOXNOTE_HF_TOKEN"] = hf_token

            col_min, col_max = st.columns(2)
            with col_min:
                min_speakers = st.number_input(
                    "👤 Mín",
                    min_value=1,
                    max_value=20,
                    value=settings.diarize_min_speakers,
                )
            with col_max:
                max_speakers = st.number_input(
                    "👥 Máx",
                    min_value=1,
                    max_value=20,
                    value=settings.diarize_max_speakers,
                )

            if min_speakers:
                os.environ["VOXNOTE_DIARIZE_MIN_SPEAKERS"] = str(min_speakers)
            if max_speakers:
                os.environ["VOXNOTE_DIARIZE_MAX_SPEAKERS"] = str(max_speakers)

        st.markdown("<div style='height: 16px;'></div>", unsafe_allow_html=True)

        # Output info
        st.markdown(
            f"""
            <div style="
                padding: 16px 20px;
                background: #F8FAFC;
                border: 1px solid rgba(203, 213, 225, 0.6);
                border-radius: 12px;
                font-size: 0.8rem;
                margin-top: 16px;
            ">
                <div style="color: #64748B; margin-bottom: 4px;">📁 Directorio de salida</div>
                <div style="
                    margin-top: 8px;
                    padding: 8px 12px;
                    background: #E2E8F0;
                    border: 1px solid #CBD5E1;
                    border-radius: 6px;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 0.8rem;
                    color: #1E293B;
                    font-weight: 600;
                ">
                    {settings.output_dir}
                </div>
            </div>
        """,
            unsafe_allow_html=True,
        )

    return whisper_model, llm_provider, diarize_enabled


def render_record_tab(
    whisper_model: str,
    llm_provider: str,
    diarize_enabled: bool,
    settings: "Settings",
) -> None:
    """Render the record audio tab."""
    from voxnote.pipeline.exporter import export_obsidian
    from voxnote.pipeline.insights import extract_insights
    from voxnote.pipeline.transcriber import transcribe
    from voxnote.ui_styles_light import get_step_html

    st.markdown(
        """
        <h2 style="margin-bottom: 8px; color: #0F172A;">🎙️ Grabar Reunión</h2>
        <p style="color: #64748B; margin-bottom: 24px;">
            Captura audio desde tu micrófono y conviértelo en notas estructuradas
        </p>
    """,
        unsafe_allow_html=True,
    )

    # Recorder zone
    st.markdown(
        """
        <div style="
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(203, 213, 225, 0.6);
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
            margin-bottom: 20px;
        ">
            <div style="margin-bottom: 16px;">
                <label style="
                    color: #0F172A;
                    font-weight: 600;
                    font-size: 1rem;
                    display: block;
                    margin-bottom: 4px;
                ">🎤 Captura de audio</label>
                <p style="
                    color: #64748B;
                    font-size: 0.85rem;
                    margin: 0;
                ">Haz clic en el botón para comenzar a grabar desde tu micrófono</p>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # Audio input
    audio_value = st.audio_input(
        label="🎙️ Grabador",
        label_visibility="collapsed",
    )

    # Process if audio captured
    if audio_value is not None:
        st.markdown("<div style='height: 24px;'></div>", unsafe_allow_html=True)

        # Audio player header
        st.markdown(
            """
            <div style="
                background: #FFFFFF;
                backdrop-filter: blur(20px);
                border: 1px solid rgba(203, 213, 225, 0.6);
                border-radius: 16px;
                padding: 20px;
                margin-bottom: 20px;
            ">
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 12px;
                ">
                    <div style="
                        width: 40px;
                        height: 40px;
                        background: linear-gradient(135deg, #34D399 0%, #22D3EE 100%);
                        border-radius: 10px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1.25rem;
                    ">✓</div>
                    <div>
                        <div style="color: #059669; font-weight: 600;">
                            Audio capturado correctamente
                        </div>
                        <div style="color: #64748B; font-size: 0.85rem;">
                            Reproduce para verificar
                        </div>
                    </div>
                </div>
            </div>
        """,
            unsafe_allow_html=True,
        )
        st.audio(audio_value)

        # Process button
        if st.button("🚀 Procesar Ahora", use_container_width=True):
            try:
                with st.spinner(""):
                    # Save audio
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    audio_path = Path("recordings") / f"{timestamp}.wav"
                    audio_path.parent.mkdir(exist_ok=True)
                    audio_bytes = audio_value.read()
                    audio_path.write_bytes(audio_bytes)

                    progress_container = st.container()

                    with progress_container:
                        # Step 1: Transcribe
                        st.markdown(
                            get_step_html(1, "Transcribiendo con Whisper...", "active"),
                            unsafe_allow_html=True,
                        )

                        result = transcribe(
                            str(audio_path),
                            model_name=whisper_model,
                            diarize=diarize_enabled,
                        )
                        display_text = (
                            result.to_speaker_text() if result.has_speakers else result.text
                        )

                        st.markdown(
                            get_step_html(
                                1,
                                f"✓ Transcripción: {len(result.text)} caracteres",
                                "completed",
                            ),
                            unsafe_allow_html=True,
                        )

                        if result.has_speakers:
                            speakers = {s.speaker for s in result.segments if s.speaker}
                            st.info(f"👥 {len(speakers)} hablantes detectados")

                    # Step 2: Extract insights
                    st.markdown(
                        get_step_html(2, "Extrayendo insights con IA...", "active"),
                        unsafe_allow_html=True,
                    )

                    insights = extract_insights(display_text, provider_name=llm_provider)

                    st.markdown(
                        get_step_html(2, "✓ Insights extraídos", "completed"),
                        unsafe_allow_html=True,
                    )

                    # Step 3: Export
                    st.markdown(
                        get_step_html(3, "Generando nota Obsidian...", "active"),
                        unsafe_allow_html=True,
                    )

                    note_path = export_obsidian(insights, result, str(audio_path))

                    st.markdown(
                        get_step_html(3, "✓ Nota guardada", "completed"),
                        unsafe_allow_html=True,
                    )

                # Success message
                st.markdown(
                    f"""
                    <div style="
                        padding: 20px 24px;
                        background: rgba(16, 185, 129, 0.1);
                        border: 1px solid rgba(16, 185, 129, 0.3);
                        border-radius: 16px;
                        margin: 24px 0;
                    ">
                        <div style="font-size: 1.25rem; font-weight: 600; color: #047857;">
                            ✅ ¡Proceso completado!
                        </div>
                        <div style="color: #64748B; margin-top: 8px;">
                            Nota guardada en: <code>{note_path}</code>
                        </div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )

                # Preview
                with st.expander("📄 Vista previa de la nota"):
                    st.markdown(note_path.read_text())

            except Exception as e:
                st.error(f"❌ Error al procesar el audio: {str(e)}")
                st.info("💡 Verifica que el modelo Whisper esté instalado correctamente.")


def render_process_tab(
    whisper_model: str,
    llm_provider: str,
    diarize_enabled: bool,
) -> None:
    """Render the process file tab."""
    from voxnote.pipeline.exporter import export_obsidian
    from voxnote.pipeline.insights import extract_insights
    from voxnote.pipeline.transcriber import transcribe
    from voxnote.ui_styles_light import get_step_html

    st.markdown(
        """
        <h2 style="margin-bottom: 8px; color: #0F172A;">📄 Procesar Archivo</h2>
        <p style="color: #64748B; margin-bottom: 24px;">
            Sube un archivo de audio existente para transcribir y analizar
        </p>
    """,
        unsafe_allow_html=True,
    )

    # Upload zone
    st.markdown(
        """
        <div style="margin-bottom: 16px;">
            <label style="
                color: #0F172A;
                font-weight: 500;
                font-size: 0.95rem;
                display: block;
                margin-bottom: 8px;
            ">📎 Archivo de audio</label>
            <p style="color: #64748B; font-size: 0.85rem; margin: 0;">
                Formatos soportados: WAV, MP3, M4A, OGG, FLAC
            </p>
        </div>
    """,
        unsafe_allow_html=True,
    )

    uploaded_file = st.file_uploader(
        label="file_uploader_hidden",
        label_visibility="collapsed",
        type=["wav", "mp3", "m4a", "ogg", "flac"],
    )

    if uploaded_file:
        st.markdown("<div style='height: 16px;'></div>", unsafe_allow_html=True)

        # Audio player header
        st.markdown(
            """
            <div style="
                background: #FFFFFF;
                backdrop-filter: blur(20px);
                border: 1px solid rgba(203, 213, 225, 0.6);
                border-radius: 16px;
                padding: 20px;
                margin-bottom: 20px;
            ">
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 12px;
                ">
                    <div style="
                        width: 40px;
                        height: 40px;
                        background: linear-gradient(135deg, #9F7AEA 0%, #22D3EE 100%);
                        border-radius: 10px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1.25rem;
                    ">🎵</div>
                    <div>
                        <div style="color: #0F172A; font-weight: 600;">
                            Archivo cargado
                        </div>
                        <div style="color: #64748B; font-size: 0.85rem;">
                            Reproduce para verificar
                        </div>
                    </div>
                </div>
            </div>
        """,
            unsafe_allow_html=True,
        )
        st.audio(uploaded_file)

        if st.button("🚀 Procesar Archivo", use_container_width=True):
            with st.spinner(""):
                # Save uploaded file
                audio_path = Path("recordings") / uploaded_file.name
                audio_path.parent.mkdir(exist_ok=True)
                audio_path.write_bytes(uploaded_file.read())

                progress_container = st.container()

                with progress_container:
                    # Transcribe
                    st.markdown(
                        get_step_html(1, "Transcribiendo...", "active"),
                        unsafe_allow_html=True,
                    )

                    result = transcribe(
                        str(audio_path),
                        model_name=whisper_model,
                        diarize=diarize_enabled,
                    )
                    display_text = result.to_speaker_text() if result.has_speakers else result.text

                    st.markdown(
                        get_step_html(1, f"✓ {len(result.text)} caracteres", "completed"),
                        unsafe_allow_html=True,
                    )

                    if result.has_speakers:
                        speakers = {s.speaker for s in result.segments if s.speaker}
                        st.info(f"👥 {len(speakers)} hablantes detectados")

                    # Show transcription
                    st.text_area(
                        label="📝 Transcripción completa",
                        value=display_text,
                        height=150,
                    )

                    # Extract insights
                    st.markdown(
                        get_step_html(2, "Extrayendo insights...", "active"),
                        unsafe_allow_html=True,
                    )

                    insights = extract_insights(display_text, provider_name=llm_provider)

                    st.markdown(
                        get_step_html(2, "✓ Completado", "completed"),
                        unsafe_allow_html=True,
                    )

                    st.json(insights)

                    # Export
                    st.markdown(
                        get_step_html(3, "Generando nota...", "active"),
                        unsafe_allow_html=True,
                    )

                    note_path = export_obsidian(insights, result, str(audio_path))

                    st.markdown(
                        get_step_html(3, f"✓ {note_path.name}", "completed"),
                        unsafe_allow_html=True,
                    )

                st.success(f"✅ Nota guardada: `{note_path}`")

                with st.expander("📄 Vista previa"):
                    st.markdown(note_path.read_text())


def render_history_tab(settings: "Settings") -> None:
    """Render the history tab."""
    st.markdown(
        """
        <h2 style="margin-bottom: 8px; color: #0F172A;">📊 Historial</h2>
        <p style="color: #64748B; margin-bottom: 24px;">
            Tus notas generadas recientemente
        </p>
    """,
        unsafe_allow_html=True,
    )

    output_dir = Path(settings.output_dir)

    if output_dir.exists():
        notes = sorted(
            output_dir.glob("*.md"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )

        if notes:
            # Stats
            col1, col2, col3 = st.columns(3)

            with col1:
                st.markdown(
                    f"""
                    <div style="
                        background: rgba(159, 122, 234, 0.1);
                        border: 1px solid rgba(159, 122, 234, 0.3);
                        border-radius: 16px;
                        padding: 20px;
                        text-align: center;
                    ">
                        <div style="
                            font-size: 2rem; font-weight: 700; color: #9F7AEA;
                            text-shadow: 0 0 20px rgba(159, 122, 234, 0.4);
                        ">{len(notes)}</div>
                        <div style="color: #64748B; font-size: 0.875rem;">
                            Notas totales
                        </div>
                    </div>
                """,
                    unsafe_allow_html=True,
                )

            with col2:
                today = datetime.now().date()
                today_count = sum(
                    1 for n in notes if datetime.fromtimestamp(n.stat().st_mtime).date() == today
                )
                st.markdown(
                    f"""
                    <div style="
                        background: rgba(34, 211, 238, 0.1);
                        border: 1px solid rgba(34, 211, 238, 0.3);
                        border-radius: 16px;
                        padding: 20px;
                        text-align: center;
                    ">
                        <div style="
                            font-size: 2rem; font-weight: 700; color: #22D3EE;
                            text-shadow: 0 0 20px rgba(34, 211, 238, 0.4);
                        ">{today_count}</div>
                        <div style="color: #64748B; font-size: 0.875rem;">Hoy</div>
                    </div>
                """,
                    unsafe_allow_html=True,
                )

            with col3:
                week_count = sum(
                    1
                    for n in notes
                    if (datetime.now() - datetime.fromtimestamp(n.stat().st_mtime)).days <= 7
                )
                st.markdown(
                    f"""
                    <div style="
                        background: rgba(251, 191, 36, 0.1);
                        border: 1px solid rgba(251, 191, 36, 0.3);
                        border-radius: 16px;
                        padding: 20px;
                        text-align: center;
                    ">
                        <div style="
                            font-size: 2rem; font-weight: 700; color: #FBBF24;
                            text-shadow: 0 0 20px rgba(251, 191, 36, 0.4);
                        ">{week_count}</div>
                        <div style="color: #64748B; font-size: 0.875rem;">
                            Esta semana
                        </div>
                    </div>
                """,
                    unsafe_allow_html=True,
                )

            st.markdown("<div style='height: 24px;'></div>", unsafe_allow_html=True)

            # Notes list
            for note in notes[:10]:
                mod_time = datetime.fromtimestamp(note.stat().st_mtime)
                with st.expander(f"📝 {note.name} — {mod_time.strftime('%d/%m/%Y %H:%M')}"):
                    content = note.read_text()
                    st.markdown(content)
        else:
            st.info("📭 No hay notas todavía. ¡Graba tu primera reunión!")
    else:
        st.info("📭 No hay notas todavía.")


def main() -> None:
    """Launch Streamlit UI."""
    import subprocess

    script_path = Path(__file__).resolve()
    subprocess.run([sys.executable, "-m", "streamlit", "run", str(script_path)])


# =============================================================================
# MAIN APP ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    from voxnote.config import settings

    # Inject custom styles
    inject_custom_styles()

    # Render header
    render_header()

    # Render sidebar and get config
    whisper_model, llm_provider, diarize_enabled = render_sidebar_config(settings)

    # Main tabs
    tab1, tab2, tab3 = st.tabs(["🎙️ Grabar", "📄 Procesar", "📊 Historial"])

    with tab1:
        render_record_tab(whisper_model, llm_provider, diarize_enabled, settings)

    with tab2:
        render_process_tab(whisper_model, llm_provider, diarize_enabled)

    with tab3:
        render_history_tab(settings)
