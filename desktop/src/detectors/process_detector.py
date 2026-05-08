import psutil

# 실측 기반: Serge PC 2026-04-16
# Pi Network GUI는 Electron 기반으로 여러 프로세스가 뜸 (최소 1개만 살아도 GUI 정상)
# Docker 백엔드가 진짜 노드 서비스 (필수)
CORE_PROCESSES = {
    "com.docker.backend.exe": "critical",   # 노드 서비스 본체 — 죽으면 알림
    "Docker Desktop.exe":     "critical",   # 도커 런타임 — 죽으면 알림
    "Pi Network.exe":         "warning",    # GUI — 죽어도 노드 자체는 유지되나 경고
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
