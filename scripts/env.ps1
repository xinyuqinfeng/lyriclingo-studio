# Set up Rust GNU toolchain environment.
# Run this in the project root before any `pnpm tauri` / `cargo` command:
#   . .\scripts\env.ps1
$env:RUSTUP_HOME = 'D:\Rust\rustup'
$env:CARGO_HOME = 'D:\Rust\cargo'
$env:PATH = "D:\Rust\cargo\bin;D:\MSYS2\mingw64\bin;$env:PATH"
