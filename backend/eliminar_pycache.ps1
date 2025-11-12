# Remove Python bytecode and __pycache__ folders (Windows PowerShell)
# Mirrors backend/eliminar_pycache.sh
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Push-Location $PSScriptRoot
try {
    Get-ChildItem -Path . -Recurse -Include *.pyc,*.pyo -File -ErrorAction SilentlyContinue |
        ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue }

    Get-ChildItem -Path . -Recurse -Directory -Filter '__pycache__' -ErrorAction SilentlyContinue |
        ForEach-Object {
            Write-Host "Removing __pycache__ directory: $($_.FullName)"
            Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
        }
    Write-Host 'Completed removing *.py[c|o] and __pycache__'
}
finally {
    Pop-Location
}
