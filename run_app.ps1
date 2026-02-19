
# Kill any existing node processes to free up ports
Write-Host "Stopping any existing node processes..."
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# Start Backend
Start-Process -FilePath "powershell" -ArgumentList "npm", "run", "dev" -WorkingDirectory "d:\PROJECTS\clone\server" -PassThru

# Start Frontend
Start-Process -FilePath "powershell" -ArgumentList "npm", "run", "dev" -WorkingDirectory "d:\PROJECTS\clone\client" -PassThru

Write-Host "WhatsApp Clone started. Backend running on 5000, Frontend running on 5173."
