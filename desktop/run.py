import sys
import os

# exe 실행 시 .env 경로를 exe 폴더로 설정
if getattr(sys, 'frozen', False):
    app_dir = os.path.dirname(sys.executable)
    os.chdir(app_dir)

from src.setup_wizard import is_configured, run_setup_wizard

if not is_configured():
    ok = run_setup_wizard()
    if not ok:
        sys.exit(0)

# .env 파일 직접 파싱 (python-dotenv 라이브러리 없이)
def _load_env(path='.env'):
    if not os.path.exists(path):
        return
    with open(path, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, _, v = line.partition('=')
                os.environ.setdefault(k.strip(), v.strip())

_load_env()

from src.main import main

if __name__ == "__main__":
    main()
