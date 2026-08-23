@echo off
call venv\Scripts\activate
pip install pyinstaller -q
pyinstaller guardian.spec --clean
echo.
echo 빌드 완료: dist\NodeGuardian.exe
pause
