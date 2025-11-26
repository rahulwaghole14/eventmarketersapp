# PowerShell script to stop Node.js server on port 3001
Write-Host "🔍 Finding processes on port 3001..." -ForegroundColor Yellow

$processes = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($processes) {
    foreach ($pid in $processes) {
        $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "🛑 Stopping process: $($proc.ProcessName) (PID: $pid)" -ForegroundColor Red
            Stop-Process -Id $pid -Force
            Write-Host "✅ Process stopped" -ForegroundColor Green
        }
    }
} else {
    Write-Host "ℹ️  No process found on port 3001" -ForegroundColor Cyan
}

Write-Host "`n✅ Done!" -ForegroundColor Green

