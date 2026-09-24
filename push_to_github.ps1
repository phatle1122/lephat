param(
    [string]$CommitMessage = "Update profile: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
)

$git = "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe"
$gh  = "$env:LOCALAPPDATA\Programs\gh\gh.exe"

if (-not (Test-Path $git) -or -not (Test-Path $gh)) {
    Write-Host "Loi: Khong tim thay Git hoac GitHub CLI." -ForegroundColor Red
    exit 1
}

Write-Host "Dang chuan bi commit va dong bo len GitHub..." -ForegroundColor Cyan
& $git add .
& $git commit -m $CommitMessage 2>$null

# Lay token tu gh de push an toan khong bao gio bi hoi mat khau
$token = (& $gh auth token).Trim()
& $git push "https://phatle1122:$token@github.com/phatle1122/lephat.git" main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n========================================================" -ForegroundColor Green
    Write-Host " DONG BO LEN GITHUB THANH CONG!" -ForegroundColor Green
    Write-Host " Trang web: https://phatle1122.github.io/lephat/" -ForegroundColor Yellow
    Write-Host " Tu dong cap nhat sau khoang 30 giay." -ForegroundColor Green
    Write-Host "========================================================`n" -ForegroundColor Green
} else {
    Write-Host "`nPush that bai. Vui long kiem tra ket noi mang." -ForegroundColor Red
}
