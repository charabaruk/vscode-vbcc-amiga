import * as fs from "node:fs";
import * as vscode from "vscode";
import { getSettings, pathExists, resolveToolchainPaths, trace } from "../core";

export async function validateToolchainPaths(): Promise<void> {
  trace("validateToolchainPaths start");
  const settings = getSettings();
  const toolchainPaths = resolveToolchainPaths(settings.vbccRoot);
  const checks: Array<{ name: string; value: string; expectDir: boolean; required: boolean }> = [
    { name: "VBCC root", value: settings.vbccRoot, expectDir: true, required: true },
    { name: "vbcc frontend", value: toolchainPaths.vbccPath, expectDir: false, required: true },
    { name: "vasm", value: toolchainPaths.vasmPath, expectDir: false, required: true },
    { name: "vasm PPC", value: toolchainPaths.vasmPpcPath, expectDir: false, required: false },
    { name: "vlink", value: toolchainPaths.vlinkPath, expectDir: false, required: true },
    { name: "Amiga NDK", value: settings.ndkPath, expectDir: true, required: true },
  ];

  const errors: string[] = [];

  for (const check of checks) {
    if (!check.value) {
      if (check.required) {
        errors.push(`${check.name}: setting is empty`);
      }
      continue;
    }

    if (!pathExists(check.value)) {
      errors.push(`${check.name}: path does not exist (${check.value})`);
      continue;
    }

    try {
      const stat = fs.statSync(check.value);
      if (check.expectDir && !stat.isDirectory()) {
        errors.push(`${check.name}: expected a directory (${check.value})`);
      }
      if (!check.expectDir && stat.isDirectory()) {
        errors.push(`${check.name}: expected a file/executable (${check.value})`);
      }
    } catch {
      errors.push(`${check.name}: unable to stat path (${check.value})`);
    }
  }

  if (errors.length === 0) {
    trace("validateToolchainPaths result=valid");
    vscode.window.showInformationMessage("VBCC Amiga toolchain settings look valid.");
    return;
  }

  trace(`validateToolchainPaths result=invalid count=${errors.length}`);
  const message = `VBCC Amiga toolchain issues:\n${errors.join("\n")}`;
  void vscode.window.showErrorMessage(message, { modal: true });
}