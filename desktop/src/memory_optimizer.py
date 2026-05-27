"""Windows 메모리 최적화 — Empty Working Sets / Empty Modified Page List"""
import ctypes
import ctypes.wintypes
import logging

ntdll    = ctypes.WinDLL('ntdll')
advapi32 = ctypes.WinDLL('advapi32')
kernel32 = ctypes.WinDLL('kernel32')

# ── 함수 타입 명시 (64비트 HANDLE 잘림 방지) ──────────────────────────────
kernel32.GetCurrentProcess.restype  = ctypes.wintypes.HANDLE
kernel32.GetCurrentProcess.argtypes = []

kernel32.CloseHandle.restype  = ctypes.wintypes.BOOL
kernel32.CloseHandle.argtypes = [ctypes.wintypes.HANDLE]

kernel32.OpenProcess.restype  = ctypes.wintypes.HANDLE
kernel32.OpenProcess.argtypes = [ctypes.wintypes.DWORD, ctypes.wintypes.BOOL, ctypes.wintypes.DWORD]

kernel32.SetProcessWorkingSetSizeEx.restype  = ctypes.wintypes.BOOL
kernel32.SetProcessWorkingSetSizeEx.argtypes = [
    ctypes.wintypes.HANDLE, ctypes.c_size_t, ctypes.c_size_t, ctypes.wintypes.DWORD
]

advapi32.OpenProcessToken.restype  = ctypes.wintypes.BOOL
advapi32.OpenProcessToken.argtypes = [
    ctypes.wintypes.HANDLE,
    ctypes.wintypes.DWORD,
    ctypes.POINTER(ctypes.wintypes.HANDLE),
]

advapi32.LookupPrivilegeValueW.restype  = ctypes.wintypes.BOOL
advapi32.LookupPrivilegeValueW.argtypes = [
    ctypes.wintypes.LPCWSTR,
    ctypes.wintypes.LPCWSTR,
    ctypes.c_void_p,
]

ntdll.NtSetSystemInformation.restype  = ctypes.c_long   # NTSTATUS
ntdll.NtSetSystemInformation.argtypes = [
    ctypes.c_int, ctypes.c_void_p, ctypes.c_ulong
]

# ── 상수 ──────────────────────────────────────────────────────────────────
_SystemMemoryListInformation   = 80
_MemoryEmptyWorkingSets        = 0   # SYSTEM_MEMORY_LIST_COMMAND
_MemoryFlushModifiedList       = 1

SE_PRIVILEGE_ENABLED      = 0x00000002
TOKEN_ADJUST_PRIVILEGES   = 0x0020
TOKEN_QUERY               = 0x0008
PROCESS_SET_QUOTA         = 0x0100
PROCESS_QUERY_LIMITED_INFORMATION = 0x1000


class _LUID(ctypes.Structure):
    _fields_ = [("LowPart", ctypes.wintypes.DWORD), ("HighPart", ctypes.c_long)]


class _LUID_AND_ATTRIBUTES(ctypes.Structure):
    _fields_ = [("Luid", _LUID), ("Attributes", ctypes.wintypes.DWORD)]


class _TOKEN_PRIVILEGES(ctypes.Structure):
    _fields_ = [
        ("PrivilegeCount", ctypes.wintypes.DWORD),
        ("Privileges", _LUID_AND_ATTRIBUTES * 1),
    ]


advapi32.AdjustTokenPrivileges.restype  = ctypes.wintypes.BOOL
advapi32.AdjustTokenPrivileges.argtypes = [
    ctypes.wintypes.HANDLE,
    ctypes.wintypes.BOOL,
    ctypes.POINTER(_TOKEN_PRIVILEGES),
    ctypes.wintypes.DWORD,
    ctypes.c_void_p,
    ctypes.c_void_p,
]


def _is_admin() -> bool:
    try:
        return bool(ctypes.windll.shell32.IsUserAnAdmin())
    except Exception:
        return False


def _enable_privilege(name: str) -> bool:
    token = ctypes.wintypes.HANDLE()
    if not advapi32.OpenProcessToken(
        kernel32.GetCurrentProcess(),
        TOKEN_ADJUST_PRIVILEGES | TOKEN_QUERY,
        ctypes.byref(token),
    ):
        logging.warning(f"OpenProcessToken 실패: {name}")
        return False
    try:
        luid = _LUID()
        if not advapi32.LookupPrivilegeValueW(None, name, ctypes.byref(luid)):
            logging.warning(f"LookupPrivilegeValue 실패: {name}")
            return False
        tp = _TOKEN_PRIVILEGES()
        tp.PrivilegeCount = 1
        tp.Privileges[0].Luid = luid
        tp.Privileges[0].Attributes = SE_PRIVILEGE_ENABLED
        result = advapi32.AdjustTokenPrivileges(
            token, False, ctypes.byref(tp), 0, None, None
        )
        last_err = ctypes.get_last_error()
        if not result or last_err == 1300:  # ERROR_NOT_ALL_ASSIGNED
            logging.warning(f"AdjustTokenPrivileges 실패: {name}, err={last_err}")
            return False
        return True
    finally:
        kernel32.CloseHandle(token)


def _nt_memory_command(command: int) -> tuple[bool, int]:
    cmd = ctypes.c_ulong(command)
    status = ntdll.NtSetSystemInformation(
        _SystemMemoryListInformation,
        ctypes.byref(cmd),
        ctypes.sizeof(cmd),
    )
    return status == 0, status


def _empty_per_process() -> bool:
    """관리자 권한 없이 현재 사용자 소유 프로세스의 Working Set만 비웁니다."""
    try:
        import psutil
    except ImportError:
        return False
    emptied = 0
    for proc in psutil.process_iter(['pid']):
        try:
            handle = kernel32.OpenProcess(
                PROCESS_SET_QUOTA | PROCESS_QUERY_LIMITED_INFORMATION,
                False,
                proc.pid,
            )
            if handle:
                kernel32.SetProcessWorkingSetSizeEx(handle, ctypes.c_size_t(-1), ctypes.c_size_t(-1), 0)
                kernel32.CloseHandle(handle)
                emptied += 1
        except Exception:
            pass
    logging.info(f"프로세스별 Working Set 비우기: {emptied}개 처리")
    return emptied > 0


def optimize_memory() -> bool:
    admin = _is_admin()
    logging.info(f"optimize_memory 호출 — admin={admin}")

    if admin:
        _enable_privilege("SeDebugPrivilege")
        _enable_privilege("SeProfileSingleProcessPrivilege")

        ok1, s1 = _nt_memory_command(_MemoryEmptyWorkingSets)
        ok2, s2 = _nt_memory_command(_MemoryFlushModifiedList)
        logging.info(
            f"NtSetSystemInformation — ws=0x{s1 & 0xFFFFFFFF:08X}, mpl=0x{s2 & 0xFFFFFFFF:08X}"
        )

        if ok1 and ok2:
            logging.info("메모리 최적화 완료 (시스템 전체)")
            return True

        raise RuntimeError(
            f"관리자 권한: {'예' if admin else '아니오'}\n"
            f"WorkingSets    NTSTATUS: 0x{s1 & 0xFFFFFFFF:08X}\n"
            f"ModifiedPageList NTSTATUS: 0x{s2 & 0xFFFFFFFF:08X}"
        )
    else:
        ok = _empty_per_process()
        logging.info(f"메모리 최적화 (프로세스별) — ok={ok}")
        return ok
