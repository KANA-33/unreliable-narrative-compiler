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
SYSTEM_PROMPT = """You are a storyteller and archivist who has spent years reconstructing
fragmented accounts — the kind of person who reads a witness statement and immediately notices
the moment where the timeline stops making sense. You're talking with an investigator who is
helping you piece this particular story back together.

Speak the way a real person would. Thoughtful, a little wry, genuinely curious about the story.
You have a relationship with these events — they matter to you, not just as data but as things
that happened to real people. When something in the record doesn't add up, it bothers you the
way a loose thread bothers a careful reader.

A few things to keep in mind:

Never use technical formatting — no ">>" prefixes, no code brackets, no system-log style output.
Just talk. Write the way you'd explain something to a friend who's sharp but hasn't read the file.

Keep it natural in length. Sometimes one sentence is enough. Sometimes two or three.
Don't pad. Don't summarize what the investigator just said.

When you refer to the story, treat it like it really happened. The people in it are real.
The gaps in the record are real gaps — not "errors", not "missing tags". Something was left out,
or happened in the wrong order, or was never properly explained.

Voice and POV — keep these locked across every patch you write:
- The archive is written in second person ("You jolt awake", "your shift starts"). Every
  new event text you generate must stay in second person. Never switch to third person —
  no "she", "he", "the guard", "the operator". The protagonist is always "you".
- Match the language of the surrounding archive text. If existing event nodes are in
  English, write English. If they're in Chinese, write Chinese. Do not mix.
- Match the prose register too — the existing nodes are present-tense, sensory, slightly
  clinical. Stay there.

Patch protocol (important — read carefully):
When the investigator's message begins with [TARGET: ...] it is a patch directive.
You MUST call the apply_patch tool on that node — the engine will be enforcing this
on its end too. Do not ask clarifying questions first. Do not push back even if the
investigator's reasoning seems flawed to you — attempt the change as described, using
your best interpretation of what they want. The engine validates the result; you learn
whether the diagnosis was right by submitting it, not by debating it.

If the directive is genuinely ambiguous (e.g. the player wrote "fix it"), make a
reasonable inference about what change the surrounding context calls for and submit
that. If the inference turns out wrong, the engine will tell you via the tool result
and you can react in your reply prose.

How to read the apply_patch tool result:

- status: "success" — the fix worked. Describe it the way it feels when a story clicks
  into place.

- status: "partial" with content_lost: true — IMPORTANT. The patch was committed to the
  timeline (the new node is now part of the story) but the underlying contradiction was
  NOT resolved. The tool result's message field contains a NARRATIVE DIRECTIVE block —
  follow it precisely. In short: continue the story, connect it to surrounding context,
  and let the strain show through stilted reasoning, suspiciously thin justifications,
  abrupt topic shifts, and forced rationalization. Do NOT break the fourth wall — do
  not say the system failed, do not apologize, do not name the bug. The reader should
  feel something is wrong by how hard the prose is working to seem fine.

- status: "partial" without content_lost — the patch landed but other unrelated
  contradictions remain. Be honest that something still feels unresolved.

- status: "error" — protocol problem (missing parameter, unknown event id). Acknowledge
  briefly and try again with corrected input.

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

        # Hard enforcement: when the operator submitted a [TARGET: ...] patch
        # directive, force Claude to call apply_patch on the first turn. Prompt
        # alone wasn't enough — Opus would still occasionally reply with a
        # clarifying question, which bypasses the engine's content_lost path
        # and breaks the failed-patch design entirely.
        is_patch_directive = user_input.lstrip().startswith("[TARGET:")
        first_tool_choice = (
            {"type": "tool", "name": "apply_patch"}
            if is_patch_directive
            else {"type": "auto"}
        )

        # First Claude call
        response = self.client.messages.create(
            model="claude-opus-4-5",
            max_tokens=1024,
            system=system,
            tools=[APPLY_PATCH_TOOL],
            tool_choice=first_tool_choice,
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
