<#
  Remove all Django 'migrations' folders (Windows PowerShell)
  Mirrors backend/eliminar_migraciones.sh
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Push-Location $PSScriptRoot
try {
    $targets = Get-ChildItem -Path . -Recurse -Directory -Filter 'migrations' -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch "\\ENV(\\|$)" }

    foreach ($dir in $targets) {
        Write-Host ("Removing migrations directory: {0}" -f $dir.FullName)
        Remove-Item -LiteralPath $dir.FullName -Recurse -Force -ErrorAction SilentlyContinue
    }
    Write-Host "Completed removing migrations directories"
}
finally {
    Pop-Location
}
