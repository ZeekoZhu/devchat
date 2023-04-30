from abc import ABC, abstractmethod
from typing import Iterator
from devchat.prompt import Prompt


class Chat(ABC):
    """
    Chat interface for managing chat-related interactions.

    This interface defines methods for prompting a chat system with
    a list of Message objects and retrieving responses, either as a
    complete response or as a streaming response.
    """

    @abstractmethod
    def request(self, prompt: Prompt) -> None:
        """Send the messages of a prompt to the chat system."""

    @abstractmethod
    def complete_response(self) -> str:
        """
        Retrieve a complete response JSON string from the chat system.

        Returns:
            str: A JSON string representing the complete response from the chat system.
        """

    @abstractmethod
    def stream_response(self) -> Iterator[str]:
        """
        Retrieve a streaming response as an iterator of JSON strings from the chat system.

        Returns:
            Iterator[str]: An iterator over JSON strings representing the streaming response
                           events from the chat system.
        """