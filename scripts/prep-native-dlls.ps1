# Copies WebView2Loader.dll next to build artifacts so app/test binaries can load it.
# Usage: .\scripts\prep-native-dlls.ps1
$TargetDir = Join-Path $PSScriptRoot '..\src-tauri\target'
$TargetDir = (Resolve-Path $TargetDir).Path

$srcDll = Get-ChildItem -Path (Join-Path $TargetDir 'debug\build') -Recurse -Filter 'WebView2Loader.dll' -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -match '\\out\\x64\\' } |
    Select-Object -First 1

if (-not $srcDll) {
    Write-Error 'WebView2Loader.dll not found in build output. Run a build first.'
    exit 1
}

$destinations = @(
    (Join-Path $TargetDir 'debug\deps'),
    (Join-Path $TargetDir 'debug')
)
foreach ($dir in $destinations) {
    if (Test-Path $dir) {
        Copy-Item $srcDll.FullName $dir -Force
        Write-Host "Copied WebView2Loader.dll -> $dir"
    }
}
