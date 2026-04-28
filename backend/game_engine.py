# game_engine.py
# Local state machine: validates story event graph consistency and applies patches

import copy


# Sent back to Claude inside the apply_patch tool_result whenever a patch is
# committed despite NOT reducing causal errors ("content_lost" path).
# Hybrid policy: rules are pinned, prose is Claude's. The player should
# realize the seam exists by *how* the narrative tries to cover it, not by a
# system message that says so out loud.
CONTENT_LOST_DIRECTIVE = (
    "NARRATIVE DIRECTIVE — content_lost commit:\n"
    "- The new node has been written into the timeline. Continue the story; "
    "do not break the flow.\n"
    "- Show the strain in your prose: stilted reasoning, suspiciously thin "
    "justifications, abrupt topic shifts, the rhythm of someone covering for "
    "a hole they can't quite see.\n"
    "- Do NOT break the fourth wall. Do not say 'the system failed', 'I "
    "couldn't fix it', or otherwise name the bug. Do not apologize.\n"
    "- Use forced rationalization. Let the reader feel that something is "
    "wrong by how hard the prose is working to seem fine. The seam should "
    "show through the cover-up, not be announced.\n"
    "- Voice: stay in second person ('you', 'your'). Never switch to third "
    "person — no 'she', 'he', 'the guard'. Match the language of the "
    "surrounding archive text exactly (English stays English, Chinese stays "
    "Chinese). Stay in present tense, sensory, slightly clinical — same "
    "register as the existing nodes."
)


