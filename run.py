#!/usr/bin/env python3
"""
LLM HUD — one-command launcher.

Usage:
    python run.py            # starts backend; open http://localhost:8000 in browser
    python run.py --no-open  # skip auto-opening the browser
    python run.py --port 9000
"""
import argparse
import platform
import subprocess
import sys
import time
import webbrowser
from pathlib import Path


ROOT = Path(__file__).parent


def _venv_python() -> Path | None:
    """Return the venv Python executable if a .venv exists next to this file."""
    venv = ROOT / ".venv"
    if platform.system() == "Windows":
        candidate = venv / "Scripts" / "python.exe"
    else:
        candidate = venv / "bin" / "python"
    return candidate if candidate.exists() else None


def _ensure_venv():
    """If not already running inside the .venv, re-exec with its Python."""
    venv_py = _venv_python()
    if venv_py is None:
        return  # no venv present — user manages their own env
    # sys.executable inside the venv will contain ".venv" in its path
    if ".venv" not in sys.executable.replace("\\", "/"):
        # Re-launch with the venv Python. os.execv mangles paths with spaces
        # on Windows, so use subprocess + sys.exit instead.
        result = subprocess.run([str(venv_py)] + sys.argv)
        sys.exit(result.returncode)


def check_frontend_build():
    dist = ROOT / "frontend" / "dist"
    if not dist.exists():
        print("  Frontend not built yet. Run:")
        print("    python setup.py          # automated")
        print("    # or manually:")
        print("    cd frontend && npm install && npm run build")
        print("  Or for development: npm run dev (in a separate terminal)")
        return False
    return True


def main():
    _ensure_venv()  # transparently re-exec inside .venv if needed

    parser = argparse.ArgumentParser(description="Start LLM HUD backend")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--no-open", action="store_true", help="Don't open browser")
    parser.add_argument("--dev", action="store_true", help="Enable uvicorn --reload (dev mode)")
    args = parser.parse_args()

    root = ROOT

    has_frontend = check_frontend_build()
    if not has_frontend:
        print("\n  The backend will still start. Use http://127.0.0.1:5173 for the Vite dev server.")

    url = f"http://{args.host}:{args.port}"
    print(f"\n  LLM HUD backend -> {url}")
    print(f"  API docs         -> {url}/docs\n")

    cmd = [
        sys.executable, "-m", "uvicorn",
        "backend.main:app",
        "--host", args.host,
        "--port", str(args.port),
    ]
    if args.dev:
        cmd.append("--reload")

    if not args.no_open:
        # Delay browser open slightly to let the server boot
        import threading
        def _open():
            time.sleep(1.5)
            webbrowser.open(url)
        threading.Thread(target=_open, daemon=True).start()

    try:
        subprocess.run(cmd, cwd=str(root), check=True)
    except KeyboardInterrupt:
        print("\n  Stopped.")


if __name__ == "__main__":
    main()
