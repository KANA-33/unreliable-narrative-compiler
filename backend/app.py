# app.py
# Flask web server for the Unreliable Narrative Compiler demo

import os
import threading
from pathlib import Path
from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
from game_engine import GameEngine
from game_logger import GameLogger
from claude_api import ClaudeAPI
from story_loader import list_stories, load_story, load_default_story

# In dev, Vite runs on :5173 and proxies /api to here.
# In production, Flask serves the built frontend from /static.
# Use resolve() to get absolute path regardless of working directory.
STATIC_DIR = str(Path(__file__).resolve().parent.parent / "static")

app = Flask(__name__)
# Dev: allow Vite dev server. Prod: same-origin, CORS not required but kept permissive for demos.
CORS(app, origins=["http://localhost:5173", os.environ.get("RENDER_EXTERNAL_URL", "")])

# ------------------------------------------------------------------ #
# Global game state (single-player demo)                              #
# ------------------------------------------------------------------ #
_lock = threading.Lock()

def _init_game(story: dict):
    """Create a fresh engine + logger + Claude instance for a given story."""
    engine = GameEngine(story)
    logger = GameLogger()
    try:
        claude = ClaudeAPI(engine, logger)
        claude_error = None
    except ValueError as e:
        claude = None
        claude_error = str(e)
    return engine, logger, claude, claude_error

_current_story = load_default_story()
engine, logger, claude, _claude_error = _init_game(_current_story)


def make_state() -> dict:
    """Build a JSON-serializable snapshot of the current game state."""
    errors = engine.compile()
    events = []
    for e in engine.events:
        evt = {
            "id":       e["id"],
            "label":    e["label"],
            "text":     e["text"],
            "requires": e.get("requires", []),
            "provides": e.get("provides", []),
        }
        # Choice-node metadata (only present on type == "choice" or "resolved")
        if "type" in e:
            evt["type"] = e["type"]
        if "choices" in e:
            evt["choices"] = [
                {"id": c["id"], "label": c["label"]}
                for c in e["choices"]
            ]
        if "resolved_choice_id" in e:
            evt["resolved_choice_id"] = e["resolved_choice_id"]
        events.append(evt)

    complete = engine.is_complete()
    return {
        "story_id":            _current_story["id"],
        "story_title":         _current_story["title"],
        "events":              events,
        "errors":              errors,
        "is_complete":         complete,
        "patches_applied":     len(engine.patches_applied),
        "violation_count":     getattr(engine, "violation_count", 0),
        "alignment_pct":       getattr(engine, "alignment_pct", 100),
        "choices_made":        list(getattr(engine, "choices_made", [])),
        "initial_error_count": getattr(engine, "initial_error_count", 0),
    }


# ------------------------------------------------------------------ #
# API Routes                                                           #
# ------------------------------------------------------------------ #

@app.route("/api/stories")
def get_stories():
    return jsonify(list_stories())


@app.route("/api/state")
def get_state():
    with _lock:
        return jsonify(make_state())


@app.route("/api/load_story", methods=["POST"])
def load_story_route():
    global engine, logger, claude, _claude_error, _current_story

    data = request.get_json() or {}
    story_id = data.get("story_id", "").strip()
    if not story_id:
        return jsonify({"error": "Missing story_id"}), 400

    try:
        story = load_story(story_id)
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404

    with _lock:
        _current_story = story
        engine, logger, claude, _claude_error = _init_game(story)
        return jsonify({"status": "ok", "state": make_state()})


@app.route("/api/chat", methods=["POST"])
def chat():
    if claude is None:
        return jsonify({"error": _claude_error}), 503

    data = request.get_json() or {}
    message = data.get("message", "").strip()
    if not message:
        return jsonify({"error": "Empty message"}), 400

    with _lock:
        try:
            reply = claude.send_message(message)
        except Exception as e:
            return jsonify({"error": str(e)}), 500

        return jsonify({"reply": reply, "state": make_state()})


@app.route("/api/choice", methods=["POST"])
def select_choice_route():
    data = request.get_json() or {}
    event_id = (data.get("event_id") or "").strip()
    choice_id = (data.get("choice_id") or "").strip()
    if not event_id or not choice_id:
        return jsonify({"error": "Missing event_id or choice_id"}), 400

    with _lock:
        result = engine.select_choice(event_id, choice_id)
        if result.get("status") == "error":
            return jsonify({"error": result.get("message", "choice failed"), "result": result}), 400
        return jsonify({"result": result, "state": make_state()})


@app.route("/api/reset", methods=["POST"])
def reset():
    global engine, logger, claude, _claude_error

    with _lock:
        engine, logger, claude, _claude_error = _init_game(_current_story)
        return jsonify({"status": "ok", "state": make_state()})


# ------------------------------------------------------------------ #
# Production: serve built frontend                                     #
# ------------------------------------------------------------------ #

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path: str):
    if path and os.path.exists(os.path.join(STATIC_DIR, path)):
        return send_from_directory(STATIC_DIR, path)
    return send_from_directory(STATIC_DIR, "index.html")


# ------------------------------------------------------------------ #
# Entry point                                                          #
# ------------------------------------------------------------------ #

if __name__ == "__main__":
    print("  Starting Unreliable Narrative Compiler...")
    print("  Dev  : run frontend separately with 'npm run dev' in frontend/")
    print("  Prod : build first with 'npm run build', then open http://localhost:5000")
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)
