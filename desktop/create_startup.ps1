$ws = New-Object -ComObject WScript.Shell
$startup = $ws.SpecialFolders('Startup')
$sc = $ws.CreateShortcut("$startup\NodeGuardian.lnk")
$sc.TargetPath = "C:\Projects\node-guardian\venv\Scripts\pythonw.exe"
$sc.Arguments = "-m src.main"
$sc.WorkingDirectory = "C:\Projects\node-guardian"
$sc.Description = "Node Guardian"
$sc.Save()
Write-Host "완료: $startup\NodeGuardian.lnk"
