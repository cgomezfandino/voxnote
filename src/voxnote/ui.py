"""Streamlit web UI for Voxnote."""

import sys
from datetime import datetime
from pathlib import Path

import streamlit as st

# Set page config first
st.set_page_config(
    page_title="Voxnote",
    page_icon="🎙️",
    layout="wide",
)


def main() -> None:
    """Launch Streamlit UI."""
    # Import here to avoid loading streamlit when running CLI
    import subprocess

    # Run streamlit
    script_path = Path(__file__).resolve()
    subprocess.run([sys.executable, "-m", "streamlit", "run", str(script_path)])


if __name__ == "__main__":
    from voxnote.config import settings
    from voxnote.pipeline.exporter import export_obsidian
    from voxnote.pipeline.insights import extract_insights
    from voxnote.pipeline.recorder import record_audio
    from voxnote.pipeline.transcriber import transcribe

    st.title("🎙️ Voxnote")
    st.markdown("**Pipeline local**: Audio → Whisper → Ollama → Obsidian")

    # Sidebar config
    with st.sidebar:
        st.header("⚙️ Configuración")

        llm_provider = st.selectbox(
            "LLM Provider",
            ["ollama", "openai", "kimi", "glm", "google"],
            index=["ollama", "openai", "kimi", "glm", "google"].index(settings.llm_provider),
        )

        whisper_model = st.selectbox(
            "Modelo Whisper",
            ["tiny", "base", "small", "medium", "turbo", "large-v3"],
            index=4 if settings.whisper_model == "turbo" else 0,
        )

        language = st.text_input("Idioma (vacío = auto-detect)", value=settings.language)

        st.markdown("---")
        st.caption(f"Provider: `{llm_provider}`")
        st.caption(f"Output: `{settings.output_dir}`")

    # Main tabs
    tab1, tab2, tab3 = st.tabs(["🎙️ Grabar", "📄 Procesar archivo", "📊 Historial"])

    # Tab 1: Record
    with tab1:
        st.header("Grabar reunión")

        col1, col2 = st.columns([3, 1])

        with col1:
            audio_value = st.audio_input("🎤 Presiona para grabar")

        with col2:
            st.metric("Sample rate", f"{settings.sample_rate} Hz")

        if audio_value is not None:
            st.success("✅ Audio capturado")
            st.audio(audio_value)

            if st.button("🚀 Procesar ahora", type="primary", use_container_width=True):
                with st.spinner("Procesando..."):
                    # Save audio
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    audio_path = Path("recordings") / f"{timestamp}.wav"
                    audio_path.parent.mkdir(exist_ok=True)
                    audio_path.write_bytes(audio_value.read())

                    # Transcribe
                    with st.status("Transcribiendo con Whisper...", expanded=True):
                        transcript = transcribe(str(audio_path), model_name=whisper_model)
                        st.write(f"✓ {len(transcript)} caracteres")

                    # Extract insights
                    with st.status("Extrayendo insights con Ollama...", expanded=True):
                        insights = extract_insights(transcript, provider_name=llm_provider)
                        st.write(f"✓ Resumen: {insights.get('resumen', 'N/A')[:100]}...")

                    # Export
                    with st.status("Generando nota...", expanded=True):
                        note_path = export_obsidian(insights, transcript, str(audio_path))
                        st.write(f"✓ {note_path}")

                    st.success(f"✅ Listo! Nota guardada: `{note_path}`")

                    # Show preview
                    with st.expander("📄 Vista previa de la nota"):
                        st.markdown(note_path.read_text())

    # Tab 2: Process existing file
    with tab2:
        st.header("Procesar archivo de audio")

        uploaded_file = st.file_uploader(
            "Sube un archivo de audio",
            type=["wav", "mp3", "m4a", "ogg", "flac"],
        )

        if uploaded_file:
            st.audio(uploaded_file)

            if st.button("🚀 Procesar", type="primary", use_container_width=True):
                with st.spinner("Procesando..."):
                    # Save uploaded file
                    audio_path = Path("recordings") / uploaded_file.name
                    audio_path.parent.mkdir(exist_ok=True)
                    audio_path.write_bytes(uploaded_file.read())

                    # Process
                    with st.status("Transcribiendo...", expanded=True):
                        transcript = transcribe(str(audio_path), model_name=whisper_model)
                        st.write(f"✓ {len(transcript)} caracteres")
                        st.text_area("Transcripción", transcript, height=150)

                    with st.status("Extrayendo insights...", expanded=True):
                        insights = extract_insights(transcript, provider_name=llm_provider)
                        st.json(insights)

                    with st.status("Generando nota...", expanded=True):
                        note_path = export_obsidian(insights, transcript, str(audio_path))
                        st.write(f"✓ {note_path}")

                    st.success(f"✅ Nota guardada: `{note_path}`")

                    with st.expander("📄 Vista previa"):
                        st.markdown(note_path.read_text())

    # Tab 3: History
    with tab3:
        st.header("Notas generadas")

        output_dir = Path(settings.output_dir)
        if output_dir.exists():
            notes = sorted(output_dir.glob("*.md"), key=lambda p: p.stat().st_mtime, reverse=True)

            if notes:
                for note in notes[:10]:  # Show last 10
                    with st.expander(f"📝 {note.name}"):
                        content = note.read_text()
                        st.markdown(content)
            else:
                st.info("No hay notas todavía. ¡Graba tu primera reunión!")
        else:
            st.info("No hay notas todavía.")
