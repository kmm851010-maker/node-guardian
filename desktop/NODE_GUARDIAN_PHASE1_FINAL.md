# Node Guardian Phase 1 — 실측 반영 최종 STEP 문서

**버전**: Phase 1 v1.1 (실측 반영)
**소요 예상**: 1~2일 코딩 + 7일 실전 검증
**대상 환경**: Serge PC (Windows, Pi Node 가동 중)

---

## 📋 실측 결과 반영 사항

### 프로세스 실측 (2026-04-16)
```
Pi Network (PID 9116, 11008, 13384, 20624, 21388) — Electron 기반 5개 프로세스
Docker Desktop (PID 22152, 22284, 22468)
com.docker.backend (PID 22912, 23140) — 실제 노드 서비스 담당
com.docker.build (PID 22204)
```

### 포트 실측 (2026-04-16)
```
TCP 31401 LISTENING (PID 23140)
TCP 31402 LISTENING (PID 23140)
TCP 31403 LISTENING (PID 23140)
```

### 핵심 발견
**진짜 노드 서비스는 `com.docker.backend` (PID 23140)에서 포트 31401-31403으로 돌아간다.** Pi Network GUI 프로세스는 사용자 인터페이스일 뿐, 노드 건강의 직접 지표가 아니다. 감지 로직은 이 사실을 반영한다.

---

## ⚠️ Claude Code 실행 표준 명령 템플릿

```bash
cd C:\Projects\node-guardian
git status
git log --oneline -5
cat docs/PHASE1_STEPS.md | head -50
```

**에러 시**: Claude Code 529 overload → `/model`로 Sonnet 전환.

---

## 🔒 Phase 1 보안 체크리스트

1. ✅ GitHub 레포 Public 생성
2. ✅ `.gitignore`에 `.env`, `config.local.json`, `logs/` 포함
3. ✅ 텔레그램 봇 토큰은 `.env`로만 관리, 코드 하드코딩 금지
4. ✅ 외부 전송 코드 부재 확인 (텔레그램 API 외 네트워크 호출 금지)

---

## STEP 1-1. 프로젝트 초기화

### 디렉토리 구조
```
node-guardian/
├── src/
│   ├── __init__.py
│   ├── main.py
│   ├── detectors/
│   │   ├── __init__.py
│   │   ├── reboot_detector.py
│   │   ├── process_detector.py
│   │   └── port_detector.py
│   ├── notifier/
│   │   ├── __init__.py
│   │   └── telegram.py
│   └── config.py
├── logs/
├── docs/
├── .env.example
├── .gitignore
├── README.md
├── LICENSE
└── requirements.txt
```

### requirements.txt
```
python-telegram-bot==21.6
python-dotenv==1.0.1
psutil==6.0.0
requests==2.32.3
```
(pywin32는 Phase 2 서비스화에서 추가)

### README.md 투명성 선언
```markdown
# Node Guardian

> Pi Node 운영자를 위한 오픈소스 모니터링 도구

## 🔒 투명성 선언

이 프로그램은 사용자의 노드 데이터를 외부로 전송하지 않습니다.
텔레그램으로 전송되는 것은 "재부팅됨", "노드 중단", "복구됨"과 같은
이벤트 메시지뿐입니다. 노드 성능 데이터, IP 주소, 개인 정보는
일절 수집하지 않습니다.

직접 코드를 확인하시려면 `src/` 폴더를 살펴보세요.
```

### .gitignore
```
__pycache__/
*.pyc
.venv/
venv/
.env
config.local.json
logs/
*.log
dist/
build/
*.spec
.vscode/
.idea/
```

### .env.example
```
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

### 완료 조건
- [ ] GitHub Public 레포 생성
- [ ] 위 구조 생성
- [ ] README 투명성 선언 포함
- [ ] `.env` 커밋 제외 확인

---

## STEP 1-2. 텔레그램 봇 연결

### .env 파일 (로컬 전용)
```
TELEGRAM_BOT_TOKEN=[Serge 개인 봇 토큰]
TELEGRAM_CHAT_ID=823899101
```

### src/notifier/telegram.py
```python
import os
import requests
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

def send_message(text: str) -> bool:
    if not BOT_TOKEN or not CHAT_ID:
        print("[ERROR] 봇 토큰 또는 챗ID 미설정")
        return False

    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {"chat_id": CHAT_ID, "text": text, "parse_mode": "HTML"}

    try:
        resp = requests.post(url, json=payload, timeout=10)
        return resp.status_code == 200
    except Exception as e:
        print(f"[ERROR] 텔레그램 전송 실패: {e}")
        return False

if __name__ == "__main__":
    ok = send_message("🟢 Node Guardian 연결 테스트 성공")
    print("성공" if ok else "실패")
