"""첫 실행 시 설정 마법사 (tkinter GUI)"""
import sys
import os
import winreg
import webbrowser
import tkinter as tk
from tkinter import ttk, messagebox


def set_startup(enable: bool):
    """Windows 시작 프로그램 등록/해제"""
    key_path = r"Software\Microsoft\Windows\CurrentVersion\Run"
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_SET_VALUE)
        if enable and getattr(sys, 'frozen', False):
            exe_path = sys.executable
            winreg.SetValueEx(key, "NodeGuardian", 0, winreg.REG_SZ, f'"{exe_path}"')
        else:
            try:
                winreg.DeleteValue(key, "NodeGuardian")
            except FileNotFoundError:
                pass
        winreg.CloseKey(key)
    except Exception:
        pass


def get_app_dir() -> str:
    """exe 실행 시 exe가 있는 폴더, 개발 시 프로젝트 루트 반환"""
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def get_env_path() -> str:
    return os.path.join(get_app_dir(), '.env')


def is_configured() -> bool:
    path = get_env_path()
    if not os.path.exists(path):
        return False
    with open(path, encoding='utf-8') as f:
        content = f.read()
    return 'PILINK_PI_UID=' in content and 'PILINK_PI_UID=\n' not in content


def show_pair_code_dialog(code: str) -> None:
    """앱 연동 코드 팝업 표시 (Windows 네이티브 다이얼로그)"""
    import ctypes
    spaced = '  '.join(list(code))
    message = (
        f"아래 6자리 코드를 LinkPiMonitor 앱 등록 화면에 입력하세요.\n\n"
        f"        {spaced}\n\n"
        f"유효 시간: 10분  |  1회 사용 후 만료"
    )
    ctypes.windll.user32.MessageBoxW(0, message, "📱 LinkPiMonitor 앱 연동 코드", 0x40)


def show_update_notice(required_version: str, download_url: str) -> None:
    """업데이트 필요 시 안내 팝업 표시"""
    root = tk.Tk()
    root.title("Node Guardian 업데이트 필요")
    root.geometry("500x420")
    root.resizable(False, False)
    root.configure(bg='#1e1e2e')
    root.lift()
    root.attributes('-topmost', True)

    style = ttk.Style()
    style.theme_use('clam')
    style.configure('TLabel', background='#1e1e2e', foreground='#cdd6f4', font=('맑은 고딕', 10))
    style.configure('Title.TLabel', background='#1e1e2e', foreground='#f38ba8', font=('맑은 고딕', 13, 'bold'))
    style.configure('Sub.TLabel', background='#1e1e2e', foreground='#a6adc8', font=('맑은 고딕', 9))
    style.configure('Step.TLabel', background='#1e1e2e', foreground='#cdd6f4', font=('맑은 고딕', 10))

    ttk.Label(root, text=f"🔄  Node Guardian v{required_version} 업데이트 필요", style='Title.TLabel').pack(pady=(24, 6))
    ttk.Label(root, text="보안 및 기능 개선을 위해 새 버전 설치가 필요합니다.", style='Sub.TLabel').pack(pady=(0, 18))

    frame = tk.Frame(root, bg='#2a2a3e', bd=0)
    frame.pack(padx=30, fill='x', pady=(0, 16))

    instructions = (
        "📋  설치 방법\n\n"
        "  1. 아래 [새 버전 다운로드] 버튼을 클릭해 파일을 받으세요.\n\n"
        "  2. 기존 Node Guardian을 종료하세요. (트레이 아이콘 → 종료)\n\n"
        "  3. 기존 설치 폴더에서 .env 파일을 삭제하세요.\n"
        "       예) C:\\NodeGuardian\\.env\n\n"
        "  4. 다운로드한 NodeGuardian.exe를 기존 폴더에 덮어쓰세요.\n\n"
        "  5. 새 파일을 실행하면 설정 마법사가 자동으로 시작됩니다.\n"
        "       Pi 사용자명을 다시 입력해 설정을 완료하세요."
    )

    text = tk.Text(frame, bg='#2a2a3e', fg='#cdd6f4', font=('맑은 고딕', 9),
                   relief='flat', wrap='word', height=12, padx=16, pady=14,
                   state='normal', cursor='arrow')
    text.insert('1.0', instructions)
    text.config(state='disabled')
    text.pack(fill='x')

    btn_frame = tk.Frame(root, bg='#1e1e2e')
    btn_frame.pack(pady=16, fill='x', padx=30)

    tk.Button(
        btn_frame, text="새 버전 다운로드",
        bg='#cba6f7', fg='#1e1e2e',
        font=('맑은 고딕', 11, 'bold'),
        relief='flat', cursor='hand2',
        command=lambda: webbrowser.open(download_url)
    ).pack(side='left', ipadx=16, ipady=6)

    tk.Button(
        btn_frame, text="나중에",
        bg='#313244', fg='#a6adc8',
        font=('맑은 고딕', 10),
        relief='flat', cursor='hand2',
        command=root.destroy
    ).pack(side='right', ipadx=12, ipady=6)

    root.mainloop()


