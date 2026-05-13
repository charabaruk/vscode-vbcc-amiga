# VBCC Amiga Compiler Support

Use the Amiga vbcc toolchain in VS Code with working C/C++ IntelliSense.

This extension connects vbcc, vasm, vlink, and the Amiga NDK to the C/C++ extension (`ms-vscode.cpptools`) so include paths, defines, and compiler settings resolve correctly while you edit.

## Features

- Detects VBCC and NDK locations from your settings.
- Provides cpptools IntelliSense configuration from vbcc/NDK paths.
- Supports vbcc profile and target mapping (`aos68k`, `aosppc`, `kick13`, etc.).
- Lets you export settings-based config into `c_cpp_properties.json`.
- Includes diagnostics commands to validate toolchain and NDK detection.

## Requirements

- VS Code `1.95.0` or newer.
- Microsoft C/C++ extension: `ms-vscode.cpptools`.
- A working vbcc installation.
- Optional but recommended: Amiga NDK.

## Quick Start

1. Install **VBCC Amiga Compiler Support**.
2. Install/enable **C/C++** (`ms-vscode.cpptools`).
3. Open Settings and configure your VBCC/NDK paths.
4. Run **VBCC Amiga: Validate Toolchain** from the Command Palette.
5. Open a C file and confirm IntelliSense resolves includes and symbols.

## Settings

Configure these in User Settings or your workspace `.vscode/settings.json`.

- `vbccAmiga.vbccRoot`
Absolute path to VBCC root. If unset, the extension tries `$VBCC`; if that is unavailable, defaults to `/opt/amiga/vbcc` on Linux/macOS and `C:\\vbcc` on Windows.

- `vbccAmiga.ndkPath`
Absolute path to the Amiga NDK root.

- `vbccAmiga.vbccConfig`
vbcc profile name (for example `aos68k`).

- `vbccAmiga.vbccTarget`
Target folder under `targets/<target>`. If blank, inferred from `vbccAmiga.vbccConfig`.

- `vbccAmiga.intelliSenseMode`
IntelliSense mode reported to cpptools (for example `gcc-x64`, `clang-x64`).

- `vbccAmiga.cStandard`
C language standard for IntelliSense (`c89` or `c99`).

- `vbccAmiga.extraIncludePaths`
Additional include paths appended to IntelliSense config.

- `vbccAmiga.extraDefines`
Additional preprocessor defines appended to IntelliSense config.

Example:

```json
{
  "vbccAmiga.vbccRoot": "/opt/amiga/vbcc",
  "vbccAmiga.ndkPath": "/opt/amiga/ndk39",
  "vbccAmiga.vbccConfig": "aos68k",
  "vbccAmiga.vbccTarget": "",
  "vbccAmiga.intelliSenseMode": "gcc-x64",
  "vbccAmiga.cStandard": "c89",
  "vbccAmiga.extraIncludePaths": [
    "${workspaceFolder}/include"
  ],
  "vbccAmiga.extraDefines": [
    "_DEBUG"
  ]
}
```

## Commands

- `VBCC Amiga: Validate Toolchain`
Checks whether configured VBCC and NDK paths look valid.

- `VBCC Amiga: Generate c_cpp_properties.json`
Writes IntelliSense settings into `.vscode/c_cpp_properties.json`.

- `VBCC Amiga: Report NDK Version`
Shows detected NDK version information.

- `VBCC Amiga: Report NDK Paths`
Shows resolved NDK include/library paths.

## How Path Resolution Works

- IntelliSense include and browse paths include VBCC system headers and detected NDK headers.
- NDK include/library paths are added to compiler arguments when found.
- VBCC target can be inferred from `vbccAmiga.vbccConfig` when `vbccAmiga.vbccTarget` is empty.

Common inference rules:

- `aos68k*` -> `m68k-amigaos`
- `aosppc` -> `ppc-amigaos`
- `kick13*` -> `m68k-kick13`
- `morphos|powerup|warpos` -> `ppc-<config>`

## Known Limitations

- vbcc is C-focused in this workflow (`c89`/`c99`).
- This extension configures IntelliSense only; it does not run builds.

## Troubleshooting

- Run **VBCC Amiga: Validate Toolchain** first.
- Verify `vbccAmiga.vbccRoot` and `vbccAmiga.ndkPath` are absolute paths.
- If IntelliSense looks stale, run **C/C++: Reset IntelliSense Database** and reopen a C file.
- If needed, regenerate `.vscode/c_cpp_properties.json` with the provided command.

## License

MIT
