import * as vscode from "vscode";
import { writeCcppPropertiesFromSettings } from "./generateCppProperties";
import { reportResolvedNdkPaths } from "./reportNdkPaths";
import { reportDetectedNdkVersion } from "./reportNdkVersion";
import { validateToolchainPaths } from "./validateToolchain";

export function registerCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("vbccAmiga.validateToolchain", validateToolchainPaths),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vbccAmiga.generateCppProperties", writeCcppPropertiesFromSettings),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vbccAmiga.reportNdkVersion", reportDetectedNdkVersion),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vbccAmiga.reportNdkPaths", reportResolvedNdkPaths),
  );
}