# Restart Server Instructions

## To stop the existing server on port 3001:

**Option 1: Using Task Manager**
1. Open Task Manager (Ctrl + Shift + Esc)
2. Go to "Details" tab
3. Find "node.exe" processes
4. Right-click and "End Task" on the one using port 3001

**Option 2: Using PowerShell (Run as Administrator)**
```powershell
# Find process on port 3001
$process = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

# Stop the process
if ($process) {
    Stop-Process -Id $process -Force
    Write-Host "Server stopped on port 3001"
}
```

**Option 3: Using Command Prompt**
```cmd
# Find PID
netstat -ano | findstr :3001

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

## After stopping, restart the server:
```bash
npm start
```

The server should now:
- ✅ Load Razorpay credentials from .env
- ✅ Initialize Razorpay successfully
- ✅ Start on port 3001

