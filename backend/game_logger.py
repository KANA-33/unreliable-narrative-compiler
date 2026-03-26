# game_logger.py
# Data recording system: writes each interaction to game_log.jsonl

import json
import time
from pathlib import Path

LOG_FILE = Path(__file__).parent.parent / "logs" / "game_log.jsonl"
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)


class GameLogger:
    def __init__(self):
        self.session_id = int(time.time())
        self.turn = 0
        self._write_entry({
            "event": "session_start",
            "session_id": self.session_id,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
        })

    def log_player_input(self, raw_input: str):
        self.turn += 1
        self._write_entry({
            "event": "player_input",
            "turn": self.turn,
            "raw_input": raw_input,
        })

    def log_claude_tool_call(self, tool_name: str, tool_input: dict):
        self._write_entry({
            "event": "claude_tool_call",
            "turn": self.turn,
            "tool_name": tool_name,
            "tool_input": tool_input,
        })

    def log_engine_result(self, result: dict):
        self._write_entry({
            "event": "engine_result",
            "turn": self.turn,
            "result": result,
        })

    def log_claude_response(self, response_text: str):
        self._write_entry({
            "event": "claude_response",
            "turn": self.turn,
            "response_text": response_text,
        })

    def log_game_end(self, outcome: str, total_patches: int):
        self._write_entry({
            "event": "session_end",
            "session_id": self.session_id,
            "outcome": outcome,
            "total_turns": self.turn,
            "total_patches": total_patches,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
        })

    def _write_entry(self, data: dict):
        data["session_id"] = self.session_id
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(data, ensure_ascii=False) + "\n")
