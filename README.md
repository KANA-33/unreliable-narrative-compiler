# Unreliable Narrative Compiler

> An AI-assisted interactive investigation game where players repair causally broken story archives by conversing with an archivist powered by Claude.

**Live demo:** [unreliable-narrative-compiler.onrender.com](https://unreliable-narrative-compiler.onrender.com)

---

## Abstract

*Unreliable Narrative Compiler* is a single-player browser game built around the concept of **causal consistency in storytelling**. The player is presented with a fragmented story archive — a sequence of narrative events whose logical dependencies are deliberately broken. Using a conversational AI interface, the player identifies the contradictions and proposes fixes. The AI (an "archivist" persona powered by Claude Opus) validates reasoning, applies structural patches to the story graph, and rejects changes that fail to improve causal integrity.

The system enforces correctness at two independent layers:

1. **Reasoning Gate (System Prompt)** — Claude requires the player to identify the target event, diagnose the missing condition, and propose a concrete fix before any patch is executed.
2. **Trial Validation (Engine)** — Before committing a patch, the engine simulates it on a deep copy of the story graph and rejects it if the error count does not decrease.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend language | Python 3.11+ |
| Web framework | Flask 3.x + Flask-CORS |
| AI model | Anthropic Claude (`claude-opus-4-5`) via `anthropic` SDK |
| Production server | Gunicorn |
| Frontend language | TypeScript 5 |
| UI framework | React 18 + Vite 5 |
| Styling | Tailwind CSS v3 (custom light "dossier" theme) |
| State management | Zustand |
| Deployment | Render (Python runtime) |

### Key dependencies

```
# backend/requirements.txt
anthropic>=0.40.0
flask>=3.0.0
flask-cors>=4.0.0
python-dotenv>=1.0.0
gunicorn>=21.0.0
```

---

## Installation & Running

### Prerequisites

- Python 3.11+
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

### 1. Clone the repository

```bash
git clone https://github.com/KANA-33/unreliable-narrative-compiler.git
cd unreliable-narrative-compiler
```

### 2. Set up the environment

```bash
# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate        # macOS / Linux
.venv\Scripts\activate           # Windows

# Install Python dependencies
pip install -r requirements.txt
```

Create a `.env` file in the project root:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

### 4. Start the development environment

```bash
python start.py
```

This launches both servers concurrently:

| Service | URL |
|---|---|
| Vite dev server (open this) | http://localhost:5173 |
| Flask API | http://localhost:5000 |

---

## Usage

### Game flow

1. **Start Screen** — Click *Initialize Sequence* (or anywhere) to load the default story.
2. **Narrative Archive** (left panel) — Read through the story events. Events with causal errors are annotated with red missing-tag badges.
3. **Event Node Graph** (top-right) — Visual graph of all story nodes and their connections.
4. **Select a target** — Click any event entry in the Narrative Archive *or* any node in the Event Node Graph. The selected item is highlighted with a hand-drawn sketch border on the left and inverted (black) on the right. Both panels stay in sync.
5. **Describe the fix** — Choose an action (INSERT / REPLACE) and type your diagnosis into the text field. Submit with **Enter** or *Submit Patch*.
6. **Archivist responds** — Claude evaluates the reasoning. If the fix is valid and reduces errors, it is applied to the story graph and reflected immediately. If not, the archivist explains what still feels unresolved.
7. **Completion** — When all causal errors are resolved, the Dossier Notes panel confirms: *Archive integrity: CONFIRMED.*

### Adding stories

Stories are JSON files in `backend/stories/`. Use the included templates as a starting point:

- [`backend/stories/STORY_TEMPLATE_EN.json`](backend/stories/STORY_TEMPLATE_EN.json) — English authoring guide with annotated examples
- [`backend/stories/STORY_TEMPLATE_ZH.json`](backend/stories/STORY_TEMPLATE_ZH.json) — Chinese authoring guide

Each story defines an event sequence with `requires` / `provides` tag arrays that form the causal dependency graph. Bugs are created by deliberately omitting a `provides` tag that a later event `requires`.

---


## Project Structure

```
unreliable-narrative-compiler/
├── backend/
│   ├── app.py               # Flask routes (/api/state, /api/chat, /api/reset …)
│   ├── game_engine.py       # Causal consistency checker + patch executor
│   ├── claude_api.py        # Claude tool-use wrapper + system prompt
│   ├── story_loader.py      # Loads and validates story JSON files
│   ├── game_logger.py       # JSONL session logger
│   └── stories/
│       ├── ch01_data_heist.json
│       ├── ch02_blackout_protocol.json
│       ├── ch03_ghost_signal.json
│       ├── STORY_TEMPLATE_EN.json
│       └── STORY_TEMPLATE_ZH.json
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── StartScreen.tsx
│       │   └── GameScreen/
│       │       ├── Header.tsx
│       │       ├── NarrativePanel.tsx   # Left: story text + sketch-box selection
│       │       ├── EventGraph.tsx       # Top-right: causal node graph (SVG)
│       │       ├── DossierNotes.tsx     # Bottom-right: error/completion sticky note
│       │       └── CommandBar.tsx       # Bottom: dialogue + patch controls
│       ├── store/gameStore.ts           # Zustand global state
│       └── api/client.ts               # Fetch wrapper for Flask API
├── static/                  # Pre-built frontend assets (served by Flask in production)
├── render.yaml              # Render deployment config
├── requirements.txt
└── start.py                 # Dev launcher (Flask + Vite concurrently)
```

---

## Deployment

The app is deployed on **Render** using a Python runtime. Because Render's Python environment does not include Node.js, the frontend is pre-built locally and the `static/` directory is committed to the repository.

To redeploy after frontend changes:

```bash
cd frontend && npm run build   # outputs to ../static/
cd ..
git add static/
git commit -m "rebuild static assets"
git push origin main
```

Render automatically redeploys on push to `main`.

---

*CSC-493 Capstone Project — Spring 2026*