```

### 완료 조건
- [ ] `python -m src.notifier.telegram` 실행 후 폰 메시지 수신

---

## STEP 1-3. Layer 1 — 재부팅 감지

### src/detectors/reboot_detector.py
```python
import psutil
from datetime import datetime
from pathlib import Path

LAST_BOOT_FILE = Path("logs/last_boot.txt")

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
```

### 완료 조건
- [ ] 최초 실행 False 반환
- [ ] PC 재부팅 후 True 반환
- [ ] 재실행 시 다시 False 반환

---

## STEP 1-4. Layer 2 — 프로세스 감지 (실측 반영)

### src/detectors/process_detector.py
```python
import psutil

# 실측 기반: Serge PC 2026-04-16
# Pi Network GUI는 Electron 기반으로 여러 프로세스가 뜸 (최소 1개만 살아도 GUI 정상)
# Docker 백엔드가 진짜 노드 서비스 (필수)
CORE_PROCESSES = {
    "com.docker.backend": "critical",   # 노드 서비스 본체 — 죽으면 알림
    "Docker Desktop":     "critical",   # 도커 런타임 — 죽으면 알림
    "Pi Network":         "warning",    # GUI — 죽어도 노드 자체는 유지되나 경고
}


def check_processes() -> dict[str, dict]:
    """
    각 프로세스 생존 여부 및 개수 반환.
    Returns: {
        "com.docker.backend": {"alive": True, "count": 2, "severity": "critical"},
        ...
    }
    """
    # 현재 실행 중인 프로세스명 수집 (중복 포함 카운트)
    running = {}
    for p in psutil.process_iter(["name"]):
        name = p.info["name"]
        if name:
            running[name] = running.get(name, 0) + 1

    result = {}
    for target, severity in CORE_PROCESSES.items():
        count = running.get(target, 0)
        result[target] = {
            "alive": count > 0,
            "count": count,
            "severity": severity,
        }
    return result


def get_node_status() -> tuple[str, list[str], list[str]]:
    """
    노드 전체 상태 판정.
    Returns: (status, critical_down, warning_down)
      status: "healthy" | "critical" | "warning"
      critical_down: 죽은 critical 프로세스 리스트
      warning_down: 죽은 warning 프로세스 리스트
    """
    status = check_processes()

    critical_down = [
        name for name, info in status.items()
        if info["severity"] == "critical" and not info["alive"]
    ]
    warning_down = [
        name for name, info in status.items()
        if info["severity"] == "warning" and not info["alive"]
    ]

    if critical_down:
        return ("critical", critical_down, warning_down)
    if warning_down:
        return ("warning", critical_down, warning_down)
    return ("healthy", [], [])
```

### 실측 검증 방법
```bash
# Pi Node 가동 중 — 모두 healthy 확인
python -c "from src.detectors.process_detector import get_node_status; print(get_node_status())"

# Pi Network GUI만 수동 종료 후 — warning 확인
# (Docker Desktop은 계속 살아있음)
python -c "from src.detectors.process_detector import get_node_status; print(get_node_status())"
```

### 완료 조건
- [ ] 정상 상태 → `("healthy", [], [])`
- [ ] Pi Network GUI 종료 → `("warning", [], ["Pi Network"])`
- [ ] Docker Desktop 종료 → `("critical", ["com.docker.backend", "Docker Desktop"], [])`

---

## STEP 1-5. Layer 3 — 포트 감지 (실측 반영)

### src/detectors/port_detector.py
```python
import socket

# 실측 기반: Serge PC 2026-04-16
# Pi Node는 com.docker.backend(PID 23140)가 31401-31403 포트 서비스
NODE_PORTS = [31401, 31402, 31403]


def is_port_open(port: int, host: str = "127.0.0.1", timeout: float = 2.0) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False


def check_ports() -> dict[int, bool]:
    return {port: is_port_open(port) for port in NODE_PORTS}


def get_port_status() -> tuple[str, list[int]]:
    """
    포트 상태 판정.
    Returns: (status, closed_ports)
      status: "healthy" | "partial" | "critical"
        healthy: 모든 포트 열림
        partial: 일부만 열림 (동기화 중일 가능성)
        critical: 모두 닫힘 (노드 완전 중단)
    """
    status = check_ports()
    closed = [p for p, open_ in status.items() if not open_]

    if not closed:
        return ("healthy", [])
    if len(closed) == len(NODE_PORTS):
        return ("critical", closed)
    return ("partial", closed)
