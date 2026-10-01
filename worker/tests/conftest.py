import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("TMP_DIR", str(Path(__file__).parent / "tmp"))
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")
