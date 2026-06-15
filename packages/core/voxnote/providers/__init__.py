"""LLM provider abstraction for insight extraction."""

from voxnote.providers.anthropic import AnthropicProvider
from voxnote.providers.base import LLMProvider
from voxnote.providers.google import GoogleProvider
from voxnote.providers.ollama import OllamaProvider
from voxnote.providers.openai import OpenAIProvider

__all__ = [
    "LLMProvider",
    "OllamaProvider",
    "OpenAIProvider",
    "GoogleProvider",
    "AnthropicProvider",
]


def get_provider(provider_name: str) -> LLMProvider:
    """Factory function to get the configured provider.

    Args:
        provider_name: One of 'ollama', 'openai', 'google', 'anthropic'

    Returns:
        An instance of the requested provider.

    Raises:
        ValueError: If provider_name is not recognized.
    """
    providers = {
        "ollama": OllamaProvider,
        "ollama-cloud": OllamaProvider,
        "openai": OpenAIProvider,
        "google": GoogleProvider,
        "anthropic": AnthropicProvider,
    }

    if provider_name not in providers:
        available = ", ".join(providers.keys())
        raise ValueError(f"Unknown provider '{provider_name}'. Available: {available}")

    return providers[provider_name]()