GUIDE_ITEMS = [
    ("🛡️ 자동 모니터링",
     "실행 즉시 Docker·Pi Network 프로세스와 포트를 30초마다 감시합니다.\n이상 감지 시 LinkPiMonitor 앱·텔레그램으로 즉시 알림을 보냅니다."),
    ("📱 앱 연동 방법",
     "트레이 아이콘 우클릭 → [📱 앱 연동 코드] 클릭\n표시된 6자리 코드를 LinkPiMonitor 앱 등록 화면에 입력하면 완료됩니다.\n(코드 유효시간 10분 · 1회 사용 후 만료)"),
    ("🖥️ 트레이 아이콘 색상",
     "🟢 초록 — 정상 운영 중\n🟡 노랑 — 경고 발생 (GUI 중단 등)\n🔴 빨강 — 이상 감지 (프로세스·포트 차단)"),
    ("🔄 자동 실행",
     "최초 설정 완료 시 Windows 시작 프로그램에 자동 등록됩니다.\n별도 실행 없이 PC 켜면 자동으로 모니터링이 시작됩니다."),
    ("🆕 v1.2.0 업데이트 내용",
     "• 앱 연동 승인 시스템 추가 (6자리 코드 인증)\n• 트레이 메뉴에 앱 연동 코드 기능 추가\n• Pi 사용자명 대소문자 구분 없이 동작\n• 버전 업데이트 자동 안내 팝업 추가\n• 초기 설정 화면에 사용법 가이드 통합"),
]


def show_guide_dialog() -> None:
    """사용법 안내 팝업"""
    import threading
    def _run():
        root = tk.Tk()
        root.title("Node Guardian 사용법")
        root.geometry("500x560")
        root.resizable(False, True)
        root.configure(bg='#1e1e2e')
        root.lift()
        root.attributes('-topmost', True)
        root.protocol("WM_DELETE_WINDOW", root.destroy)

        style = ttk.Style()
        style.theme_use('clam')
        style.configure('TLabel', background='#1e1e2e', foreground='#cdd6f4', font=('맑은 고딕', 10))
        style.configure('Title.TLabel', background='#1e1e2e', foreground='#cba6f7', font=('맑은 고딕', 13, 'bold'))
        style.configure('Sub.TLabel', background='#1e1e2e', foreground='#a6adc8', font=('맑은 고딕', 9))
        style.configure('Head.TLabel', background='#2a2a3e', foreground='#cba6f7', font=('맑은 고딕', 10, 'bold'))
        style.configure('Body.TLabel', background='#2a2a3e', foreground='#cdd6f4', font=('맑은 고딕', 9))

        ttk.Label(root, text="🛡️ Node Guardian 사용법", style='Title.TLabel').pack(pady=(20, 4))
        ttk.Label(root, text="v1.2.0  |  linkpi.io", style='Sub.TLabel').pack(pady=(0, 8))

        # 스크롤 가능한 캔버스
        canvas = tk.Canvas(root, bg='#1e1e2e', highlightthickness=0)
        scrollbar = ttk.Scrollbar(root, orient='vertical', command=canvas.yview)
        scroll_frame = tk.Frame(canvas, bg='#1e1e2e')

        scroll_frame.bind('<Configure>', lambda e: canvas.configure(scrollregion=canvas.bbox('all')))
        canvas.create_window((0, 0), window=scroll_frame, anchor='nw')
        canvas.configure(yscrollcommand=scrollbar.set)

        canvas.pack(side='left', fill='both', expand=True, padx=(0, 0))
        scrollbar.pack(side='right', fill='y')

        for title, body in GUIDE_ITEMS:
            card = tk.Frame(scroll_frame, bg='#2a2a3e')
            card.pack(padx=20, fill='x', pady=4)
            ttk.Label(card, text=title, style='Head.TLabel').pack(anchor='w', padx=14, pady=(10, 2))
            ttk.Label(card, text=body, style='Body.TLabel', wraplength=440, justify='left').pack(anchor='w', padx=14, pady=(0, 10))

        tk.Button(
            scroll_frame, text="닫기",
            bg='#313244', fg='#a6adc8',
            font=('맑은 고딕', 10),
            relief='flat', cursor='hand2',
            command=root.destroy
        ).pack(pady=16, ipadx=20, ipady=5)

        # 마우스 휠 스크롤
        def on_mousewheel(e):
            canvas.yview_scroll(int(-1 * (e.delta / 120)), 'units')
        canvas.bind_all('<MouseWheel>', on_mousewheel)

        root.mainloop()
    threading.Thread(target=_run, daemon=True).start()


