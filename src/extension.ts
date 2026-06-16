import * as vscode from "vscode";
import {
  CppToolsApi,
  CustomConfigurationProvider,
  Version,
  getCppToolsApi,
} from "vscode-cpptools";
import { registerCommands } from "./commands";
import { trace, traceOutput } from "./core";
import { VbccAmigaConfigurationProvider, registerVbccAttributeHelpProvider } from "./providers";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  context.subscriptions.push(traceOutput);
  trace("activate start");

  const provider = new VbccAmigaConfigurationProvider();
  context.subscriptions.push(provider);

  const api = await getCppToolsApi(Version.latest);
  if (!api) {
    trace("activate cpptoolsApi=unavailable");
    vscode.window.showWarningMessage(
      "VBCC Amiga: The C/C++ extension (ms-vscode.cpptools) is required for configuration provider integration.",
    );
  } else {
    trace("activate cpptoolsApi=available");
    registerProviderWithCppTools(api, provider, context);
  }

  registerCommands(context);
  registerVbccAttributeHelpProvider(context);

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      trace("onDidChangeConfiguration received");
      if (!event.affectsConfiguration("vbccAmiga")) {
        trace("onDidChangeConfiguration ignored (vbccAmiga unaffected)");
        return;
      }

      if (!api) {
        trace("onDidChangeConfiguration ignored (cpptools API unavailable)");
        return;
      }

      trace("onDidChangeConfiguration notifying cpptools");
      api.didChangeCustomConfiguration(provider);
      api.didChangeCustomBrowseConfiguration(provider);
    }),
  );

  trace("activate complete");
}

function registerProviderWithCppTools(
  api: CppToolsApi,
  provider: CustomConfigurationProvider,
  context: vscode.ExtensionContext,
): void {
  trace("registerProviderWithCppTools start");
  api.registerCustomConfigurationProvider(provider);
  api.notifyReady(provider);
  context.subscriptions.push(api);
  trace("registerProviderWithCppTools complete");
}

export function deactivate(): void {
  trace("deactivate");
}