```

### 포트별 역할 (참고)
- 31401: Stellar Core P2P (노드 간 통신)
- 31402: Stellar Core HTTP (관리 인터페이스)
- 31403: Pi 노드 내부 통신

세 포트가 모두 닫히면 노드가 완전히 멈춘 것. 일부만 닫히면 동기화 중이거나 일시적 이슈일 수 있음 → 5분 지속 시에만 알림.

### 완료 조건
- [ ] 정상 시 `("healthy", [])`
- [ ] Docker 정지 시 `("critical", [31401, 31402, 31403])`

---

## STEP 1-6. 메인 루프 및 상태 머신 (실측 반영)

### src/main.py
```python
import time
import logging
from pathlib import Path

from src.detectors.reboot_detector import check_reboot
from src.detectors.process_detector import get_node_status
from src.detectors.port_detector import get_port_status
from src.notifier.telegram import send_message

# 로깅 (로컬 전용)
Path("logs").mkdir(exist_ok=True)
logging.basicConfig(
    filename="logs/guardian.log",
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    encoding="utf-8",
)


class GuardianState:
    def __init__(self):
        # 프로세스 상태
        self.process_status = "healthy"  # healthy | warning | critical
        self.critical_fail_count = 0
        self.warning_fail_count = 0

        # 포트 상태
        self.port_status = "healthy"     # healthy | partial | critical
        self.port_fail_duration = 0  # 초

    def is_overall_healthy(self) -> bool:
        return self.process_status == "healthy" and self.port_status == "healthy"


state = GuardianState()

# 파라미터
CHECK_INTERVAL = 30
CRITICAL_THRESHOLD = 3        # critical 3회 연속 → 알림 (90초)
WARNING_THRESHOLD = 10        # warning 10회 연속 → 알림 (5분)
PORT_CRITICAL_DURATION = 180  # 포트 전체 닫힘 3분 지속 → 알림
PORT_PARTIAL_DURATION = 600   # 포트 일부 닫힘 10분 지속 → 알림


def main():
    logging.info("Node Guardian 시작")
    send_message("🟢 Node Guardian 가동 시작")

    # 1. 재부팅 감지 (시작 시 1회)
    rebooted, boot_time = check_reboot()
    if rebooted:
        msg = f"🔄 <b>PC 재부팅 감지</b>\n시각: {boot_time.strftime('%Y-%m-%d %H:%M:%S')}"
        send_message(msg)
        logging.info(f"재부팅: {boot_time}")

    # 2. 주기적 감시
    while True:
        try:
            # === Layer 2: 프로세스 ===
            proc_status, critical_down, warning_down = get_node_status()

            if proc_status == "critical":
                state.critical_fail_count += 1
                if (state.critical_fail_count == CRITICAL_THRESHOLD
                        and state.process_status != "critical"):
                    state.process_status = "critical"
                    msg = (
                        f"🚨 <b>노드 서비스 중단</b>\n"
                        f"중단된 프로세스: {', '.join(critical_down)}\n"
                        f"⚠️ Docker 또는 노드 본체가 죽었습니다. 확인 필요."
                    )
                    send_message(msg)
                    logging.warning(f"CRITICAL: {critical_down}")

            elif proc_status == "warning":
                state.warning_fail_count += 1
                state.critical_fail_count = 0
                if (state.warning_fail_count == WARNING_THRESHOLD
                        and state.process_status == "healthy"):
                    state.process_status = "warning"
                    msg = (
                        f"⚠️ <b>Pi Network GUI 중단</b>\n"
                        f"중단: {', '.join(warning_down)}\n"
                        f"ℹ️ 노드는 계속 동작 중이나 GUI 재시작 권장."
                    )
                    send_message(msg)
                    logging.warning(f"WARNING: {warning_down}")

            else:  # healthy
                if state.process_status != "healthy":
                    send_message("✅ <b>프로세스 정상 복구</b>")
                    logging.info("프로세스 복구")
                state.process_status = "healthy"
                state.critical_fail_count = 0
                state.warning_fail_count = 0

            # === Layer 3: 포트 ===
            port_stat, closed = get_port_status()

            if port_stat == "critical":
                state.port_fail_duration += CHECK_INTERVAL
                if (state.port_fail_duration >= PORT_CRITICAL_DURATION
                        and state.port_status != "critical"):
                    state.port_status = "critical"
                    msg = (
                        f"🚨 <b>노드 포트 완전 차단</b>\n"
                        f"닫힌 포트: {closed}\n"
                        f"⚠️ 노드가 블록체인에서 완전히 단절됨."
                    )
                    send_message(msg)
                    logging.warning(f"PORT CRITICAL: {closed}")

            elif port_stat == "partial":
                state.port_fail_duration += CHECK_INTERVAL
                if (state.port_fail_duration >= PORT_PARTIAL_DURATION
                        and state.port_status == "healthy"):
                    state.port_status = "partial"
                    msg = (
                        f"⚠️ <b>일부 포트 응답 없음</b>\n"
                        f"닫힌 포트: {closed}\n"
                        f"ℹ️ 동기화 지연 가능성. 10분 경과."
                    )
                    send_message(msg)
                    logging.warning(f"PORT PARTIAL: {closed}")

            else:  # healthy
                if state.port_status != "healthy":
                    send_message("✅ <b>포트 정상 복구</b>")
                    logging.info("포트 복구")
                state.port_status = "healthy"
                state.port_fail_duration = 0

            time.sleep(CHECK_INTERVAL)

        except KeyboardInterrupt:
            logging.info("사용자 종료")
            send_message("🔴 Node Guardian 수동 종료")
            break
        except Exception as e:
            logging.error(f"예외: {e}", exc_info=True)
            time.sleep(CHECK_INTERVAL)


