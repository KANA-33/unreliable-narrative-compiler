#!/usr/bin/env python3
"""
start.py — Launch both Flask backend and Vite dev frontend together.
Press Ctrl+C to stop everything.
"""

import subprocess
import sys
import os
import threading
import signal

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND  = os.path.join(ROOT, "backend")
FRONTEND = os.path.join(ROOT, "frontend")


def stream(proc: subprocess.Popen, prefix: str, color: str):
    """Read a process stdout line by line and print with a colored prefix."""
    reset = "\033[0m"
    out = sys.stdout.buffer if hasattr(sys.stdout, "buffer") else None
    for raw in iter(proc.stdout.readline, b""):
        text = raw.decode("utf-8", errors="replace").rstrip()
        line = f"{color}[{prefix}]{reset} {text}\n"
        if out:
            out.write(line.encode("utf-8", errors="replace"))
            out.flush()
        else:
            print(line, end="")


def main():
    print("\033[1m  UNC_SYSTEM - starting dev environment...\033[0m")
    print("  [flask] http://localhost:5000  (API)")
    print("  [vite]  http://localhost:5173  (open this)\n")

    npm_cmd = ["npm.cmd", "run", "dev"] if sys.platform == "win32" else ["npm", "run", "dev"]

    flask_proc = subprocess.Popen(
        [sys.executable, "app.py"],
        cwd=BACKEND,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    vite_proc = subprocess.Popen(
        npm_cmd,
        cwd=FRONTEND,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )

    procs = [flask_proc, vite_proc]

    # Stream output from both processes in background threads
    flask_color = "\033[34m"   # blue
    vite_color  = "\033[32m"   # green
    threading.Thread(target=stream, args=(flask_proc, "flask", flask_color), daemon=True).start()
    threading.Thread(target=stream, args=(vite_proc,  "vite ", vite_color),  daemon=True).start()

    def shutdown(sig=None, frame=None):
        print("\n\033[33m  Shutting down...\033[0m")
        for p in procs:
            try:
                p.terminate()
            except Exception:
                pass
        for p in procs:
            try:
                p.wait(timeout=5)
            except Exception:
                p.kill()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    # Wait — if either process exits unexpectedly, shut everything down
    while True:
        for p in procs:
            if p.poll() is not None:
                print(f"\033[31m  A process exited unexpectedly (code {p.returncode}). Shutting down.\033[0m")
                shutdown()
        threading.Event().wait(1)


if __name__ == "__main__":
    main()
