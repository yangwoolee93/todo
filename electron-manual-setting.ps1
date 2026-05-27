
# zip 경로가 조회한 경로와 일치해야함
$zip = "$env:LOCALAPPDATA\electron\Cache\073c10f139c87e3badb3ab4fec283ab33ea3ccf18b5cb8ce88ffcc6cb893b618\electron-v34.5.8-win32-x64.zip"
$dist = "node_modules\electron\dist"
if (-not (Test-Path $zip)) {
  $zip = (Get-ChildItem "$env:LOCALAPPDATA\electron\Cache" -Recurse -Filter "electron-v34.5.8-win32-x64.zip" | Select-Object -First 1).FullName
}
if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
New-Item -ItemType Directory -Path $dist -Force | Out-Null
Expand-Archive -Path $zip -DestinationPath $dist -Force
Set-Content -Path "node_modules\electron\path.txt" -Value "electron.exe" -NoNewline
Test-Path node_modules\electron\dist\electron.exe
Get-Content node_modules\electron\path.txt