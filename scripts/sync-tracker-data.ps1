# Regenera apps/web/data/projects.data.js y uat.data.js desde los JSON.
# Uso (desde la raíz del repo): .\scripts\sync-tracker-data.ps1

$root = Split-Path $PSScriptRoot -Parent
$data = Join-Path $root "apps\web\data"

$pJson = Join-Path $data "projects.json"
$uJson = Join-Path $data "uat.json"
$pJs = Join-Path $data "projects.data.js"
$uJs = Join-Path $data "uat.data.js"

if (-not (Test-Path $pJson)) { Write-Error "No existe $pJson"; exit 1 }
if (-not (Test-Path $uJson)) { Write-Error "No existe $uJson"; exit 1 }

$pj = Get-Content -Raw -Encoding UTF8 $pJson
$uj = Get-Content -Raw -Encoding UTF8 $uJson

Set-Content -Path $pJs -Encoding UTF8 -Value "window.__TRACKER_PROJECTS__ = $pj`n"
Set-Content -Path $uJs -Encoding UTF8 -Value "window.__TRACKER_UAT__ = $uj`n"

Write-Host "OK: $pJs y $uJs actualizados desde JSON (apps/web/data)."
