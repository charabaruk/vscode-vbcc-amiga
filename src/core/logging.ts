import * as vscode from "vscode";

export const traceOutput = vscode.window.createOutputChannel("VBCC Amiga");

export function trace(message: string): void {
  const line = `[VBCC Amiga][trace] ${new Date().toISOString()} ${message}`;
  traceOutput.appendLine(line);
  console.log(line);
}