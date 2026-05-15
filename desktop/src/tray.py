import os
import threading
import pystray
from PIL import Image, ImageDraw


def _make_icon(color: str) -> Image.Image:
    """트레이 아이콘 이미지 생성 (원형)"""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse([4, 4, 60, 60], fill=color)
    return img


# 상태별 아이콘 색상
ICON_COLORS = {
    "healthy":  "#22c55e",   # 초록
    "warning":  "#f59e0b",   # 노랑
    "critical": "#ef4444",   # 빨강
    "unknown":  "#6b7280",   # 회색
}


class TrayIcon:
    def __init__(self, on_quit):
        self._on_quit = on_quit
        self._status = "unknown"
        self._icon = pystray.Icon(
            name="NodeGuardian",
            icon=_make_icon(ICON_COLORS["unknown"]),
            title="Node Guardian — 시작 중...",
            menu=pystray.Menu(
                pystray.MenuItem("Node Guardian", None, enabled=False),
                pystray.Menu.SEPARATOR,
                pystray.MenuItem("상태: 확인 중", self._noop, enabled=False),
                pystray.Menu.SEPARATOR,
                pystray.MenuItem("📱 앱 연동 코드", self._show_pair_code),
                pystray.Menu.SEPARATOR,
                pystray.MenuItem("종료", self._quit),
            )
        )

    def _noop(self): pass

    def _show_pair_code(self):
        threading.Thread(target=self._show_pair_code_thread, daemon=True).start()

    def _show_pair_code_thread(self):
        import ctypes
        from src.notifier.pilink import generate_pair_code
        from src.setup_wizard import show_pair_code_dialog
        code = generate_pair_code()
        if code:
            show_pair_code_dialog(code)
        else:
            ctypes.windll.user32.MessageBoxW(
                0,
                "연동 코드 생성에 실패했습니다.\n설정(.env)에 PILINK_PI_UID가 입력되어 있는지 확인하세요.",
                "오류",
                0x10,
            )

    def _quit(self):
        self._on_quit()
        self._icon.stop()
        os._exit(0)

    def set_status(self, status: str, detail: str = ""):
        self._status = status
        color = ICON_COLORS.get(status, ICON_COLORS["unknown"])
        label = {
            "healthy":  "✅ 정상 운영 중",
            "warning":  "⚠️ 경고 발생",
            "critical": "🚨 이상 감지",
            "unknown":  "⏳ 확인 중",
        }.get(status, status)

        self._icon.icon = _make_icon(color)
        self._icon.title = f"Node Guardian — {label}" + (f"\n{detail}" if detail else "")
        self._icon.menu = pystray.Menu(
            pystray.MenuItem("Node Guardian", None, enabled=False),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem(label, self._noop, enabled=False),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("📱 앱 연동 코드", self._show_pair_code),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("종료", self._quit),
        )

    def run(self):
        """별도 스레드에서 트레이 실행"""
        thread = threading.Thread(target=self._icon.run, daemon=True)
        thread.start()
