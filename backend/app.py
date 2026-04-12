"""Run the Flask API from backend/: python app.py"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

_APP = Path(__file__).resolve().parent / "backend" / "app.py"


if __name__ == "__main__":
    if not _APP.is_file():
        sys.stderr.write(f"Missing {_APP}\n")
        sys.exit(1)
    backend_dir = _APP.parent
    raise SystemExit(
        subprocess.call([sys.executable, str(_APP)], cwd=str(backend_dir))
    )
