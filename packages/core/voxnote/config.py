"""Application configuration via environment variables and defaults."""

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {
        "env_prefix": "VOXNOTE_",
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }

    # Whisper
    whisper_model: str = Field(
        default="turbo",
        description="Whisper model: tiny|base|small|medium|large-v3|turbo",
    )
    language: str = Field(default="es", description="Audio language (ISO 639-1) or empty for auto-detect")

    # LLM Provider
    llm_provider: str = Field(
        default="ollama",
        description="LLM provider: ollama|openai|kimi|glm|google",
    )

    # Ollama (when provider=ollama)
    ollama_model: str = Field(default="llama3.1:8b", description="Ollama model for insight extraction")
    ollama_url: str = Field(
        default="http://localhost:11434",
        description="Ollama server base URL",
    )
    ollama_timeout: int = Field(default=120, description="Ollama request timeout in seconds")

    # Speaker Diarization (whisperX)
    diarize: bool = Field(default=False, description="Enable speaker diarization (requires whisperx + HF token)")
    hf_token: str = Field(default="", description="HuggingFace token for pyannote diarization models")
    diarize_min_speakers: int = Field(default=2, description="Minimum expected speakers")
    diarize_max_speakers: int = Field(default=5, description="Maximum expected speakers")
    compute_type: str = Field(default="int8", description="Compute type for whisperX (int8|float16|float32)")

    # Recording
    sample_rate: int = Field(default=16_000, description="Audio sample rate in Hz")

    # Output
    output_dir: Path = Field(default=Path("output"), description="Directory for generated meeting notes")


settings = Settings()
