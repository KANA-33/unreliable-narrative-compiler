# game_engine.py
# Local state machine: validates story event graph consistency and applies patches

import copy


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
                "id": e["id"],
                "label": e["label"],
                "requires": e["requires"],
                "provides": e["provides"],
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

        # Trial-run on a snapshot to check whether the patch improves anything
        rejection = self._trial_validate(
            action_type, target_event_id, after_event_id, new_event_data, errors_before
        )
        if rejection is not None:
            return rejection

        if action_type == "insert":
            return self._insert_event(after_event_id, new_event_data)
        elif action_type == "replace":
            return self._replace_event(target_event_id, new_event_data)
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
        Returns a rejection dict if the patch would not reduce errors,
        or None if the patch is valid and should proceed.
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
                    "status": "rejected",
                    "error_type": "no_improvement",
                    "message": (
                        f"PATCH REJECTED. Trial simulation shows no reduction in causal errors "
                        f"(before={errors_before}, after={errors_after}). "
                        "Operator must re-analyse the dependency chain and propose a valid fix."
                    ),
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

    def _insert_event(self, after_event_id: str | None, new_event_data: dict | None) -> dict:
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

        # Check whether the new event's requires are satisfied at the insertion point
        pool_at_insert = self._tag_pool_up_to(insert_idx)
        new_requires = new_event_data.get("requires", [])
        missing = [tag for tag in new_requires if tag not in pool_at_insert]
        if missing:
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
        self.events.insert(insert_idx, new_event)
        self.patches_applied.append({"type": "insert", "new_event_id": new_id})

        # Re-compile to check whether all errors are resolved
        errors = self.compile()
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

    def _replace_event(self, target_event_id: str | None, new_event_data: dict | None) -> dict:
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
        self.events[idx] = replaced_event
        self.patches_applied.append({"type": "replace", "event_id": target_event_id})

        errors = self.compile()
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
