import os
import requests
import logging

PILINK_API_URL = os.getenv("PILINK_API_URL", "")
PILINK_API_SECRET = os.getenv("PILINK_API_SECRET", "")
PILINK_PI_UID = os.getenv("PILINK_PI_UID", "")
PILINK_NICKNAME = os.getenv("PILINK_NICKNAME", "")


def send_event(
    event_type: str,
    severity: str,
    message: str,
    detail: dict | None = None,
) -> bool:
    """
    Node Guardian 이벤트를 PiLink API로 전송.
    PILINK_API_URL이 설정되지 않은 경우 조용히 건너뜀.
    """
    if not PILINK_API_URL or not PILINK_PI_UID:
        return False

    payload = {
        "pi_uid": PILINK_PI_UID,
        "nickname": PILINK_NICKNAME or PILINK_PI_UID,
        "event_type": event_type,
        "severity": severity,
        "message": message,
        "detail": detail,
    }

    try:
        res = requests.post(
            f"{PILINK_API_URL}/api/node-events",
            json=payload,
            headers={"x-pilink-secret": PILINK_API_SECRET},
            timeout=5,
        )
        if res.status_code == 200:
            return True
        logging.warning(f"PiLink API 오류: {res.status_code} {res.text}")
    except Exception as e:
        logging.warning(f"PiLink API 전송 실패: {e}")

    return False
