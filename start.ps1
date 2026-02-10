# Optional: same as running "docker-compose up -d" from this folder.
Set-Location $PSScriptRoot
docker-compose up -d
Write-Host "Wait ~30-45 seconds (first time), then open http://localhost:3000"
