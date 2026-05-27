"""Windows 메모리 최적화 — Empty Working Sets / Empty Modified Page List"""
import ctypes
import ctypes.wintypes
import logging

ntdll = ctypes.WinDLL('ntdll')
advapi32 = ctypes.WinDLL('advapi32')
kernel32 = ctypes.WinDLL('kernel32')

# NtSetSystemInformation 타입 명시
ntdll.NtSetSystemInformation.restype = ctypes.c_long
ntdll.NtSetSystemInformation.argtypes = [ctypes.c_int, ctypes.c_void_p, ctypes.c_ulong]

_SystemMemoryListInformation = 80
_MemoryEmptyWorkingSets = 0   # SYSTEM_MEMORY_LIST_COMMAND enum
_MemoryFlushModifiedList = 1

SE_PRIVILEGE_ENABLED = 0x00000002
TOKEN_ADJUST_PRIVILEGES = 0x0020
TOKEN_QUERY = 0x0008
PROCESS_SET_QUOTA = 0x0100
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
        return False
    try:
        luid = _LUID()
        if not advapi32.LookupPrivilegeValueW(None, name, ctypes.byref(luid)):
            return False
        tp = _TOKEN_PRIVILEGES()
        tp.PrivilegeCount = 1
        tp.Privileges[0].Luid = luid
        tp.Privileges[0].Attributes = SE_PRIVILEGE_ENABLED
        return bool(advapi32.AdjustTokenPrivileges(token, False, ctypes.byref(tp), 0, None, None))
    finally:
        kernel32.CloseHandle(token)


def _nt_memory_command(command: int) -> tuple[bool, int]:
    cmd = ctypes.c_ulong(command)
    status = ntdll.NtSetSystemInformation(
        _SystemMemoryListInformation,
        ctypes.byref(cmd),
        ctypes.sizeof(cmd),
    )
    # NTSTATUS 0 = STATUS_SUCCESS
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
                # SIZE_MAX(-1), SIZE_MAX(-1), 0 → Working Set 비우기
                kernel32.SetProcessWorkingSetSizeEx(handle, -1, -1, 0)
                kernel32.CloseHandle(handle)
                emptied += 1
        except Exception:
            pass
    logging.info(f"프로세스별 Working Set 비우기: {emptied}개 처리")
    return emptied > 0


def empty_working_sets() -> tuple[bool, int]:
    _enable_privilege("SeDebugPrivilege")
    _enable_privilege("SeProfileSingleProcessPrivilege")
    return _nt_memory_command(_MemoryEmptyWorkingSets)


def flush_modified_page_list() -> tuple[bool, int]:
    _enable_privilege("SeProfileSingleProcessPrivilege")
    return _nt_memory_command(_MemoryFlushModifiedList)


def optimize_memory() -> bool:
    """
    Working Sets + Modified Page List 최적화.
    관리자 권한이 있으면 시스템 전체, 없으면 프로세스별 폴백.
    """
    admin = _is_admin()
    if admin:
        ok1, s1 = empty_working_sets()
        ok2, s2 = flush_modified_page_list()
        logging.info(f"메모리 최적화 — admin={admin}, ws_status=0x{s1 & 0xFFFFFFFF:08X}, mpl_status=0x{s2 & 0xFFFFFFFF:08X}")
        if ok1 and ok2:
            return True
        # 실패 시 로그에 상세 기록 후 상태코드를 예외로 전달
        raise RuntimeError(
            f"관리자 권한 확인: {'예' if admin else '아니오'}\n"
            f"WorkingSets NTSTATUS: 0x{s1 & 0xFFFFFFFF:08X}\n"
            f"ModifiedPageList NTSTATUS: 0x{s2 & 0xFFFFFFFF:08X}"
        )
    else:
        ok = _empty_per_process()
        logging.info(f"메모리 최적화 (프로세스별) — ok={ok}")
        return ok
