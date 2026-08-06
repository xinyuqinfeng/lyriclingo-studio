# Optional helper for building the GNU (x86_64-pc-windows-gnu) Rust toolchain on Windows.
#
# The standard/CI build uses the MSVC toolchain and does NOT need this script.
# Only use it if you build with the GNU toolchain (e.g. via rustup GNU + MSYS2 mingw-w64),
# because C dependencies (ring, sqlite) need a mingw gcc.
#
# Adjust the three paths below to match your installation, then run:
#   .\scripts\gnu-env.ps1
$env:RUSTUP_HOME = 'C:\Users\<you>\.rustup'
$env:CARGO_HOME = 'C:\Users\<you>\.cargo'

# Path to your mingw-w64 gcc and its bin directory.
$env:MINGW_BIN = 'C:\msys64\mingw64\bin'
$env:PATH = "$env:CARGO_HOME\bin;$env:MINGW_BIN;$env:PATH"

# Point cargo's C compiler (for the GNU target) at the mingw gcc.
$env:CC_x86_64_pc_windows_gnu = 'C:\msys64\mingw64\bin\gcc.exe'

Write-Host 'GNU toolchain env loaded. Run: npm run tauri dev / npm run tauri build'
