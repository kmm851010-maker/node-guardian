CURRENT_VERSION = '2.0.3'

CHECK_INTERVAL = 30
CRITICAL_THRESHOLD = 3        # critical 3회 연속 → 알림 (90초)
WARNING_THRESHOLD = 10        # warning 10회 연속 → 알림 (5분)
PORT_CRITICAL_DURATION = 180  # 포트 전체 닫힘 3분 지속 → 알림
PORT_PARTIAL_DURATION = 600   # 포트 일부 닫힘 10분 지속 → 알림
