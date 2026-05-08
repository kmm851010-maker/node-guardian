"""첫 실행 시 설정 마법사 (tkinter GUI)"""
import sys
import os
import winreg
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


def run_setup_wizard() -> bool:
    """설정 마법사 실행. 완료 시 True, 취소 시 False"""
    root = tk.Tk()
    root.title("Node Guardian 초기 설정")
    root.geometry("480x460")
    root.resizable(False, False)
    root.configure(bg='#1e1e2e')

    completed = [False]

    # 스타일
    style = ttk.Style()
    style.theme_use('clam')
    style.configure('TLabel', background='#1e1e2e', foreground='#cdd6f4', font=('맑은 고딕', 10))
    style.configure('Title.TLabel', background='#1e1e2e', foreground='#cba6f7', font=('맑은 고딕', 14, 'bold'))
    style.configure('Sub.TLabel', background='#1e1e2e', foreground='#a6adc8', font=('맑은 고딕', 9))
    style.configure('TEntry', fieldbackground='#313244', foreground='#cdd6f4', font=('맑은 고딕', 10))
    style.configure('TButton', background='#cba6f7', foreground='#1e1e2e', font=('맑은 고딕', 10, 'bold'))

    # 제목
    ttk.Label(root, text="🛡️ Node Guardian", style='Title.TLabel').pack(pady=(24, 4))
    ttk.Label(root, text="Pi Node 모니터링 도구 초기 설정", style='Sub.TLabel').pack(pady=(0, 20))

    frame = tk.Frame(root, bg='#1e1e2e')
    frame.pack(padx=30, fill='x')

    def field(label, placeholder='', show=''):
        ttk.Label(frame, text=label).pack(anchor='w', pady=(10, 2))
        var = tk.StringVar()
        e = ttk.Entry(frame, textvariable=var, show=show)
        e.pack(fill='x')
        if placeholder:
            e.insert(0, placeholder)
            e.config(foreground='#6c7086')
            def on_focus_in(event, entry=e, var=var, ph=placeholder):
                if entry.get() == ph:
                    entry.delete(0, 'end')
                    entry.config(foreground='#cdd6f4')
            def on_focus_out(event, entry=e, var=var, ph=placeholder):
                if not entry.get():
                    entry.insert(0, ph)
                    entry.config(foreground='#6c7086')
            e.bind('<FocusIn>', on_focus_in)
            e.bind('<FocusOut>', on_focus_out)
        return var, e

    # Pi 설정
    ttk.Label(frame, text="── LinkPi 연동 ──────────────", style='Sub.TLabel').pack(anchor='w', pady=(14, 0))
    pi_uid_var, _ = field("Pi 사용자명", "Pi 앱 프로필에서 @ 뒤의 글자를 입력하세요")

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
    ).pack(pady=24, ipadx=20, ipady=6)


    root.mainloop()
    return completed[0]
