import * as vscode from "vscode";
import { getSettings, trace } from "../core";
import { resolveNdkReportState } from "./ndkReportState";

export async function reportResolvedNdkPaths(): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
  if (workspaceFolders.length === 0) {
    vscode.window.showErrorMessage("VBCC Amiga: Open a workspace folder before reporting NDK paths.");
    return;
  }

  const sections: string[] = ["VBCC Amiga NDK path debug report"];

  for (const folder of workspaceFolders) {
    const settings = getSettings(folder.uri);
    const ndkState = resolveNdkReportState(settings);

    const includeListing = ndkState.includePaths.length > 0
      ? ndkState.includePaths.map((item) => `  - ${item}`).join("\n")
      : "  (none)";
    const libraryListing = ndkState.libraryPaths.length > 0
      ? ndkState.libraryPaths.map((item) => `  - ${item}`).join("\n")
      : "  (none)";

    sections.push(
      [
        `workspaceFolder: ${folder.uri.fsPath}`,
        `ndkPath: ${ndkState.ndkRoot || "(empty)"}`,
        `vbccTarget: ${ndkState.vbccTarget || "(empty)"}`,
        "includePaths:",
        includeListing,
        "libraryPaths:",
        libraryListing,
      ].join("\n"),
    );

    trace(
      `reportResolvedNdkPaths folder=${folder.uri.fsPath} includePaths=${ndkState.includePaths.length} libraryPaths=${ndkState.libraryPaths.length}`,
    );
  }

  for (const section of sections) {
    trace(section);
  }

  void vscode.window.showInformationMessage(
    `VBCC Amiga: NDK path report written to the \"VBCC Amiga\" output channel (${workspaceFolders.length} folder(s)).`,
    { modal: true },
  );
}