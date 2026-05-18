import os
import requests
import logging
from src.config import CURRENT_VERSION

def _env():
    return {
        "url": os.getenv("PILINK_API_URL", ""),
        "secret": os.getenv("PILINK_API_SECRET", ""),
        "pi_uid": os.getenv("PILINK_PI_UID", ""),
        "nickname": os.getenv("PILINK_NICKNAME", ""),
    }


def _version_tuple(v: str) -> tuple:
    try:
        return tuple(int(x) for x in v.split('.'))
    except Exception:
        return (0, 0, 0)


def generate_pair_code() -> str | None:
    """앱 연동용 6자리 코드를 서버에서 발급"""
    e = _env()
    url = e["url"] or "https://pilink.vercel.app"
    if not e["pi_uid"]:
        return None
    try:
        res = requests.post(
            f"{url}/api/guardian-pair/generate",
            json={"pi_uid": e["pi_uid"].lower()},
            headers={"x-pilink-secret": e["secret"]},
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
    e = _env()
    url = e["url"] or "https://pilink.vercel.app"
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
    e = _env()
    if not e["url"] or not e["pi_uid"]:
        return False

    payload = {
        "pi_uid": e["pi_uid"],
        "nickname": e["nickname"] or e["pi_uid"],
        "event_type": event_type,
        "severity": severity,
        "message": message,
        "detail": detail,
    }

    try:
        res = requests.post(
            f"{e['url']}/api/node-events",
            json=payload,
            headers={"x-pilink-secret": e["secret"]},
            timeout=5,
        )
        if res.status_code == 200:
            return True
        logging.warning(f"PiLink API 오류: {res.status_code} {res.text}")
    except Exception as e:
        logging.warning(f"PiLink API 전송 실패: {e}")

    return False
