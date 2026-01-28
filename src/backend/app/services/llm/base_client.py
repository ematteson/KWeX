"""Abstract base class for LLM clients."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass
class LLMResponse:
    """Response from an LLM call."""

    content: str
    model: str
    tokens_input: Optional[int] = None
    tokens_output: Optional[int] = None
    latency_ms: Optional[int] = None
    raw_response: Optional[Dict[str, Any]] = None


@dataclass
class LLMMessage:
    """A message in the conversation."""

    role: str  # "system", "user", "assistant"
    content: str


class BaseLLMClient(ABC):
    """Abstract base class for LLM clients.

    All LLM implementations (Azure Claude, Azure OpenAI, Mock) should
    inherit from this class and implement the required methods.
    """

    def __init__(
        self,
        model_name: str,
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ):
        self.model_name = model_name
        self.temperature = temperature
        self.max_tokens = max_tokens

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> LLMResponse:
        """Generate a response from the LLM.

        Args:
            prompt: The user prompt to send to the model.
            system_prompt: Optional system prompt for context.
            temperature: Override default temperature for this request.
            max_tokens: Override default max tokens for this request.

        Returns:
            LLMResponse with the generated content and metadata.

        Raises:
            LLMError: If there's an error generating the response.
        """
        pass

    @abstractmethod
    async def generate_chat(
        self,
        messages: List[LLMMessage],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> LLMResponse:
        """Generate a response from a chat conversation.

        Args:
            messages: List of messages in the conversation.
            temperature: Override default temperature for this request.
            max_tokens: Override default max tokens for this request.

        Returns:
            LLMResponse with the generated content and metadata.

        Raises:
            LLMError: If there's an error generating the response.
        """
        pass

    @abstractmethod
    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Generate a JSON response from the LLM.

        Args:
            prompt: The user prompt to send to the model.
            system_prompt: Optional system prompt for context.
            temperature: Override default temperature for this request.
            max_tokens: Override default max tokens for this request.

        Returns:
            Parsed JSON response as a dictionary.

        Raises:
            LLMError: If there's an error generating the response.
            LLMInvalidResponseError: If the response cannot be parsed as JSON.
        """
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check if the LLM client is available and configured.

        Returns:
            True if the client is ready to use, False otherwise.
        """
        pass

    def get_model_name(self) -> str:
        """Get the name of the model being used."""
        return self.model_name
