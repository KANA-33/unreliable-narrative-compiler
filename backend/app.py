# app.py
# Flask web server for the Unreliable Narrative Compiler demo

import os
import threading
from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
from game_engine import GameEngine
from game_logger import GameLogger
from claude_api import ClaudeAPI
from story_loader import list_stories, load_story, load_default_story

# In dev, Vite runs on :5173 and proxies /api to here.
# In production, Flask serves the built frontend from /static.
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path="/")
CORS(app, origins=["http://localhost:5173"])

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
    events = [
        {
            "id":       e["id"],
            "label":    e["label"],
            "text":     e["text"],
            "requires": e["requires"],
            "provides": e["provides"],
        }
        for e in engine.events
    ]
    return {
        "story_id":        _current_story["id"],
        "story_title":     _current_story["title"],
        "events":          events,
        "errors":          errors,
        "is_complete":     engine.is_complete(),
        "patches_applied": len(engine.patches_applied),
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
    app.run(debug=False, port=5000)
