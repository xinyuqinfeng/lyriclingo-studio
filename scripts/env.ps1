# Set up Rust GNU toolchain environment.
# Run this in the project root before any `pnpm tauri` / `cargo` command:
#   . .\scripts\env.ps1
$env:RUSTUP_HOME = 'D:\Rust\rustup'
$env:CARGO_HOME = 'D:\Rust\cargo'
$env:PATH = "D:\Rust\cargo\bin;D:\MSYS2\mingw64\bin;$env:PATH"

# Ensure the as.exe path-conversion wrapper exists (see README "Rust 工具链").
$wrapDir = 'D:\Rust\mingw-wrap'
if (-not (Test-Path (Join-Path $wrapDir 'as.exe'))) {
    New-Item -ItemType Directory -Force -Path $wrapDir | Out-Null
    Set-Content -Path (Join-Path $wrapDir 'as.exe') -Value "#!/bin/sh`nexec /d/MSYS2/mingw64/bin/as.exe `"`$@`""
}
