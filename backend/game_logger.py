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
        print(f"\n\033[1;36m[turn {self.turn}] player →\033[0m {raw_input}")
        self._write_entry({
            "event": "player_input",
            "turn": self.turn,
            "raw_input": raw_input,
        })

    def log_claude_tool_call(self, tool_name: str, tool_input: dict):
        pretty = json.dumps(tool_input, ensure_ascii=False, indent=2)
        print(f"\033[1;33m  ⇢ Claude tool_use: {tool_name}\033[0m")
        for line in pretty.splitlines():
            print(f"    \033[33m{line}\033[0m")
        self._write_entry({
            "event": "claude_tool_call",
            "turn": self.turn,
            "tool_name": tool_name,
            "tool_input": tool_input,
        })

    def log_engine_result(self, result: dict):
        status = result.get("status", "?")
        msg = result.get("message", status)
        if status == "success":
            print(f"\033[1;32m  ✓ engine validated [{status}]: {msg}\033[0m")
        elif status == "partial":
            print(f"\033[1;33m  ⚠ engine accepted with errors [{status}]: {msg}\033[0m")
        else:
            print(f"\033[1;31m  ✗ engine rejected [{status}]: {msg}\033[0m")
        self._write_entry({
            "event": "engine_result",
            "turn": self.turn,
            "result": result,
        })

    def log_claude_response(self, response_text: str):
        preview = response_text.replace("\n", " ")
        if len(preview) > 120:
            preview = preview[:117] + "..."
        print(f"\033[1;35m  ← Claude reply:\033[0m {preview}")
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
