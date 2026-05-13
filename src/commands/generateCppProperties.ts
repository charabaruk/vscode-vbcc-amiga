import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { buildCcppPropertiesConfiguration, getSettings, trace } from "../core";

export async function writeCcppPropertiesFromSettings(): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
  if (workspaceFolders.length === 0) {
    vscode.window.showErrorMessage("VBCC Amiga: Open a workspace folder before generating c_cpp_properties.json.");
    return;
  }

  const updatedFiles: string[] = [];

  for (const folder of workspaceFolders) {
    const settings = getSettings(folder.uri);
    const configuration = buildCcppPropertiesConfiguration(settings, folder.uri.fsPath);
    const cCppPropertiesPath = path.join(folder.uri.fsPath, ".vscode", "c_cpp_properties.json");
    const payload = {
      version: 4,
      configurations: [configuration],
    };

    fs.mkdirSync(path.dirname(cCppPropertiesPath), { recursive: true });
    fs.writeFileSync(cCppPropertiesPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    updatedFiles.push(cCppPropertiesPath);
  }

  trace(`writeCcppPropertiesFromSettings updated=${updatedFiles.length}`);
  vscode.window.showInformationMessage(
    `VBCC Amiga: Updated c_cpp_properties.json in ${updatedFiles.length} workspace folder(s).`,
  );
}