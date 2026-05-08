import socket

# 실측 기반: Serge PC 2026-04-16
# Pi Node는 com.docker.backend(PID 23140)가 31401-31403 포트 서비스
NODE_PORTS = list(range(31400, 31410))  # 31400~31409


def is_port_open(port: int, timeout: float = 1.0) -> bool:
    for host in ("127.0.0.1", "localhost"):
        try:
            with socket.create_connection((host, port), timeout=timeout):
                return True
        except (socket.timeout, ConnectionRefusedError, OSError):
            continue
    return False


def check_ports() -> dict[int, bool]:
    return {port: is_port_open(port) for port in NODE_PORTS}


def get_port_status() -> tuple[str, list[int]]:
    """
    포트 상태 판정.
    Returns: (status, closed_ports)
      status: "healthy" | "critical"
        healthy: 하나 이상의 포트 열림 (Pi 노드는 PC마다 사용 포트 수가 다름)
        critical: 모두 닫힘 (노드 완전 중단)
    """
    status = check_ports()
    closed = [p for p, open_ in status.items() if not open_]

    if len(closed) == len(NODE_PORTS):
        return ("critical", closed)
    return ("healthy", closed)
