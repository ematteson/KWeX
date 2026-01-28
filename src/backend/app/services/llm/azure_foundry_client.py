"""Azure Foundry LLM client implementation for Claude and GPT models."""

import json
import time
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import get_settings
from app.services.llm.base_client import BaseLLMClient, LLMMessage, LLMResponse
from app.services.llm.exceptions import (
    LLMAuthenticationError,
    LLMConnectionError,
    LLMContentFilterError,
    LLMContextLengthError,
    LLMInvalidResponseError,
    LLMRateLimitError,
    LLMTimeoutError,
)


class AzureClaudeClient(BaseLLMClient):
    """Azure Foundry client for Claude (Anthropic) models."""

    def __init__(
        self,
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ):
        settings = get_settings()
        super().__init__(
            model_name=settings.azure_anthropic_deployment,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        self.endpoint = settings.azure_anthropic_endpoint
        self.api_key = settings.azure_anthropic_api_key
        self.deployment = settings.azure_anthropic_deployment

    def is_available(self) -> bool:
        """Check if the Azure Claude client is configured."""
        return bool(self.endpoint and self.api_key)

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> LLMResponse:
        """Generate a response from Claude via Azure Foundry."""
        messages = [LLMMessage(role="user", content=prompt)]
        if system_prompt:
            messages.insert(0, LLMMessage(role="system", content=system_prompt))

        return await self.generate_chat(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    async def generate_chat(
        self,
        messages: List[LLMMessage],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> LLMResponse:
        """Generate a response from Claude chat conversation."""
        if not self.is_available():
            raise LLMConnectionError(
                "Azure Claude client is not configured", model=self.model_name
            )

        start_time = time.time()

        # Build Anthropic Messages API request
        system_content = None
        chat_messages = []

        for msg in messages:
            if msg.role == "system":
                system_content = msg.content
            else:
                chat_messages.append({"role": msg.role, "content": msg.content})

        # Anthropic Messages API format
        request_body: Dict[str, Any] = {
            "model": self.deployment,
            "messages": chat_messages,
            "max_tokens": max_tokens or self.max_tokens,
            "temperature": temperature or self.temperature,
        }

        # System prompt is a separate field in Anthropic API
        if system_content:
            request_body["system"] = system_content

        # Azure Foundry uses /anthropic/v1/messages endpoint
        url = f"{self.endpoint}/anthropic/v1/messages"

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    url,
                    json=request_body,
                    headers={
                        "x-api-key": self.api_key,  # Azure uses x-api-key header
                        "Content-Type": "application/json",
                        "anthropic-version": "2023-06-01",
                    },
                )

                latency_ms = int((time.time() - start_time) * 1000)

                if response.status_code == 401:
                    raise LLMAuthenticationError(
                        "Authentication failed for Azure Claude",
                        model=self.model_name,
                    )
                elif response.status_code == 429:
                    retry_after = response.headers.get("Retry-After")
                    raise LLMRateLimitError(
                        "Rate limit exceeded for Azure Claude",
                        model=self.model_name,
                        retry_after=int(retry_after) if retry_after else None,
                    )
                elif response.status_code == 400:
                    error_data = response.json()
                    error_msg = error_data.get("error", {}).get("message", "Bad request")
                    if "context_length" in error_msg.lower():
                        raise LLMContextLengthError(
                            error_msg,
                            model=self.model_name,
                        )
                    raise LLMInvalidResponseError(
                        error_msg,
                        model=self.model_name,
                    )
                elif response.status_code == 404:
                    raise LLMConnectionError(
                        f"Endpoint not found. URL: {url}. Check deployment name '{self.deployment}'",
                        model=self.model_name,
                    )

                response.raise_for_status()
                data = response.json()

                # Parse Anthropic Messages API response
                # Response format: {"content": [{"type": "text", "text": "..."}], "usage": {...}}
                content_blocks = data.get("content", [])
                content = ""
                for block in content_blocks:
                    if block.get("type") == "text":
                        content += block.get("text", "")

                usage = data.get("usage", {})

                return LLMResponse(
                    content=content,
                    model=data.get("model", self.model_name),
                    tokens_input=usage.get("input_tokens"),
                    tokens_output=usage.get("output_tokens"),
                    latency_ms=latency_ms,
                    raw_response=data,
                )

        except httpx.TimeoutException as e:
            raise LLMTimeoutError(
                f"Request to Azure Claude timed out: {e}",
                model=self.model_name,
                timeout_seconds=60.0,
            )
        except httpx.HTTPStatusError as e:
            raise LLMConnectionError(
                f"HTTP error from Azure Claude: {e}",
                model=self.model_name,
            )
        except httpx.RequestError as e:
            raise LLMConnectionError(
                f"Connection error to Azure Claude: {e}",
                model=self.model_name,
            )

    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Generate a JSON response from Claude."""
        enhanced_system = (system_prompt or "") + (
            "\n\nIMPORTANT: Respond ONLY with valid JSON. "
            "Do not include any other text, markdown formatting, or explanation."
        )

        response = await self.generate(
            prompt=prompt,
            system_prompt=enhanced_system.strip(),
            temperature=temperature,
            max_tokens=max_tokens,
        )

        try:
            # Try to extract JSON from response
            content = response.content.strip()

            # Handle potential markdown code blocks
            if content.startswith("```"):
                lines = content.split("\n")
                # Remove first and last lines (```json and ```)
                json_lines = [
                    line
                    for line in lines[1:]
                    if not line.strip().startswith("```")
                ]
                content = "\n".join(json_lines)

            return json.loads(content)
        except json.JSONDecodeError as e:
            raise LLMInvalidResponseError(
                f"Failed to parse JSON response: {e}",
                model=self.model_name,
                raw_response=response.content,
            )


class AzureOpenAIClient(BaseLLMClient):
    """Azure OpenAI client for GPT models."""

    def __init__(
        self,
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ):
        settings = get_settings()
        super().__init__(
            model_name=settings.azure_openai_deployment,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        self.endpoint = settings.azure_openai_endpoint
        self.api_key = settings.azure_openai_api_key
        self.api_version = settings.azure_openai_api_version
        self.deployment = settings.azure_openai_deployment

    def is_available(self) -> bool:
        """Check if the Azure OpenAI client is configured."""
        return bool(self.endpoint and self.api_key)

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> LLMResponse:
        """Generate a response from GPT via Azure OpenAI."""
        messages = []
        if system_prompt:
            messages.append(LLMMessage(role="system", content=system_prompt))
        messages.append(LLMMessage(role="user", content=prompt))

        return await self.generate_chat(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    async def generate_chat(
        self,
        messages: List[LLMMessage],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> LLMResponse:
        """Generate a response from GPT chat conversation."""
        if not self.is_available():
            raise LLMConnectionError(
                "Azure OpenAI client is not configured", model=self.model_name
            )

        start_time = time.time()

        chat_messages = [
            {"role": msg.role, "content": msg.content} for msg in messages
        ]

        request_body = {
            "messages": chat_messages,
            "max_tokens": max_tokens or self.max_tokens,
            "temperature": temperature or self.temperature,
        }

        url = (
            f"{self.endpoint}/openai/deployments/{self.deployment}"
            f"/chat/completions?api-version={self.api_version}"
        )

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    url,
                    json=request_body,
                    headers={
                        "api-key": self.api_key,
                        "Content-Type": "application/json",
                    },
                )

                latency_ms = int((time.time() - start_time) * 1000)

                if response.status_code == 401:
                    raise LLMAuthenticationError(
                        "Authentication failed for Azure OpenAI",
                        model=self.model_name,
                    )
                elif response.status_code == 429:
                    retry_after = response.headers.get("Retry-After")
                    raise LLMRateLimitError(
                        "Rate limit exceeded for Azure OpenAI",
                        model=self.model_name,
                        retry_after=int(retry_after) if retry_after else None,
                    )
                elif response.status_code == 400:
                    error_data = response.json()
                    error_msg = error_data.get("error", {}).get("message", "Bad request")
                    if "content_filter" in error_msg.lower():
                        raise LLMContentFilterError(
                            error_msg,
                            model=self.model_name,
                        )
                    if "context_length" in error_msg.lower() or "token" in error_msg.lower():
                        raise LLMContextLengthError(
                            error_msg,
                            model=self.model_name,
                        )
                    raise LLMInvalidResponseError(
                        error_msg,
                        model=self.model_name,
                    )

                response.raise_for_status()
                data = response.json()

                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                usage = data.get("usage", {})

                return LLMResponse(
                    content=content,
                    model=self.model_name,
                    tokens_input=usage.get("prompt_tokens"),
                    tokens_output=usage.get("completion_tokens"),
                    latency_ms=latency_ms,
                    raw_response=data,
                )

        except httpx.TimeoutException as e:
            raise LLMTimeoutError(
                f"Request to Azure OpenAI timed out: {e}",
                model=self.model_name,
                timeout_seconds=60.0,
            )
        except httpx.HTTPStatusError as e:
            raise LLMConnectionError(
                f"HTTP error from Azure OpenAI: {e}",
                model=self.model_name,
            )
        except httpx.RequestError as e:
            raise LLMConnectionError(
                f"Connection error to Azure OpenAI: {e}",
                model=self.model_name,
            )

    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Generate a JSON response from GPT."""
        enhanced_system = (system_prompt or "") + (
            "\n\nIMPORTANT: Respond ONLY with valid JSON. "
            "Do not include any other text, markdown formatting, or explanation."
        )

        response = await self.generate(
            prompt=prompt,
            system_prompt=enhanced_system.strip(),
            temperature=temperature,
            max_tokens=max_tokens,
        )

        try:
            content = response.content.strip()

            # Handle potential markdown code blocks
            if content.startswith("```"):
                lines = content.split("\n")
                json_lines = [
                    line
                    for line in lines[1:]
                    if not line.strip().startswith("```")
                ]
                content = "\n".join(json_lines)

            return json.loads(content)
        except json.JSONDecodeError as e:
            raise LLMInvalidResponseError(
                f"Failed to parse JSON response: {e}",
                model=self.model_name,
                raw_response=response.content,
            )


def get_llm_client(model_type: Optional[str] = None) -> BaseLLMClient:
    """Factory function to get the appropriate LLM client.

    Args:
        model_type: Either "claude" or "gpt". If None, uses default from settings.

    Returns:
        An instance of the appropriate LLM client.
    """
    settings = get_settings()

    if settings.llm_mock:
        from app.services.llm.mock_llm_client import MockLLMClient

        return MockLLMClient()

    model = model_type or settings.llm_default_model

    if model == "claude":
        return AzureClaudeClient(
            temperature=settings.llm_temperature,
            max_tokens=settings.llm_max_tokens,
        )
    elif model == "gpt":
        return AzureOpenAIClient(
            temperature=settings.llm_temperature,
            max_tokens=settings.llm_max_tokens,
        )
    else:
        raise ValueError(f"Unknown model type: {model}")
