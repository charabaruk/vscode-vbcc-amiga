import * as vscode from "vscode";
import {
  CustomConfigurationProvider,
  SourceFileConfiguration,
  SourceFileConfigurationItem,
  WorkspaceBrowseConfiguration,
} from "vscode-cpptools";
import { buildSourceFileConfiguration, buildWorkspaceBrowseConfiguration, getSettings, isSupportedCSource, trace } from "../core";

export class VbccAmigaConfigurationProvider implements CustomConfigurationProvider {
  public readonly name = "VBCC Amiga";
  public readonly extensionId = "charabaruk.vbcc-amiga";

  public async canProvideConfiguration(uri: vscode.Uri): Promise<boolean> {
    const canProvide = uri.scheme === "file" && isSupportedCSource(uri);
    trace(`provider.canProvideConfiguration uri=${uri.fsPath} result=${canProvide}`);
    return canProvide;
  }

  public async provideConfigurations(uris: vscode.Uri[]): Promise<SourceFileConfigurationItem[]> {
    const configurations = uris
      .filter((uri) => uri.scheme === "file" && isSupportedCSource(uri))
      .map((uri) => ({
        uri,
        configuration: this.buildSourceConfiguration(uri),
      }));

    trace(`provider.provideConfigurations requested=${uris.length} provided=${configurations.length}`);
    return configurations;
  }

  public async canProvideBrowseConfiguration(): Promise<boolean> {
    trace("provider.canProvideBrowseConfiguration result=true");
    return true;
  }

  public async provideBrowseConfiguration(): Promise<WorkspaceBrowseConfiguration | null> {
    trace("provider.provideBrowseConfiguration start");
    const settings = getSettings();
    const workspacePaths = (vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri.fsPath);
    const configuration = buildWorkspaceBrowseConfiguration(settings, workspacePaths);

    trace(`provider.provideBrowseConfiguration browsePathCount=${configuration.browsePath.length}`);
    return configuration;
  }

  public async canProvideBrowseConfigurationsPerFolder(): Promise<boolean> {
    trace("provider.canProvideBrowseConfigurationsPerFolder result=true");
    return true;
  }

  public async provideFolderBrowseConfiguration(uri: vscode.Uri): Promise<WorkspaceBrowseConfiguration | null> {
    trace(`provider.provideFolderBrowseConfiguration start folder=${uri.fsPath}`);
    const settings = getSettings();
    const configuration = buildWorkspaceBrowseConfiguration(settings, [uri.fsPath]);

    trace(`provider.provideFolderBrowseConfiguration folder=${uri.fsPath} browsePathCount=${configuration.browsePath.length}`);
    return configuration;
  }

  public dispose(): void {
    trace("provider.dispose");
  }

  private buildSourceConfiguration(uri: vscode.Uri): SourceFileConfiguration {
    const settings = getSettings();
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    return buildSourceFileConfiguration(settings, workspaceFolder?.uri.fsPath);
  }
}