def run_setup_wizard() -> bool:
    """설정 마법사 실행. 완료 시 True, 취소 시 False"""
    root = tk.Tk()
    root.title("Node Guardian 초기 설정")
    root.geometry("480x680")
    root.resizable(False, False)
    root.configure(bg='#1e1e2e')

    completed = [False]

    style = ttk.Style()
    style.theme_use('clam')
    style.configure('TLabel', background='#1e1e2e', foreground='#cdd6f4', font=('맑은 고딕', 10))
    style.configure('Title.TLabel', background='#1e1e2e', foreground='#cba6f7', font=('맑은 고딕', 14, 'bold'))
    style.configure('Sub.TLabel', background='#1e1e2e', foreground='#a6adc8', font=('맑은 고딕', 9))
    style.configure('GuideHead.TLabel', background='#2a2a3e', foreground='#cba6f7', font=('맑은 고딕', 9, 'bold'))
    style.configure('GuideBody.TLabel', background='#2a2a3e', foreground='#cdd6f4', font=('맑은 고딕', 8))
    style.configure('TEntry', fieldbackground='#313244', foreground='#cdd6f4', font=('맑은 고딕', 10))

    ttk.Label(root, text="🛡️ Node Guardian", style='Title.TLabel').pack(pady=(20, 2))
    ttk.Label(root, text="Pi Node 모니터링 도구 초기 설정", style='Sub.TLabel').pack(pady=(0, 10))

    # 사용법 요약
    for title, body in GUIDE_ITEMS:
        card = tk.Frame(root, bg='#2a2a3e')
        card.pack(padx=20, fill='x', pady=3)
        ttk.Label(card, text=title, style='GuideHead.TLabel').pack(anchor='w', padx=12, pady=(7, 1))
        ttk.Label(card, text=body, style='GuideBody.TLabel', wraplength=420, justify='left').pack(anchor='w', padx=12, pady=(0, 7))

    # 입력 영역
    frame = tk.Frame(root, bg='#1e1e2e')
    frame.pack(padx=30, fill='x', pady=(14, 0))

    ttk.Label(frame, text="── LinkPi 연동 설정 ──────────", style='Sub.TLabel').pack(anchor='w', pady=(0, 4))
    ttk.Label(frame, text="Pi 사용자명").pack(anchor='w', pady=(6, 2))

    pi_uid_var = tk.StringVar()
    entry = ttk.Entry(frame, textvariable=pi_uid_var)
    entry.pack(fill='x')
    entry.insert(0, 'Pi 앱 프로필에서 @ 뒤의 글자를 입력하세요')
    entry.config(foreground='#6c7086')

    def on_focus_in(e):
        if entry.get() == 'Pi 앱 프로필에서 @ 뒤의 글자를 입력하세요':
            entry.delete(0, 'end')
            entry.config(foreground='#cdd6f4')
    def on_focus_out(e):
        if not entry.get():
            entry.insert(0, 'Pi 앱 프로필에서 @ 뒤의 글자를 입력하세요')
            entry.config(foreground='#6c7086')
    entry.bind('<FocusIn>', on_focus_in)
    entry.bind('<FocusOut>', on_focus_out)

    def save():
        pi_uid = pi_uid_var.get().strip()
        if not pi_uid or pi_uid == 'Pi 앱 프로필에서 @ 뒤의 글자를 입력하세요':
            messagebox.showerror("입력 오류", "Pi 사용자명을 입력해주세요.", parent=root)
            return
        env_lines = [
            f"PILINK_PI_UID={pi_uid}",
            f"PILINK_NICKNAME={pi_uid}",
            "PILINK_API_URL=https://pilink.vercel.app",
            "PILINK_API_SECRET=pilink2026secret",
        ]
        with open(get_env_path(), 'w', encoding='utf-8') as f:
            f.write('\n'.join(env_lines) + '\n')
        set_startup(True)
        completed[0] = True
        messagebox.showinfo("완료", "설정이 저장됐습니다.\nNode Guardian을 시작합니다.\n\n✅ PC 시작 시 자동 실행이 등록됐습니다.", parent=root)
        root.destroy()

    tk.Button(
        root, text="저장하고 시작하기",
        bg='#cba6f7', fg='#1e1e2e',
        font=('맑은 고딕', 11, 'bold'),
        relief='flat', cursor='hand2',
        command=save
    ).pack(pady=18, ipadx=20, ipady=6)

    root.mainloop()
    return completed[0]
