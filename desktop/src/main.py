import time
import logging
import os
import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

KST = timezone(timedelta(hours=9))

# exe 위치 기준 절대 경로 (자동 실행 시 작업 디렉토리 문제 방지)
if getattr(sys, 'frozen', False):
    APP_DIR = Path(sys.executable).parent
else:
    APP_DIR = Path(__file__).parent.parent

from src.detectors.reboot_detector import check_reboot
from src.detectors.process_detector import get_node_status
from src.detectors.port_detector import get_port_status, check_ports
from src.notifier.telegram import send_message
from src.notifier import pilink
from src.tray import TrayIcon
from src.setup_wizard import show_update_notice, is_configured, run_setup_wizard

# 로깅 (로컬 전용)
LOG_DIR = APP_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)
logging.basicConfig(
    filename=str(LOG_DIR / "guardian.log"),
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
        self.last_process_alert_time: datetime | None = None
        self.process_down_since: datetime | None = None

        # 포트 상태
        self.port_status = "healthy"     # healthy | partial | critical
        self.port_fail_duration = 0  # 초
        self.last_port_alert_time: datetime | None = None
        self.port_down_since: datetime | None = None

    def is_overall_healthy(self) -> bool:
        return self.process_status == "healthy" and self.port_status == "healthy"


state = GuardianState()

# 파라미터
CHECK_INTERVAL = 30
CRITICAL_THRESHOLD = 3        # critical 3회 연속 → 알림 (90초)
WARNING_THRESHOLD = 10        # warning 10회 연속 → 알림 (5분)
PORT_CRITICAL_DURATION = 180  # 포트 전체 닫힘 3분 지속 → 알림
PORT_PARTIAL_DURATION = 600   # 포트 일부 닫힘 10분 지속 → 알림
REPEAT_INTERVAL = 3600        # 이상 상태 지속 시 1시간마다 재알림


def _should_repeat(last_alert_time: datetime | None) -> bool:
    if last_alert_time is None:
        return False
    return (datetime.now(KST) - last_alert_time).total_seconds() >= REPEAT_INTERVAL


def _elapsed(since: datetime | None) -> str:
    if since is None:
        return ""
    total_min = int((datetime.now(KST) - since).total_seconds() / 60)
    if total_min >= 60:
        return f"{total_min // 60}시간 {total_min % 60}분째 미복구 중"
    return f"{total_min}분째 미복구 중"


def main():
    logging.info("Node Guardian 시작")

    # .env 로드 (초기 실행 전)
    from src.setup_wizard import get_env_path
    load_dotenv(get_env_path(), override=True)

    # 초기 설정 마법사 (미설정 시)
    if not is_configured():
        completed = run_setup_wizard()
        if not completed:
            return
        # 설정 완료 후 .env 재로드
        load_dotenv(get_env_path(), override=True)

    # 버전 체크 (업데이트 필요 시 팝업 표시 후 계속 실행)
    update_info = pilink.check_version()
    if update_info:
        show_update_notice(
            required_version=update_info.get('required_version', ''),
            download_url=update_info.get('download_url', 'https://github.com/kmm851010-maker/node-guardian/releases/latest'),
        )

    # 트레이 아이콘 시작
    tray = TrayIcon(on_quit=lambda: None)
    tray.run()
    tray.set_status("unknown", "시작 중...")

    send_message("🟢 Node Guardian 가동 시작")
    pilink.send_event("startup", "info", "Node Guardian 가동 시작")

    # 1. 재부팅 감지 (시작 시 1회)
    rebooted, boot_time = check_reboot()
    if rebooted:
        kst_time = boot_time.astimezone(KST)
        msg = f"🔄 <b>PC 재부팅 감지</b>\n시각: {kst_time.strftime('%Y-%m-%d %H:%M:%S')} (KST)"
        send_message(msg)
        logging.info(f"재부팅: {boot_time}")

    # 2. 주기적 감시
    while True:
        try:
            # === Layer 2: 프로세스 ===
            proc_status, critical_down, warning_down = get_node_status()

            if proc_status == "critical":
                state.critical_fail_count += 1
                now = datetime.now(KST)
                first_alert = state.process_status != "critical"
                repeat_alert = state.process_status == "critical" and _should_repeat(state.last_process_alert_time)

                if state.critical_fail_count >= CRITICAL_THRESHOLD and (first_alert or repeat_alert):
                    if first_alert:
                        state.process_status = "critical"
                        state.process_down_since = now
                        msg = (
                            f"🚨 <b>노드 서비스 중단</b>\n"
                            f"중단된 프로세스: {', '.join(critical_down)}\n"
                            f"⚠️ Docker 또는 노드 본체가 죽었습니다. 확인 필요."
                        )
                    else:
                        msg = (
                            f"🚨 <b>[재알림] 노드 서비스 중단 지속</b>\n"
                            f"중단된 프로세스: {', '.join(critical_down)}\n"
                            f"⏱ {_elapsed(state.process_down_since)}\n"
                            f"⚠️ 아직 복구되지 않았습니다. 확인 필요."
                        )
                    state.last_process_alert_time = now
                    send_message(msg)
                    pilink.send_event("process_critical", "critical", msg, {"processes": critical_down})
                    logging.warning(f"CRITICAL: {critical_down}")

            elif proc_status == "warning":
                state.warning_fail_count += 1
                state.critical_fail_count = 0
                now = datetime.now(KST)
                first_alert = state.process_status == "healthy"
                repeat_alert = state.process_status == "warning" and _should_repeat(state.last_process_alert_time)

                if state.warning_fail_count >= WARNING_THRESHOLD and (first_alert or repeat_alert):
                    if first_alert:
                        state.process_status = "warning"
                        state.process_down_since = now
                        msg = (
                            f"⚠️ <b>Pi Network GUI 중단</b>\n"
                            f"중단: {', '.join(warning_down)}\n"
                            f"ℹ️ 노드는 계속 동작 중이나 GUI 재시작 권장."
                        )
                    else:
                        msg = (
                            f"⚠️ <b>[재알림] Pi Network GUI 중단 지속</b>\n"
                            f"중단: {', '.join(warning_down)}\n"
                            f"⏱ {_elapsed(state.process_down_since)}\n"
                            f"ℹ️ 아직 복구되지 않았습니다."
                        )
                    state.last_process_alert_time = now
                    send_message(msg)
                    pilink.send_event("process_warning", "warning", msg, {"processes": warning_down})
                    logging.warning(f"WARNING: {warning_down}")

            else:  # healthy
                if state.process_status != "healthy":
                    send_message("✅ <b>프로세스 정상 복구</b>")
                    pilink.send_event("process_recovery", "recovery", "프로세스 정상 복구")
                    logging.info("프로세스 복구")
                state.process_status = "healthy"
                state.critical_fail_count = 0
                state.warning_fail_count = 0
                state.last_process_alert_time = None
                state.process_down_since = None

            # === Layer 3: 포트 ===
            port_stat, closed = get_port_status()
            all_ports = check_ports()  # {31400: True/False, ...}

            if port_stat == "critical":
                state.port_fail_duration += CHECK_INTERVAL
                now = datetime.now(KST)
                first_alert = state.port_status != "critical"
                repeat_alert = state.port_status == "critical" and _should_repeat(state.last_port_alert_time)

                if state.port_fail_duration >= PORT_CRITICAL_DURATION and (first_alert or repeat_alert):
                    if first_alert:
                        state.port_status = "critical"
                        state.port_down_since = now
                        msg = (
                            f"🚨 <b>노드 포트 완전 차단</b>\n"
                            f"닫힌 포트: {closed}\n"
                            f"⚠️ 노드가 블록체인에서 완전히 단절됨."
                        )
                    else:
                        msg = (
                            f"🚨 <b>[재알림] 노드 포트 차단 지속</b>\n"
                            f"닫힌 포트: {closed}\n"
                            f"⏱ {_elapsed(state.port_down_since)}\n"
                            f"⚠️ 아직 복구되지 않았습니다."
                        )
                    state.last_port_alert_time = now
                    send_message(msg)
                    pilink.send_event("port_critical", "critical", msg, {"closed_ports": closed, "port_detail": all_ports})
                    logging.warning(f"PORT CRITICAL: {closed}")

            else:  # healthy (하나 이상 포트 열림)
                if state.port_status != "healthy":
                    send_message("✅ <b>포트 정상 복구</b>")
                    pilink.send_event("port_recovery", "recovery", "포트 정상 복구", {"port_detail": all_ports})
                    logging.info("포트 복구")
                state.port_status = "healthy"
                state.port_fail_duration = 0
                state.last_port_alert_time = None
                state.port_down_since = None

            # 트레이 아이콘 상태 업데이트
            overall = "critical" if state.process_status == "critical" or state.port_status == "critical" \
                else "warning" if state.process_status == "warning" or state.port_status == "partial" \
                else "healthy"
            detail_parts = []
            if state.process_status == "critical":
                detail_parts.append(f"프로세스 중단: {', '.join(critical_down)}")
            if state.process_status == "warning":
                detail_parts.append(f"GUI 중단: {', '.join(warning_down)}")
            if state.port_status == "critical":
                detail_parts.append(f"포트 차단: {closed}")
            elif state.port_status == "partial":
                detail_parts.append(f"포트 일부 차단: {closed}")
            tray.set_status(overall, " | ".join(detail_parts))

            # 하트비트: 5분(10루프)마다 last_seen 갱신 (events 테이블엔 저장 안 됨)
            if not hasattr(state, '_heartbeat_count'):
                state._heartbeat_count = 0
            state._heartbeat_count += 1
            if state._heartbeat_count >= 10:
                pilink.send_event("heartbeat", "info", "heartbeat")
                state._heartbeat_count = 0

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
