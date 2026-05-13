import * as path from "node:path";
import { SourceFileConfiguration, WorkspaceBrowseConfiguration } from "vscode-cpptools";
import {
  CppStandard,
  IntelliSenseMode,
  VbccAmigaSettings,
  getEffectiveVbccConfig,
  getEffectiveVbccTarget,
  getNdkIncludePaths,
  getNdkLibraryPaths,
  getVbccArchitectureDefine,
  getVbccConfigArg,
  getVbccSystemIncludePaths,
  getVbccSystemLibraryPaths,
  normalizePath,
  pathExists,
  resolveToolchainPaths,
  uniqueExistingPaths,
} from "./settings";

export interface CppPropertiesConfiguration {
  name: string;
  includePath: string[];
  defines: string[];
  intelliSenseMode: IntelliSenseMode;
  cStandard: CppStandard;
  compilerPath?: string;
  compilerArgs: string[];
  browse: {
    path: string[];
  };
}

export function buildIncludePath(settings: VbccAmigaSettings, workspacePath: string): string[] {
  const includePath: string[] = [path.join(workspacePath, "**")];
  const vbccConfig = getEffectiveVbccConfig(settings);
  const vbccTarget = getEffectiveVbccTarget(settings);

  includePath.push(...getVbccSystemIncludePaths(settings.vbccRoot, vbccConfig, vbccTarget));
  includePath.push(...getNdkIncludePaths(settings.ndkPath, vbccTarget));
  includePath.push(...settings.extraIncludePaths.map(normalizePath).filter(Boolean));

  return uniqueExistingPaths(includePath);
}

export function buildBrowsePath(settings: VbccAmigaSettings, workspacePaths: string[]): string[] {
  const browsePath: string[] = workspacePaths.map((workspacePath) => path.join(workspacePath, "**"));
  const vbccConfig = getEffectiveVbccConfig(settings);
  const vbccTarget = getEffectiveVbccTarget(settings);

  browsePath.push(...getVbccSystemIncludePaths(settings.vbccRoot, vbccConfig, vbccTarget));
  browsePath.push(...getNdkIncludePaths(settings.ndkPath, vbccTarget));
  browsePath.push(...settings.extraIncludePaths.map(normalizePath).filter(Boolean));

  return uniqueExistingPaths(browsePath);
}

export function buildDefines(settings: VbccAmigaSettings): string[] {
  const vbccConfig = getEffectiveVbccConfig(settings);
  const vbccTarget = getEffectiveVbccTarget(settings);

  const defines = ["__VBCC__"];
  const architectureDefine = getVbccArchitectureDefine(vbccConfig, vbccTarget);
  if (architectureDefine) {
    defines.push(architectureDefine);
  }

  defines.push(...settings.extraDefines.filter((item) => item.trim().length > 0));
  return Array.from(new Set(defines));
}

export function buildCompilerArgs(settings: VbccAmigaSettings): string[] {
  const args: string[] = [];
  const vbccConfig = getEffectiveVbccConfig(settings);
  const vbccTarget = getEffectiveVbccTarget(settings);

  if (vbccConfig) {
    args.push(getVbccConfigArg(vbccConfig));
  }

  if (!vbccConfig) {
    for (const includePath of getVbccSystemIncludePaths(settings.vbccRoot, vbccConfig, vbccTarget)) {
      args.push("-I", includePath);
    }

    for (const libPath of getVbccSystemLibraryPaths(settings.vbccRoot, vbccConfig, vbccTarget)) {
      args.push("-L", libPath);
    }
  }

  for (const includePath of getNdkIncludePaths(settings.ndkPath, vbccTarget)) {
    args.push("-I", includePath);
  }

  for (const libPath of getNdkLibraryPaths(settings.ndkPath, vbccTarget)) {
    args.push("-L", libPath);
  }

  return args;
}

export function buildSourceFileConfiguration(
  settings: VbccAmigaSettings,
  workspacePath?: string,
): SourceFileConfiguration {
  const toolchainPaths = resolveToolchainPaths(settings.vbccRoot);
  const workspacePaths = workspacePath ? [workspacePath] : [];

  return {
    includePath: buildBrowsePath(settings, workspacePaths),
    defines: buildDefines(settings),
    intelliSenseMode: settings.intelliSenseMode,
    standard: settings.cStandard,
    compilerPath: pathExists(toolchainPaths.vbccPath) ? toolchainPaths.vbccPath : undefined,
    compilerArgs: buildCompilerArgs(settings),
  };
}

export function buildWorkspaceBrowseConfiguration(
  settings: VbccAmigaSettings,
  workspacePaths: string[],
): WorkspaceBrowseConfiguration {
  const toolchainPaths = resolveToolchainPaths(settings.vbccRoot);

  return {
    browsePath: buildBrowsePath(settings, workspacePaths),
    compilerPath: pathExists(toolchainPaths.vbccPath) ? toolchainPaths.vbccPath : undefined,
    standard: settings.cStandard,
    compilerArgs: buildCompilerArgs(settings),
  };
}

export function buildCcppPropertiesConfiguration(settings: VbccAmigaSettings, workspacePath: string): CppPropertiesConfiguration {
  const toolchainPaths = resolveToolchainPaths(settings.vbccRoot);
  const includePath = buildIncludePath(settings, workspacePath);

  return {
    name: "VBCC Amiga",
    includePath,
    defines: buildDefines(settings),
    intelliSenseMode: settings.intelliSenseMode,
    cStandard: settings.cStandard,
    compilerPath: pathExists(toolchainPaths.vbccPath) ? toolchainPaths.vbccPath : undefined,
    compilerArgs: buildCompilerArgs(settings),
    browse: {
      path: includePath,
    },
  };
}