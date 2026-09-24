$folder = $PSScriptRoot
$port = 8080

# 1. Kill old processes to prevent conflicts
Get-Process -Name cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Job | Remove-Job -Force -ErrorAction SilentlyContinue

# Find any process listening on 8080 and terminate if needed
$connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($connections) {
    $connections | ForEach-Object {
        try { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } catch {}
    }
    Start-Sleep -Seconds 1
}

# 2. Launch serve.ps1 as a detached background process
Write-Host "Starting HTTP server on http://127.0.0.1:$port/..." -ForegroundColor Cyan
$serverProcess = Start-Process powershell.exe -ArgumentList "-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File `"$folder\serve.ps1`"" -PassThru

# Wait for server to become responsive
$serverOk = $false
for ($i = 0; $i -lt 10; $i++) {
    Start-Sleep -Milliseconds 500
    try {
        $res = Invoke-WebRequest -Uri "http://127.0.0.1:$port/index.html" -UseBasicParsing -TimeoutSec 2
        if ($res.StatusCode -eq 200) {
            $serverOk = $true
            break
        }
    } catch {}
}

if ($serverOk) {
    Write-Host "Local HTTP server is ready." -ForegroundColor Green
} else {
    Write-Host "Local HTTP server failed to start!" -ForegroundColor Red
    exit 1
}

# 3. Clean and prepare tunnel.log
$logFile = Join-Path $folder "tunnel.log"
if (Test-Path $logFile) { Remove-Item $logFile -Force }

# 4. Start cloudflared tunnel
Write-Host "Launching Cloudflare Tunnel..." -ForegroundColor Cyan
$cloudflaredExe = Join-Path $folder "cloudflared.exe"

$tunnelProcess = Start-Process -FilePath $cloudflaredExe -ArgumentList "tunnel", "--url", "http://127.0.0.1:$port", "--logfile", "`"$logFile`"" -PassThru -WindowStyle Hidden

# 5. Extract the generated TryCloudflare URL
$foundUrl = $null
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $logFile) {
        $logContent = Get-Content $logFile -Raw -ErrorAction SilentlyContinue
        if ($logContent -match "https://[a-zA-Z0-9-]+\.trycloudflare\.com") {
            $foundUrl = $matches[0]
            break
        }
    }
}

if ($foundUrl) {
    Write-Host "`n========================================================" -ForegroundColor Green
    Write-Host " TUNNEL ACTIVE SUCCESSFULLY!" -ForegroundColor Green
    Write-Host " Main Site:   $foundUrl" -ForegroundColor Yellow
    Write-Host "========================================================`n" -ForegroundColor Green
} else {
    Write-Host "Cloudflare tunnel did not output URL in 30s. Checking logs:" -ForegroundColor Red
    if (Test-Path $logFile) { Get-Content $logFile -Tail 20 }
}
