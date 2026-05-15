import sys
import psutil
from datetime import datetime
from pathlib import Path

if getattr(sys, 'frozen', False):
    _APP_DIR = Path(sys.executable).parent
else:
    _APP_DIR = Path(__file__).parent.parent.parent

LAST_BOOT_FILE = _APP_DIR / "logs" / "last_boot.txt"

def get_current_boot_time() -> datetime:
    return datetime.fromtimestamp(psutil.boot_time())

def get_saved_boot_time() -> datetime | None:
    if not LAST_BOOT_FILE.exists():
        return None
    try:
        with open(LAST_BOOT_FILE, "r") as f:
            return datetime.fromisoformat(f.read().strip())
    except Exception:
        return None

def save_boot_time(boot_time: datetime) -> None:
    LAST_BOOT_FILE.parent.mkdir(exist_ok=True)
    with open(LAST_BOOT_FILE, "w") as f:
        f.write(boot_time.isoformat())

def check_reboot() -> tuple[bool, datetime]:
    current = get_current_boot_time()
    saved = get_saved_boot_time()

    if saved is None:
        save_boot_time(current)
        return (False, current)

    if current != saved:
        save_boot_time(current)
        return (True, current)

    return (False, current)
