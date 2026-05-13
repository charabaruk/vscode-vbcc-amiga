import * as vscode from "vscode";
import { getSettings, pathExists, resolveNdkVersionWithSource, trace } from "../core";
import { resolveNdkReportState } from "./ndkReportState";

export async function reportDetectedNdkVersion(): Promise<void> {
  const settings = getSettings();
  const ndkState = resolveNdkReportState(settings);

  if (!ndkState.ndkRoot) {
    vscode.window.showWarningMessage("VBCC Amiga: vbccAmiga.ndkPath is empty.");
    return;
  }

  if (!pathExists(ndkState.ndkRoot)) {
    vscode.window.showWarningMessage(`VBCC Amiga: NDK path does not exist: ${ndkState.ndkRoot}`);
    return;
  }

  const detection = resolveNdkVersionWithSource(ndkState.ndkRoot, ndkState.vbccTarget);

  const sourceLabelByKind: Record<typeof detection.source, string> = {
    ppc: "PPC target (no explicit NDK version mapping)",
    path: "sniffed from ndkPath",
    target: "inferred from vbccTarget",
    none: "no version match",
  };

  const message = [
    "VBCC Amiga NDK detection",
    `ndkPath: ${ndkState.ndkRoot}`,
    `vbccTarget: ${ndkState.vbccTarget || "(empty)"}`,
    `detectedVersion: ${detection.version ?? "unknown"}`,
    `source: ${sourceLabelByKind[detection.source]}`,
    `includePaths: ${ndkState.includePaths.length}`,
    `libraryPaths: ${ndkState.libraryPaths.length}`,
  ].join("\n");

  trace(
    `reportDetectedNdkVersion version=${detection.version ?? "unknown"} source=${detection.source} includePaths=${ndkState.includePaths.length} libraryPaths=${ndkState.libraryPaths.length}`,
  );

  void vscode.window.showInformationMessage(message, { modal: true });
}