if __name__ == "__main__":
    main()
```

### 파라미터 설계 근거

| 항목 | 값 | 근거 |
|------|----|----|
| CRITICAL 3회(90초) | Docker 일시 재시작 오탐 방지 |
| WARNING 10회(5분) | GUI 업데이트/재시작 오탐 방지 |
| 포트 전체 차단 3분 | 진짜 중단 상황은 빨리 알려야 함 |
| 포트 일부 차단 10분 | 동기화 과정의 일시적 차단 필터링 |

### 알림 종류 정리

| 알림 | 발송 조건 | 심각도 |
|------|-----------|--------|
| 🟢 가동 시작 | 프로그램 실행 시 | info |
| 🔄 재부팅 감지 | 시스템 부팅 시각 변경 | info |
| 🚨 노드 서비스 중단 | Docker 계열 프로세스 중단 90초 | critical |
| ⚠️ Pi GUI 중단 | Pi Network 프로세스 중단 5분 | warning |
| 🚨 포트 완전 차단 | 31401-31403 전부 닫힘 3분 | critical |
| ⚠️ 포트 일부 차단 | 일부 닫힘 10분 | warning |
| ✅ 복구 알림 | 문제 → 정상 전환 시 | info |
| 🔴 수동 종료 | Ctrl+C 종료 시 | info |

### 완료 조건
- [ ] 정상 상태 24시간 구동 시 오탐 0건
- [ ] Pi Network 강제 종료 → 5분 후 warning 알림
- [ ] Docker Desktop 종료 → 90초 후 critical 알림
- [ ] 복구 시 ✅ 알림 수신

---

## STEP 1-7. 자동 시작 등록

### run_guardian.bat
```batch
@echo off
cd /d C:\Projects\node-guardian
call venv\Scripts\activate.bat
pythonw -m src.main
```

### 등록 방법
1. `Win + R` → `shell:startup` 입력
2. 열린 폴더에 `run_guardian.bat` 바로가기 생성
3. PC 재부팅 테스트

### 완료 조건
- [ ] 시작 프로그램 등록 완료
- [ ] 재부팅 후 자동 실행 확인
- [ ] 재부팅 알림 폰 수신

---

## STEP 1-8. 7일 실전 검증

| 항목 | 결과 |
|------|------|
| 7일 연속 구동 무오류 | ___ |
| 오탐 횟수 | ___ |
| Pi Network GUI 재시작 감지 횟수 | ___ |
| Docker 재시작 감지 횟수 | ___ |
| 포트 일시 차단 감지 횟수 | ___ |
| CPU 사용률 | ___% |
| 메모리 사용량 | ___MB |

---

## Phase 2 진입 조건

1. ✅ 7일 연속 무오작동
2. ✅ 실제 문제 상황 최소 1회 정상 감지
3. ✅ 오탐 0건
4. ✅ 감지 로직 신뢰 확보

---

## 참고: Claude Code 작업 순서 제안

```
# 1단계: 프로젝트 초기화
"Node Guardian Phase 1 STEP 1-1 진행. 디렉토리 구조 생성하고
README와 .gitignore 만들어줘. 실측 반영판 기준으로."

# 2단계: 텔레그램 연결
"STEP 1-2 진행. src/notifier/telegram.py 작성하고 .env 템플릿도."

# 3단계: 감지 모듈
"STEP 1-3, 1-4, 1-5 한꺼번에 진행. 세 디텍터 모두 작성."

# 4단계: 메인 루프
"STEP 1-6 진행. main.py 상태 머신 포함 작성."

# 5단계: 로컬 테스트
# Pi Network 수동 종료 → 5분 후 알림 수신 확인
# Docker Desktop 수동 종료 → 90초 후 알림 수신 확인
# 재시작 후 복구 알림 확인

# 6단계: 자동 시작 등록
"STEP 1-7 진행. run_guardian.bat 작성."
```
