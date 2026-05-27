"""Windows 메모리 최적화 — Empty Working Sets / Empty Modified Page List"""
import ctypes
import ctypes.wintypes
import logging

ntdll = ctypes.WinDLL('ntdll')
advapi32 = ctypes.WinDLL('advapi32')
kernel32 = ctypes.WinDLL('kernel32')

_SystemMemoryListInformation = 80
_MemoryEmptyWorkingSets = 2
_MemoryFlushModifiedList = 3

SE_PRIVILEGE_ENABLED = 0x00000002
TOKEN_ADJUST_PRIVILEGES = 0x0020
TOKEN_QUERY = 0x0008


class _LUID(ctypes.Structure):
    _fields_ = [("LowPart", ctypes.wintypes.DWORD), ("HighPart", ctypes.c_long)]


class _LUID_AND_ATTRIBUTES(ctypes.Structure):
    _fields_ = [("Luid", _LUID), ("Attributes", ctypes.wintypes.DWORD)]


class _TOKEN_PRIVILEGES(ctypes.Structure):
    _fields_ = [
        ("PrivilegeCount", ctypes.wintypes.DWORD),
        ("Privileges", _LUID_AND_ATTRIBUTES * 1),
    ]


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


def _nt_memory_command(command: int) -> bool:
    cmd = ctypes.c_ulong(command)
    status = ntdll.NtSetSystemInformation(
        _SystemMemoryListInformation,
        ctypes.byref(cmd),
        ctypes.sizeof(cmd),
    )
    return status == 0


def empty_working_sets() -> bool:
    """모든 프로세스의 Working Set을 비웁니다 (SeDebugPrivilege 필요)."""
    _enable_privilege("SeDebugPrivilege")
    _enable_privilege("SeProfileSingleProcessPrivilege")
    return _nt_memory_command(_MemoryEmptyWorkingSets)


def flush_modified_page_list() -> bool:
    """Modified Page List를 비웁니다 (SeProfileSingleProcessPrivilege 필요)."""
    _enable_privilege("SeProfileSingleProcessPrivilege")
    return _nt_memory_command(_MemoryFlushModifiedList)


def optimize_memory() -> bool:
    """Working Sets + Modified Page List 순서로 메모리를 최적화합니다."""
    ok1 = empty_working_sets()
    ok2 = flush_modified_page_list()
    if ok1 and ok2:
        logging.info("메모리 최적화 완료 (Working Sets + Modified Page List)")
    else:
        logging.warning(f"메모리 최적화 부분 실패 — working_sets={ok1}, modified_page_list={ok2}")
    return ok1 and ok2
