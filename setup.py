#!/usr/bin/env python3
"""
LLM HUD setup helper.

Handles the common issue of running on Google Drive (or other cloud-synced folders)
where npm node_modules cannot be installed correctly due to virtual filesystem
limitations.

Usage:
    python setup.py         # install backend + frontend deps and build
    python setup.py --dev   # same, but skip frontend build (use npm run dev separately)
"""
import argparse
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).parent.resolve()
FRONTEND = ROOT / "frontend"
LOCAL_BUILD_DIR = Path.home() / ".llm-hud" / "build"


def run(cmd: list, cwd=None, check=True):
    print(f"  $ {' '.join(str(c) for c in cmd)}")
    return subprocess.run(cmd, cwd=cwd or ROOT, check=check)


def is_cloud_drive(path: Path) -> bool:
    """Heuristic: detect Google Drive or OneDrive paths."""
    path_str = str(path).lower()
    cloud_indicators = ["google drive", "my drive", "onedrive", "dropbox", "box sync", "icloud"]
    return any(ind in path_str for ind in cloud_indicators)


def setup_backend():
    print("\n[1/3] Setting up Python backend...")
    venv = ROOT / ".venv"
    if not venv.exists():
        run([sys.executable, "-m", "venv", str(venv)])
    pip = venv / ("Scripts" if platform.system() == "Windows" else "bin") / "pip"
    run([str(pip), "install", "-r", "backend/requirements.txt"])
    print("  ✓ Backend dependencies installed")


def setup_frontend(dev: bool = False):
    print("\n[2/3] Setting up frontend...")
    node_modules = FRONTEND / "node_modules"

    on_cloud = is_cloud_drive(ROOT)
    if on_cloud:
        print(f"  ⚠ Project is on a cloud-synced drive: {ROOT}")
        print(f"  → Installing node_modules to local cache: {LOCAL_BUILD_DIR}")
        build_dir = LOCAL_BUILD_DIR
        build_dir.mkdir(parents=True, exist_ok=True)
        # Copy package files
        for f in ["package.json", "package-lock.json"]:
            src = FRONTEND / f
            if src.exists():
                shutil.copy2(src, build_dir / f)
        run(["npm", "install"], cwd=build_dir)
        # Copy node_modules to cloud dir (or symlink if OS supports it)
        print(f"  → Copying node_modules back to project...")
        if node_modules.exists():
            shutil.rmtree(node_modules, ignore_errors=True)
        shutil.copytree(build_dir / "node_modules", node_modules)
    else:
        run(["npm", "install"], cwd=FRONTEND)

    print("  ✓ Frontend dependencies installed")

    if not dev:
        build_frontend()


def build_frontend():
    print("\n[3/3] Building frontend...")
    node_modules = FRONTEND / "node_modules"
    vite_bin = node_modules / ".bin" / ("vite.cmd" if platform.system() == "Windows" else "vite")

    if not vite_bin.exists():
        # Fallback: try node + vite.js directly
        vite_js = node_modules / "vite" / "bin" / "vite.js"
        if vite_js.exists():
            run(["node", str(vite_js), "build"], cwd=FRONTEND)
        else:
            print("  ⚠ vite not found — run 'npm run dev' manually in the frontend/ directory")
            return
    else:
        run([str(vite_bin), "build"], cwd=FRONTEND)

    print("  ✓ Frontend built → frontend/dist/")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dev", action="store_true", help="Skip frontend build (use npm run dev separately)")
    parser.add_argument("--backend-only", action="store_true")
    parser.add_argument("--frontend-only", action="store_true")
    args = parser.parse_args()

    print("=" * 50)
    print("  LLM HUD Setup")
    print("=" * 50)

    if not args.frontend_only:
        setup_backend()
    if not args.backend_only:
        setup_frontend(dev=args.dev)

    print("\n" + "=" * 50)
    print("  Setup complete!")
    print("")
    print("  Start the app:  python run.py")
    if args.dev:
        print("  Frontend dev:   cd frontend && npm run dev")
    print("=" * 50 + "\n")


if __name__ == "__main__":
    main()
