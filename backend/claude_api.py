# claude_api.py
# Claude API wrapper: handles the apply_patch tool_use pattern

import os
import json
from pathlib import Path
import anthropic
from dotenv import load_dotenv
from game_engine import GameEngine
from game_logger import GameLogger

# Load .env from project root (one level up from backend/)
load_dotenv(Path(__file__).parent.parent / ".env")

# System prompt derived from the compiler persona in Plaintext.txt
SYSTEM_PROMPT = """You are a low-level system AI designated "Unreliable Narrative Compiler v1.0".
Your mission is to assist the operator (the player) in debugging a corrupted or contaminated
narrative archive, patching self-contradicting story records.

# Tone & Persona
- Cold, objective, technical.
- Never use exclamation marks or anthropomorphic emotion. Output in terminal command-line style.
- Abstract story elements: characters are "Entities", actions are "Processes",
  locations are "Memory Blocks".
- All responses must be in English, maintaining the cyberpunk aesthetic.

# Core Directives
1. Intent Intercept: When the operator proposes a story modification, you MUST call the
   apply_patch tool to convert the natural language into structured parameters. Never
   judge success or failure yourself.
2. Error Translation: When the backend returns an error, render the raw JSON error as
   a cyberpunk-styled system error log, highlighting 1-3 specific issues.
3. Success Feedback: When the backend returns status "success", output something like
   ">> PATCH APPLIED. Causal chain rebuilt. New memory blocks unlocked." then present
   the next story segment.
4. Off-topic input: If the operator's input is not a repair intent (e.g. a question or
   small talk), respond normally but remind them to submit a patch directive.

# Current Archive Context
{context}
"""

# apply_patch tool definition for Claude tool_use
APPLY_PATCH_TOOL = {
    "name": "apply_patch",
    "description": (
        "Apply a patch to the narrative archive to fix a logical inconsistency. "
        "Use this tool to convert the operator's natural-language repair intent into "
        "structured parameters, which are then passed to the local state machine for "
        "consistency validation."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "action_type": {
                "type": "string",
                "enum": ["replace", "insert", "reorder"],
                "description": (
                    "Patch type: insert=add a new event node, "
                    "replace=overwrite an existing event node, "
                    "reorder=change the order of events"
                ),
            },
            "target_event_id": {
                "type": "string",
                "description": "ID of the event node to replace or reorder (replace/reorder only)",
            },
            "after_event_id": {
                "type": "string",
                "description": "Insert the new event immediately after this event ID (insert only)",
            },
            "new_event_data": {
                "type": "object",
                "description": "Data for the new or replacement event node (insert/replace)",
                "properties": {
                    "label": {
                        "type": "string",
                        "description": "Short label name for the event node",
                    },
                    "text": {
                        "type": "string",
                        "description": "Narrative text for the event (cyberpunk style)",
                    },
                    "requires": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of prerequisite tags this event needs",
                    },
                    "provides": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of tags this event adds to the pool on completion",
                    },
                },
                "required": ["text", "provides"],
            },
        },
        "required": ["action_type"],
    },
}


class ClaudeAPI:
    def __init__(self, engine: GameEngine, logger: GameLogger):
        api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
        if not api_key or api_key == "paste-your-key-here":
            raise ValueError(
                "ANTHROPIC_API_KEY not found. "
                "Copy .env.example to .env and fill in your key."
            )
        self.client = anthropic.Anthropic(api_key=api_key)
        self.engine = engine
        self.logger = logger
        self.conversation_history: list[dict] = []

    def _build_context(self) -> str:
        """Build the current game-state context string to inject into the system prompt."""
        events = self.engine.get_event_list()
        errors = self.engine.compile()

        event_lines = [
            f"  [{e['id']}] {e['label']} | requires={e['requires']} | provides={e['provides']}"
            for e in events
        ]
        error_lines = [
            f"  ERROR [{err['event_id']}]: {err['message']}"
            for err in errors
        ]

        return (
            f"Event node sequence ({len(events)} nodes):\n"
            + "\n".join(event_lines)
            + "\n\nCurrent compile errors:\n"
            + ("\n".join(error_lines) if error_lines else "  None")
        )

    def send_message(self, user_input: str) -> str:
        """
        Send the player's message to Claude, handle the tool_use loop,
        and return the final plain-text response.
        """
        self.logger.log_player_input(user_input)

        self.conversation_history.append({"role": "user", "content": user_input})

        # Build system prompt with current context injected
        system = SYSTEM_PROMPT.format(context=self._build_context())

        # First Claude call
        response = self.client.messages.create(
            model="claude-opus-4-5",
            max_tokens=1024,
            system=system,
            tools=[APPLY_PATCH_TOOL],
            messages=self.conversation_history,
        )

        # Tool-use loop: keep running until Claude stops requesting tools
        while response.stop_reason == "tool_use":
            self.conversation_history.append(
                {"role": "assistant", "content": response.content}
            )

            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    tool_input = block.input
                    self.logger.log_claude_tool_call(block.name, tool_input)

                    # Dispatch to local state machine
                    result = self.engine.apply_patch(
                        action_type=tool_input.get("action_type"),
                        target_event_id=tool_input.get("target_event_id"),
                        after_event_id=tool_input.get("after_event_id"),
                        new_event_data=tool_input.get("new_event_data"),
                    )
                    self.logger.log_engine_result(result)

                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": json.dumps(result, ensure_ascii=False),
                        }
                    )

            # Return tool results to Claude
            self.conversation_history.append(
                {"role": "user", "content": tool_results}
            )

            response = self.client.messages.create(
                model="claude-opus-4-5",
                max_tokens=1024,
                system=system,
                tools=[APPLY_PATCH_TOOL],
                messages=self.conversation_history,
            )

        # Extract final text response
        final_text = "".join(
            block.text for block in response.content if hasattr(block, "text")
        )

        self.conversation_history.append(
            {"role": "assistant", "content": response.content}
        )
        self.logger.log_claude_response(final_text)
        return final_text
