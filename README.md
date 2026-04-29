# Unreliable Narrative Compiler

> An AI-assisted interactive investigation game where players repair causally broken story archives — and make choices that decide their fate — by conversing with an archivist powered by Claude.

**Live demo:** [unreliable-narrative-compiler.onrender.com](https://unreliable-narrative-compiler.onrender.com)

---

## Abstract

*Unreliable Narrative Compiler* is a single-player browser game built around the concept of **causal consistency in storytelling**. The player works through a three-chapter arc — the *SYNC trilogy* — in which each chapter is a fragmented story archive whose logical dependencies are deliberately broken. Using a conversational AI interface, the player identifies the contradictions and proposes fixes. The AI ("the archivist", powered by Claude Opus) validates reasoning, applies structural patches to the story graph, and rejects changes that fail to improve causal integrity.

Beyond patching, certain events are **choice nodes** that ask the player to align with — or push back against — the archive's narrative directives. Each resolved choice contributes a signed score; the cumulative score across all three chapters, combined with the final-chapter decision, selects one of three authored endings.

The system enforces correctness at two independent layers:

1. **Reasoning Gate (System Prompt)** — Claude requires the player to identify the target event, diagnose the missing condition, and propose a concrete fix before any patch is executed.
2. **Trial Validation (Engine)** — Before committing a patch, the engine simulates it on a deep copy of the story graph and rejects it if the error count does not decrease. When a patch is forced through despite failing validation, the engine flags the node as `content_lost` and Claude is instructed to narrate around the seam without breaking the fourth wall.

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
# requirements.txt
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

1. **Start Screen** — Click *Initialize Sequence* (or anywhere) to load Chapter 1.
2. **Narrative Archive** (left panel) — Read through the story events. Events with causal errors are annotated with red missing-tag badges.
3. **Event Node Graph** (center-right) — Visual graph of all story nodes and their causal connections. Choice nodes appear as branching forks until resolved.
4. **Evidence Photo Stack** (top-right) — Polaroid-style props pinned to the desk for atmosphere and clue surfacing.
5. **Dossier Notes** (bottom-right) — Live error count, completion status, and chapter score.
6. **Select a target** — Click any event entry in the Narrative Archive *or* any node in the Event Node Graph. Both panels stay in sync.
7. **Describe the fix** — Choose an action (INSERT / REPLACE) in the Patch Command Bar and type your diagnosis. Submit with **Enter** or *Submit Patch*.
8. **Resolve choices** — When a choice node is selected, pick one of the offered branches. Each choice contributes its signed `delta.score` to the cross-chapter total.
9. **Archivist responds** — Claude evaluates the reasoning. Valid patches are applied immediately; invalid ones either bounce or commit as `content_lost`, where the prose visibly strains to cover the seam.
10. **Page-turn between chapters** — Once a chapter compiles cleanly with all choices resolved, the page-turn overlay carries you to the next archive.
11. **Ending** — When *every* chapter has been completed, a red arrow appears in the bottom-right corner. Clicking it routes to one of three endings based on your cumulative score and final choice.

### The three endings

The ending screen selects from three authored outcomes using both the cumulative score (signed integer rolled up from every resolved choice) and the chapter 3 decision:

| Cumulative score | Ch.3 choice | Ending |
|---|---|---|
| `> 0` (or `comply`) | comply | **Infinite Loop** — you become perfect, sealed data inside the building. |
| `< 0` (or `defy`) | defy | **A Mundane Life** — you walk out into the morning and never look back. |
| `= 0` | — | **The Awakened Observer** — the simulation breaks; you touch the foundational reality. |

A balanced score (`0`) overrides the chapter-3 path and routes to the awakened-observer ending.

### Adding stories

Stories are JSON files in `backend/stories/`. Authoring templates live in `backend/stories_example/`:

- [`backend/stories_example/STORY_TEMPLATE_EN.json`](backend/stories_example/STORY_TEMPLATE_EN.json) — English authoring guide with annotated examples
- [`backend/stories_example/STORY_TEMPLATE_ZH.json`](backend/stories_example/STORY_TEMPLATE_ZH.json) — Chinese authoring guide

Each story defines an event sequence with `requires` / `provides` tag arrays that form the causal dependency graph. Bugs are created by deliberately omitting a `provides` tag that a later event `requires`. Choice nodes (`type: "choice"`) define branching options, each carrying a `delta` payload with `score`, `violation_count`, and `alignment_pct` adjustments.

---

## Project Structure

```
unreliable-narrative-compiler/
├── backend/
│   ├── app.py                # Flask routes (/api/state, /api/chat, /api/choice,
│   │                         #              /api/load_story, /api/reset, /api/ending/<id>)
│   ├── game_engine.py        # Causal consistency checker, patch executor,
│   │                         # choice resolver, content_lost handling
│   ├── claude_api.py         # Claude tool-use wrapper + archivist system prompt
│   ├── story_loader.py       # Loads and validates story JSON files
│   ├── game_logger.py        # JSONL session logger
│   ├── test_engine.py        # Engine unit tests
│   ├── stories/
│   │   ├── ch01_the_sync_protocol.json
│   │   ├── ch02_blind_spot.json
│   │   └── ch03_sync.json
│   ├── stories_example/      # Authoring templates + archived stories
│   └── endings/              # positive.png, negative.png, zero.png
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── StartScreen.tsx
│       │   ├── EndingScreen.tsx           # Three-ending image + narration screen
│       │   ├── PageTurnOverlay.tsx        # Inter-chapter transition
│       │   ├── PhotoStack.tsx             # Evidence polaroid pile
│       │   ├── PatchCommandBar.tsx        # Bottom dialogue + patch controls
│       │   ├── EventGraphContainer.tsx
│       │   ├── EventNodeGraph.tsx         # Causal node graph (SVG)
│       │   ├── RedactableText.tsx
│       │   ├── SettingsMenu.tsx
│       │   ├── Typewriter.tsx
│       │   └── GameScreen/
│       │       ├── index.tsx              # Layout + ending-arrow gate
│       │       ├── Header.tsx
│       │       ├── NarrativePanel.tsx     # Story text + sketch-box selection
│       │       └── DossierNotes.tsx       # Error/completion sticky note
│       ├── store/gameStore.ts             # Zustand global state + chapter snapshots
│       ├── api/client.ts                  # Fetch wrapper for Flask API
│       └── types/
├── static/                   # Pre-built frontend assets (served by Flask in production)
├── docs/                     # Design docs, GDD, UI mockups
├── render.yaml               # Render deployment config
├── requirements.txt
└── start.py                  # Dev launcher (Flask + Vite concurrently)
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
