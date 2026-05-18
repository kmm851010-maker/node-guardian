@echo off
call venv\Scripts\activate
pip install pyinstaller -q
pyinstaller NodeGuardian.spec --clean

if errorlevel 1 (
    echo 빌드 실패
    pause
    exit /b 1
)

:: 타임스탬프 백업 폴더 생성
for /f "tokens=1-6 delims=/: " %%a in ("%date% %time%") do (
    set STAMP=%%c%%b%%a_%%d%%e%%f
)
set BACKUP_DIR=builds\%STAMP%
mkdir %BACKUP_DIR%
copy dist\NodeGuardian.exe %BACKUP_DIR%\NodeGuardian.exe >nul

echo.
echo 빌드 완료: dist\NodeGuardian.exe
echo 백업 저장: %BACKUP_DIR%\NodeGuardian.exe
pause
