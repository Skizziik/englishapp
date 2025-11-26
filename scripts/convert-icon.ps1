# PowerShell script to convert PNG to ICO
# Run: powershell -ExecutionPolicy Bypass -File scripts/convert-icon.ps1

Add-Type -AssemblyName System.Drawing

$inputPath = "public/icon.png"
$outputPath = "public/icon.ico"

# Load the PNG image
$bitmap = [System.Drawing.Bitmap]::FromFile((Resolve-Path $inputPath).Path)

# Create icon
$icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())

# Save as ICO
$fs = [System.IO.File]::Create((Join-Path (Get-Location) $outputPath))
$icon.Save($fs)
$fs.Close()

Write-Host "Icon created successfully: $outputPath"

# Cleanup
$bitmap.Dispose()
$icon.Dispose()
