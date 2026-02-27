# deploy-ftp.ps1
# Unified script to build the project and upload via FTP

$env:PATH += ";C:\Users\chrl\.bun\bin"
Write-Host "Starting build process..." -ForegroundColor Cyan
.\node_portable\npm.cmd run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build successful! Starting FTP upload..." -ForegroundColor Cyan
    .\node_portable\node.exe scripts/upload-ftp.js
} else {
    Write-Host "Build failed. Aborting deployment." -ForegroundColor Red
    exit $LASTEXITCODE
}
