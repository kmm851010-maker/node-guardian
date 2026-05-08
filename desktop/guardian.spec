# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['run.py'],
    pathex=['.'],
    binaries=[],
    datas=[],
    hiddenimports=[
        'psutil',
        'requests',
        'pystray',
        'PIL',
        'PIL.Image',
        'PIL.ImageDraw',
        'asyncio',
        'src.main',
        'src.config',
        'src.tray',
        'src.detectors.reboot_detector',
        'src.detectors.process_detector',
        'src.detectors.port_detector',
        'src.notifier.telegram',
        'src.notifier.pilink',
        'src.setup_wizard',
        'tkinter',
        'tkinter.ttk',
        'tkinter.messagebox',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['telegram', 'dotenv', 'python_dotenv'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='NodeGuardian',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)
