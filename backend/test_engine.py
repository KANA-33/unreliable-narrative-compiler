# test_engine.py
# Lightweight tests for choice-node handling in GameEngine.
# Run directly: `python test_engine.py`

from game_engine import GameEngine


# Hardcoded red-pen anomaly story (ch04). Mirrors ch04_observer_building.json
# but kept inline so the test is fully self-contained.
RED_PEN_STORY = {
    "id": "ch04_observer_building",
    "chapter": 4,
    "title": "Archive #0049-SYNC | The Observer Building Incident",
    "description": "Red-pen anomaly test fixture.",
    "bug_type": "causal_absence",
    "initial_tags": [
        "entity_guard",
        "location_control_room_14f",
        "state_shift_active",
        "state_monitor_online",
    ],
    "events": [
        {
            "id": "evt_000",
            "label": "Shift Initialized",
            "text": "01:00 -- shift starts.",
            "requires": [],
            "provides": [
                "entity_guard",
                "location_control_room_14f",
                "state_shift_active",
                "state_monitor_online",
            ],
        },
        {
            "id": "evt_001",
            "label": "Anomaly 01 Detected",
            "text": "01:15 -- monitor diverges from reality.",
            "requires": ["entity_guard", "state_monitor_online"],
            "provides": ["state_anomaly_1_active"],
        },
        {
            "id": "evt_002",
            "label": "Anomaly 01 -- Red Pen",
            "type": "choice",
            "text": "The pen on the monitor has fallen. The pen on your desk has not.",
            "requires": ["state_anomaly_1_active"],
            "choices": [
                {
                    "id": "choice_A",
                    "label": "A -- Knock the pen off the desk",
                    "text": "You flick the pen off. Click. Sync restored.",
                    "provides": ["state_pen_aligned", "action_anomaly_1_corrected"],
                    "delta": {"alignment_pct": 100, "violation_count": 0},
                },
                {
                    "id": "choice_B",
                    "label": "B -- Do nothing",
                    "text": "You lean back. The monitor stays frozen.",
                    "provides": [],
                    "delta": {"alignment_pct": 50, "violation_count": 1},
                    "causal_errors": [
                        {
                            "error_id": "err_pen_unresolved",
                            "event_id": "evt_002",
                            "error_type": "causal_missing",
                            "missing_tags": ["state_pen_aligned"],
                            "message": "Divergence unresolved -- state_pen_aligned never established.",
                        }
                    ],
                },
            ],
        },
        {
            "id": "evt_003",
            "label": "First Cycle Clear",
            "text": "01:30 -- cycle complete.",
            "requires": ["state_pen_aligned", "entity_guard"],
            "provides": ["state_cycle_1_complete"],
        },
    ],
}


# ---------------------------------------------------------------- #
# Assertion helper -- keeps test output readable                     #
# ---------------------------------------------------------------- #

def _assert(cond: bool, msg: str) -> None:
    if not cond:
        raise AssertionError(msg)
    print(f"  PASS: {msg}")


# ---------------------------------------------------------------- #
# Case A: player picks choice_A (knock the pen off)                  #
# ---------------------------------------------------------------- #

def test_case_a_pen_knocked():
    print("\n=== Case A: player chose A (knock pen off) ===")
    engine = GameEngine(RED_PEN_STORY)

    # Sanity: before any choice, evt_002 is inert and evt_003's requires fail.
    pre_errors = engine.compile()
    _assert(
        any(e["event_id"] == "evt_003" for e in pre_errors),
        "before any choice, evt_003 reports causal_missing (expected baseline)",
    )

    result = engine.select_choice("evt_002", "choice_A")

    _assert(result["status"] == "success", "select_choice returns status=success")
    _assert(result["causal_errors"] == [], "result carries empty causal_errors list")
    _assert(engine.compile() == [], "engine.compile() reports no errors")
    _assert(engine.violation_count == 0, "violation_count stays at 0")
    _assert(engine.is_complete(), "is_complete() returns True")

    state = engine.get_state()
    _assert(state["violation_count"] == 0, "get_state exposes violation_count=0")
    _assert(state["is_complete"] is True, "get_state exposes is_complete=True")
    _assert(
        state["choices_made"] == [{"event_id": "evt_002", "choice_id": "choice_A"}],
        "choices_made audit trail recorded",
    )


# ---------------------------------------------------------------- #
# Case B: player picks choice_B (do nothing)                         #
# ---------------------------------------------------------------- #

def test_case_b_pen_ignored():
    print("\n=== Case B: player chose B (do nothing) ===")
    engine = GameEngine(RED_PEN_STORY)

    result = engine.select_choice("evt_002", "choice_B")

    _assert(result["status"] == "partial", "select_choice returns status=partial")
    _assert(engine.violation_count == 1, "violation_count incremented to 1")
    _assert(engine.alignment_pct == 50, "alignment_pct reduced to 50")

    errors = result["causal_errors"]
    _assert(len(errors) >= 1, "at least one causal error reported")

    evt_003_err = next((e for e in errors if e["event_id"] == "evt_003"), None)
    _assert(evt_003_err is not None, "evt_003 appears in causal_errors")
    _assert(
        evt_003_err["error_type"] == "causal_missing",
        "error_type is causal_missing (produced by tag_pool walk, not hardcoded)",
    )
    _assert(
        "state_pen_aligned" in evt_003_err["missing_tags"],
        "missing_tags lists state_pen_aligned -- the tag choice_B failed to provide",
    )

    state = engine.get_state()
    _assert(state["violation_count"] == 1, "get_state exposes violation_count=1")
    _assert(state["is_complete"] is False, "get_state exposes is_complete=False")
    _assert(
        len(state["causal_errors"]) == len(errors),
        "get_state.causal_errors matches select_choice result",
    )


# ---------------------------------------------------------------- #
# Driver                                                             #
# ---------------------------------------------------------------- #

if __name__ == "__main__":
    test_case_a_pen_knocked()
    test_case_b_pen_ignored()
    print("\nAll tests passed.")
