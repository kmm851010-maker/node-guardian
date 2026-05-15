import os
import requests
import logging
from src.config import CURRENT_VERSION

PILINK_API_URL = os.getenv("PILINK_API_URL", "")
PILINK_API_SECRET = os.getenv("PILINK_API_SECRET", "")
PILINK_PI_UID = os.getenv("PILINK_PI_UID", "")
PILINK_NICKNAME = os.getenv("PILINK_NICKNAME", "")


def _version_tuple(v: str) -> tuple:
    try:
        return tuple(int(x) for x in v.split('.'))
    except Exception:
        return (0, 0, 0)


def generate_pair_code() -> str | None:
    """앱 연동용 6자리 코드를 서버에서 발급"""
    url = PILINK_API_URL or "https://pilink.vercel.app"
    if not PILINK_PI_UID:
        return None
    try:
        res = requests.post(
            f"{url}/api/guardian-pair/generate",
            json={"pi_uid": PILINK_PI_UID.lower()},
            headers={"x-pilink-secret": PILINK_API_SECRET},
            timeout=5,
        )
        if res.status_code == 200:
            return res.json().get('code')
        logging.warning(f"연동 코드 발급 실패: {res.status_code} {res.text}")
    except Exception as e:
        logging.warning(f"연동 코드 발급 오류: {e}")
    return None


def check_version() -> dict | None:
    """서버에서 최소 버전 정보 조회. 업데이트 필요 시 dict 반환, 정상이면 None."""
    url = PILINK_API_URL or "https://pilink.vercel.app"
    try:
        res = requests.get(f"{url}/api/guardian-version", timeout=5)
        if res.status_code == 200:
            data = res.json()
            required = data.get('required_version', '0.0.0')
            if _version_tuple(required) > _version_tuple(CURRENT_VERSION):
                return data
    except Exception as e:
        logging.warning(f"버전 확인 실패: {e}")
    return None


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