class GameEngine:
    """
    Maintains the story event sequence, enforces causal consistency checks,
    and executes apply_patch commands.

    Accepts any story dict that conforms to the format defined in story_loader.py.
    """

    def __init__(self, story: dict):
        self.story = story
        self.events = copy.deepcopy(story["events"])
        self.initial_tags = set(story["initial_tags"])
        self.patches_applied = []
        self.patch_counter = 0

        # Baseline causal-error count before any player intervention.
        self.initial_error_count = len(self.compile())

        # Choice-node state:
        #   - violation_count: accumulated from each chosen branch's delta.violation_count
        #   - alignment_pct: latest delta.alignment_pct reported by a selected choice
        #   - choices_made: audit trail of which branch was taken at each choice node
        # Unresolved choice nodes act as inert placeholders during compile() --
        # they provide nothing, so downstream requires failures will surface naturally.
        self.violation_count = 0
        self.alignment_pct = 100
        self.choices_made: list[dict] = []

        # Per-chapter player score: each resolved choice contributes
        # delta.score (typically +1 or -1). The frontend rolls these up into
        # a cross-chapter totalScore that drives the ending image selection.
        self.score = 0

    # ------------------------------------------------------------------ #
    # Public interface                                                      #
    # ------------------------------------------------------------------ #

    def get_current_text(self) -> str:
        """Return the full narrative text for all event nodes, annotated with IDs."""
        lines = []
        for evt in self.events:
            lines.append(f"[{evt['id']}] {evt['label']}")
            lines.append(evt["text"])
            lines.append("")
        return "\n".join(lines)

    def get_event_list(self) -> list[dict]:
        """Return a summary list of event nodes for Claude's context window."""
        return [
            {
                "id":       e["id"],
                "label":    e["label"],
                "requires": list(e.get("requires", [])),
                "provides": list(e.get("provides", [])),
            }
            for e in self.events
        ]

    def compile(self) -> list[dict]:
        """
        Attempt to compile the current event sequence.
        Returns a list of errors; an empty list means compilation succeeded.
        Each error has the shape:
            {
              "event_id": str,
              "error_type": "causal_missing",
              "missing_tags": [str],
              "message": str
            }

        Choice-node handling:
            A choice node (type == "choice") contributes provides ONLY if the
            player has already resolved it via select_choice(). Until then it
            contributes nothing to tag_pool. This is intentional -- it lets
            downstream causal_missing errors surface through the normal
            tag_pool check rather than through hardcoded choice logic.
        """
        tag_pool = set(self.initial_tags)
        errors = []

        for event in self.events:
            missing = [tag for tag in event["requires"] if tag not in tag_pool]
            if missing:
                errors.append(
                    {
                        "event_id": event["id"],
                        "error_type": "causal_missing",
                        "missing_tags": missing,
                        "message": (
                            f"Event[{event['id']}] is missing prerequisite tag(s): "
                            f"{missing}. This process cannot be initiated on the current timeline."
                        ),
                    }
                )
            tag_pool.update(event.get("provides", []))

        return errors

    def select_choice(self, event_id: str, choice_id: str) -> dict:
        """
        Resolve a choice node by committing one of its branches.

        Mechanism: the original choice node STAYS on the timeline (so the
        player can still read the dilemma that prompted the decision). We
        only mark it with `resolved_choice_id` so the UI can hide its
        choice buttons. A NEW event is inserted directly after it carrying
        the chosen branch's narrative text, label, and provides — this is
        what propagates state into the downstream chain.

        compile() doesn't need a special case for either node:
            - The original choice node has provides == [] (per JSON), so it
              contributes nothing to tag_pool whether resolved or not.
            - The new "resolved" node behaves like any normal event.

        Side effects:
            - violation_count += choice.delta.violation_count (default 0)
            - alignment_pct   = choice.delta.alignment_pct (if present)
            - score           += choice.delta.score (default 0)
            - choices_made gets an audit entry

        Returns a standard result dict that mirrors apply_patch's shape.
        """
        idx = self._find_event_index(event_id)
        if idx is None:
            return {
                "status": "error",
                "error_type": "event_not_found",
                "message": f"Event node [{event_id}] does not exist on the current timeline.",
            }

        event = self.events[idx]
        if event.get("type") != "choice":
            return {
                "status": "error",
                "error_type": "not_a_choice",
                "message": f"Event[{event_id}] is not a choice node; select_choice is not applicable.",
            }
        if event.get("resolved_choice_id"):
            return {
                "status": "error",
                "error_type": "already_resolved",
                "message": (
                    f"Event[{event_id}] has already committed branch "
                    f"[{event['resolved_choice_id']}] — choices on a resolved node are locked."
                ),
            }

        choice = next((c for c in event.get("choices", []) if c["id"] == choice_id), None)
        if choice is None:
            return {
                "status": "error",
                "error_type": "choice_not_found",
                "message": f"Choice[{choice_id}] is not a valid branch of event[{event_id}].",
            }

        # Stat updates from the chosen branch's delta.
        delta = choice.get("delta", {}) or {}
        self.violation_count += int(delta.get("violation_count", 0))
        if "alignment_pct" in delta:
            self.alignment_pct = int(delta["alignment_pct"])
        self.score += int(delta.get("score", 0))

        # 1) Mark the original choice node as resolved without rewriting it.
        #    Buttons hide via resolved_choice_id; provides stays empty, so the
        #    new node below is what the chain actually inherits from.
        event["resolved_choice_id"] = choice_id

        # 2) Insert the resolution as a brand-new node right after it.
        new_event = {
            "id":                  f"{event_id}_ex",
            "label":               choice.get("label", "Resolution"),
            "text":                choice.get("text", ""),
            "requires":            list(choice.get("requires", [])),
            "provides":            list(choice.get("provides", [])),
            "type":                "resolved",
            "resolved_choice_id":  choice_id,
            "parent_event_id":     event_id,
        }
        self.events.insert(idx + 1, new_event)
        self.choices_made.append({"event_id": event_id, "choice_id": choice_id})

        errors = self.compile()
        if not errors:
            return {
                "status": "success",
                "message": f"Choice[{choice_id}] committed. Causal chain intact.",
                "event_id": event_id,
                "choice_id": choice_id,
                "violation_count": self.violation_count,
                "alignment_pct": self.alignment_pct,
                "causal_errors": [],
            }
        return {
            "status": "partial",
            "message": f"Choice[{choice_id}] committed. Timeline now contains {len(errors)} causal error(s).",
            "event_id": event_id,
            "choice_id": choice_id,
            "violation_count": self.violation_count,
            "alignment_pct": self.alignment_pct,
            "causal_errors": errors,
        }

    def get_state(self) -> dict:
        """
        Return the full public state snapshot. Suitable for JSON serialization
        by the Flask API layer.
        """
        errors = self.compile()
        complete = len(errors) == 0
        return {
            "story_id": self.story.get("id"),
            "story_title": self.story.get("title"),
            "events": self.get_event_list(),
            "causal_errors": errors,
            "is_complete": complete,
            "violation_count": self.violation_count,
            "alignment_pct": self.alignment_pct,
            "choices_made": list(self.choices_made),
            "patches_applied": len(self.patches_applied),
            "initial_error_count": self.initial_error_count,
        }

    def apply_patch(
        self,
        action_type: str,
        target_event_id: str | None = None,
        after_event_id: str | None = None,
        new_event_data: dict | None = None,
    ) -> dict:
        """
        Execute a patch operation. Returns a standard JSON result:
            Success:  {"status": "success",  "message": str, ...}
            Partial:  {"status": "partial",  "message": str, ...}
            Rejected: {"status": "rejected", "message": str, ...}
            Failure:  {"status": "error",    "error_type": str, "message": str}

        Before committing, a trial-run is performed on a deep copy of the
        event list. The patch is only committed if it actually reduces the
        total number of causal errors.
        """
        errors_before = len(self.compile())

        # Trial-run on a snapshot. Result is a metadata dict — does NOT short
        # circuit the apply path anymore. A non-improving patch is committed
        # regardless and flagged as content_lost so the engine can score it
        # and the UI can mark the node.
        trial = self._trial_validate(
            action_type, target_event_id, after_event_id, new_event_data, errors_before
        )
        content_lost = bool(trial and trial.get("content_lost"))
        errors_after_trial = trial.get("errors_after") if trial else None

        if action_type == "insert":
            return self._insert_event(
                after_event_id, new_event_data,
                content_lost=content_lost,
                errors_before=errors_before,
                errors_after_trial=errors_after_trial,
            )
        elif action_type == "replace":
            return self._replace_event(
                target_event_id, new_event_data,
                content_lost=content_lost,
                errors_before=errors_before,
                errors_after_trial=errors_after_trial,
            )
        elif action_type == "reorder":
            return {
                "status": "error",
                "error_type": "not_implemented",
                "message": "reorder is not implemented in the Demo build. Use insert or replace.",
            }
        else:
            return {
                "status": "error",
                "error_type": "invalid_action",
                "message": f"Unknown patch type: {action_type}. Valid values: insert, replace, reorder.",
            }

    def is_complete(self) -> bool:
        """Return True if the archive has no errors (compilation succeeded)."""
        return len(self.compile()) == 0

    # ------------------------------------------------------------------ #
    # Internal helpers                                                      #
    # ------------------------------------------------------------------ #

    def _trial_validate(
        self,
        action_type: str,
        target_event_id: str | None,
        after_event_id: str | None,
        new_event_data: dict | None,
        errors_before: int,
    ) -> dict | None:
        """
        Simulate the patch on a deep copy of the event list.
        Returns:
            None — the patch reduces causal errors; commit normally.
            {"content_lost": True, "errors_before": N, "errors_after": M}
                — the patch does NOT reduce errors. Caller still commits the
                  node (so the narrative connects to surrounding text), but
                  flags it as content_lost and bumps score by +1.
        """
        # reorder is not implemented; let apply_patch handle it normally
        if action_type not in ("insert", "replace"):
            return None

        snapshot = copy.deepcopy(self.events)
        snapshot_counter = self.patch_counter  # won't change the real counter

        try:
            if action_type == "insert":
                if after_event_id is None or not new_event_data:
                    return None  # let the real method return the parameter error

                idx = next(
                    (i for i, e in enumerate(snapshot) if e["id"] == after_event_id),
                    None,
                )
                if idx is None:
                    return None  # let the real method return event_not_found

                new_event = {
                    "id": f"evt_trial_{snapshot_counter + 1:03d}",
                    "label": new_event_data.get("label", "Trial Node"),
                    "text": new_event_data.get("text", ""),
                    "requires": new_event_data.get("requires", []),
                    "provides": new_event_data.get("provides", []),
                }
                snapshot.insert(idx + 1, new_event)

            elif action_type == "replace":
                if target_event_id is None or not new_event_data:
                    return None  # let the real method return the parameter error

                idx = next(
                    (i for i, e in enumerate(snapshot) if e["id"] == target_event_id),
                    None,
                )
                if idx is None:
                    return None  # let the real method return event_not_found

                old = snapshot[idx]
                snapshot[idx] = {
                    "id": target_event_id,
                    "label": new_event_data.get("label", old["label"]),
                    "text": new_event_data.get("text", old["text"]),
                    "requires": new_event_data.get("requires", old["requires"]),
                    "provides": new_event_data.get("provides", old["provides"]),
                }

            # Evaluate error count on the snapshot
            tag_pool = set(self.initial_tags)
            errors_after = 0
            for event in snapshot:
                missing = [t for t in event["requires"] if t not in tag_pool]
                if missing:
                    errors_after += 1
                tag_pool.update(event.get("provides", []))

            if errors_after >= errors_before:
                return {
                    "content_lost": True,
                    "errors_before": errors_before,
                    "errors_after": errors_after,
                }

        except Exception:
            # If simulation itself fails, let the real method surface the error
            pass

        return None

    def _find_event_index(self, event_id: str) -> int | None:
        for i, evt in enumerate(self.events):
            if evt["id"] == event_id:
                return i
        return None

    def _tag_pool_up_to(self, index: int) -> set:
        """Compute the tag pool accumulated by all events before position index (exclusive)."""
        pool = set(self.initial_tags)
        for evt in self.events[:index]:
            pool.update(evt.get("provides", []))
        return pool

    def _insert_event(
        self,
        after_event_id: str | None,
        new_event_data: dict | None,
        content_lost: bool = False,
        errors_before: int | None = None,
        errors_after_trial: int | None = None,
    ) -> dict:
        if after_event_id is None:
            return {
                "status": "error",
                "error_type": "missing_parameter",
                "message": "insert requires the after_event_id parameter.",
            }
        if not new_event_data:
            return {
                "status": "error",
                "error_type": "missing_parameter",
                "message": "insert requires the new_event_data parameter.",
            }

        idx = self._find_event_index(after_event_id)
        if idx is None:
            return {
                "status": "error",
                "error_type": "event_not_found",
                "message": f"Target event node [{after_event_id}] does not exist on the current timeline.",
            }

        insert_idx = idx + 1

        # Check whether the new event's requires are satisfied at the insertion point.
        # On the content_lost path we deliberately skip this guard: the trial has
        # already determined the patch doesn't help, and the player's spec says the
        # node must commit anyway so the prose can connect. compile() will surface
        # the resulting causal_missing on the new node naturally.
        pool_at_insert = self._tag_pool_up_to(insert_idx)
        new_requires = new_event_data.get("requires", [])
        missing = [tag for tag in new_requires if tag not in pool_at_insert]
        if missing and not content_lost:
            return {
                "status": "error",
                "error_type": "causal_missing",
                "missing_tags": missing,
                "message": (
                    f"The new event itself is missing prerequisite tag(s): {missing}. "
                    "Patch cannot be applied here -- the new event's prerequisites are also unmet."
                ),
            }

        # Create the new event node
        self.patch_counter += 1
        new_id = f"evt_patch_{self.patch_counter:03d}"
        new_event = {
            "id": new_id,
            "label": new_event_data.get("label", f"Patch Node #{self.patch_counter}"),
            "text": new_event_data.get("text", ""),
            "requires": new_requires,
            "provides": new_event_data.get("provides", []),
        }
        if content_lost:
            new_event["content_lost"] = True
            self.score += 1
        self.events.insert(insert_idx, new_event)
        self.patches_applied.append({"type": "insert", "new_event_id": new_id})

        # Re-compile to check whether all errors are resolved
        errors = self.compile()

        if content_lost:
            return {
                "status": "partial",
                "content_lost": True,
                "message": (
                    f"Patch committed to the timeline as [{new_id}], but the trial "
                    f"simulation showed it does NOT reduce causal contradictions "
                    f"(errors_before={errors_before}, errors_after={errors_after_trial}). "
                    f"Score +1 (now {self.score}). The narrative continues with "
                    f"unresolved tension.\n\n"
                    + CONTENT_LOST_DIRECTIVE
                ),
                "new_event_id": new_id,
                "provides": new_event["provides"],
                "remaining_errors": errors,
                "score": self.score,
            }

        if not errors:
            return {
                "status": "success",
                "message": "Patch applied successfully. Causal chain rebuilt. Subsequent memory blocks unlocked.",
                "new_event_id": new_id,
                "provides": new_event["provides"],
            }
        else:
            return {
                "status": "partial",
                "message": "Patch inserted, but the timeline still contains errors.",
                "new_event_id": new_id,
                "remaining_errors": errors,
            }

    def _replace_event(
        self,
        target_event_id: str | None,
        new_event_data: dict | None,
        content_lost: bool = False,
        errors_before: int | None = None,
        errors_after_trial: int | None = None,
    ) -> dict:
        if target_event_id is None:
            return {
                "status": "error",
                "error_type": "missing_parameter",
                "message": "replace requires the target_event_id parameter.",
            }
        if not new_event_data:
            return {
                "status": "error",
                "error_type": "missing_parameter",
                "message": "replace requires the new_event_data parameter.",
            }

        idx = self._find_event_index(target_event_id)
        if idx is None:
            return {
                "status": "error",
                "error_type": "event_not_found",
                "message": f"Target event node [{target_event_id}] does not exist on the current timeline.",
            }

        old_event = self.events[idx]
        replaced_event = {
            "id": target_event_id,
            "label": new_event_data.get("label", old_event["label"]),
            "text": new_event_data.get("text", old_event["text"]),
            "requires": new_event_data.get("requires", old_event["requires"]),
            "provides": new_event_data.get("provides", old_event["provides"]),
        }
        if content_lost:
            replaced_event["content_lost"] = True
            self.score += 1
        self.events[idx] = replaced_event
        self.patches_applied.append({"type": "replace", "event_id": target_event_id})

        errors = self.compile()

        if content_lost:
            return {
                "status": "partial",
                "content_lost": True,
                "message": (
                    f"Replacement committed at [{target_event_id}], but the trial "
                    f"simulation showed it does NOT reduce causal contradictions "
                    f"(errors_before={errors_before}, errors_after={errors_after_trial}). "
                    f"Score +1 (now {self.score}). The narrative continues with "
                    f"unresolved tension.\n\n"
                    + CONTENT_LOST_DIRECTIVE
                ),
                "modified_event_id": target_event_id,
                "remaining_errors": errors,
                "score": self.score,
            }

        if not errors:
            return {
                "status": "success",
                "message": "Event node replaced successfully. Causal chain rebuilt.",
                "modified_event_id": target_event_id,
            }
        else:
            return {
                "status": "partial",
                "message": "Node replaced, but the timeline still contains errors.",
                "modified_event_id": target_event_id,
                "remaining_errors": errors,
            }
