from backend.services.providers.base_provider import BaseProvider
from backend.services.providers.openai_provider import OpenAIProvider
from backend.services.providers.anthropic_provider import AnthropicProvider
from backend.services.providers.gemini_provider import GeminiProvider
from backend.services.providers.glm_provider import GLMProvider

_REGISTRY: dict[str, type[BaseProvider]] = {
    "openai": OpenAIProvider,
    "anthropic": AnthropicProvider,
    "gemini": GeminiProvider,
    "glm": GLMProvider,
}


def get_provider(provider_name: str, api_key: str) -> BaseProvider:
    cls = _REGISTRY.get(provider_name)
    if cls is None:
        raise ValueError(f"Unknown provider: {provider_name}")
    return cls(api_key)
