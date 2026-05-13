import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { SourceFileConfiguration } from "vscode-cpptools";

export type IntelliSenseMode = NonNullable<SourceFileConfiguration["intelliSenseMode"]>;
export type CppStandard = NonNullable<SourceFileConfiguration["standard"]>;

export interface VbccAmigaSettings {
  vbccRoot: string;
  ndkPath: string;
  vbccConfig: string;
  vbccTarget: string;
  intelliSenseMode: IntelliSenseMode;
  cStandard: CppStandard;
  extraIncludePaths: string[];
  extraDefines: string[];
}

export interface ResolvedToolchainPaths {
  vbccPath: string;
  vasmPath: string;
  vasmPpcPath: string;
  vlinkPath: string;
}

type NdkVersionKey = "1.3" | "2.0" | "3.1" | "3.2" | "3.5" | "3.9";

const NDK_INCLUDE_SEGMENTS_BY_VERSION: Readonly<Record<NdkVersionKey, readonly string[][]>> = {
  "1.3": [],
  "2.0": [],
  "3.1": [],
  "3.2": [
    ["Include_H"],
    ["Include_I"],
  ],
  "3.5": [
    ["Include", "include_h"],
    ["Include", "include_i"],
  ],
  "3.9": [
    ["Include", "include_h"],
    ["Include", "include_i"],
  ],
};

const NDK_LIBRARY_SEGMENTS_BY_VERSION: Readonly<Record<NdkVersionKey, readonly string[][]>> = {
  "1.3": [],
  "2.0": [],
  "3.1": [],
  "3.2": [["lib"]],
  "3.5": [["Include", "linker_libs"]],
  "3.9": [["Include", "linker_libs"]],
};

export function uniqueExistingPaths(paths: string[]): string[] {
  const output: string[] = [];
  const seen = new Set<string>();

  for (const raw of paths) {
    const candidate = normalizePath(raw);
    if (!candidate) {
      continue;
    }

    const nonGlobPath = candidate.endsWith("/**") ? candidate.slice(0, -3) : candidate;
    if (!pathExists(nonGlobPath)) {
      continue;
    }

    if (seen.has(candidate)) {
      continue;
    }

    seen.add(candidate);
    output.push(candidate);
  }

  return output;
}

export function getNdkIncludePaths(ndkPath: string, vbccTarget: string): string[] {
  const root = normalizePath(ndkPath);
  if (!root) {
    return [];
  }

  if (isPpcTarget(vbccTarget)) {
    const ppcPaths = getPpcNdkIncludePaths(root, vbccTarget);
    if (ppcPaths.length > 0) {
      return ppcPaths;
    }

    return getFallbackNdkIncludePaths(root);
  }

  const ndkVersion = resolveNdkVersion(root, vbccTarget);
  if (!ndkVersion) {
    return getFallbackNdkIncludePaths(root);
  }

  const resolvedPaths = getNdkIncludePathsForVersion(root, ndkVersion, vbccTarget);
  if (resolvedPaths.length > 0) {
    return resolvedPaths;
  }

  return getFallbackNdkIncludePaths(root);
}

function resolveNdkVersion(ndkRoot: string, vbccTarget: string): NdkVersionKey | undefined {
  if (isPpcTarget(vbccTarget)) {
    return undefined;
  }

  const sniffedVersion = sniffNdkVersionFromPath(ndkRoot);
  if (sniffedVersion) {
    return sniffedVersion;
  }

  return getDefaultNdkVersionForTarget(vbccTarget);
}

export function resolveNdkVersionWithSource(ndkRoot: string, vbccTarget: string): {
  version: NdkVersionKey | undefined;
  source: "ppc" | "path" | "target" | "none";
} {
  if (isPpcTarget(vbccTarget)) {
    return { version: undefined, source: "ppc" };
  }

  const sniffedVersion = sniffNdkVersionFromPath(ndkRoot);
  if (sniffedVersion) {
    return { version: sniffedVersion, source: "path" };
  }

  const inferredVersion = getDefaultNdkVersionForTarget(vbccTarget);
  if (inferredVersion) {
    return { version: inferredVersion, source: "target" };
  }

  return { version: undefined, source: "none" };
}

function sniffNdkVersionFromPath(ndkRoot: string): NdkVersionKey | undefined {
  const normalized = ndkRoot.replace(/\\/g, "/");
  const tailMatch = /ndk[/_]?(?<v>\d\.\d+)\/?$/i.exec(normalized);
  const tailVersion = tailMatch?.groups?.v;

  if (tailVersion) {
    switch (true) {
      case tailVersion === "3.9":
        return "3.9";
      case tailVersion === "3.5":
        return "3.5";
      case tailVersion === "3.2":
        return "3.2";
      case tailVersion === "3.1" || tailVersion === "3.0":
        return "3.1";
      case tailVersion.startsWith("2."):
        return "2.0";
      case tailVersion.startsWith("1."):
        return "1.3";
      default:
        break;
    }
  }

  return undefined;
}

function getDefaultNdkVersionForTarget(vbccTarget: string): NdkVersionKey | undefined {
  const normalizedTarget = vbccTarget.trim().toLowerCase();
  if (!normalizedTarget) {
    return undefined;
  }

  if (normalizedTarget === "m68k-kick13") {
    return "1.3";
  }

  if (isM68kTarget(normalizedTarget)) {
    return "3.2";
  }

  return undefined;
}

function isPpcTarget(vbccTarget: string): boolean {
  const normalizedTarget = vbccTarget.trim().toLowerCase();
  return normalizedTarget.startsWith("ppc") || normalizedTarget.includes("-ppc");
}

function isM68kTarget(vbccTarget: string): boolean {
  const normalizedTarget = vbccTarget.trim().toLowerCase();
  return normalizedTarget.startsWith("m68k") || normalizedTarget.includes("-m68k");
}

function resolveNdkRootRelativePaths(ndkRoot: string, pathSegments: readonly string[][]): string[] {
  const absolutePaths = pathSegments.map((segments) => path.join(ndkRoot, ...segments));
  return uniqueExistingPaths(absolutePaths);
}

function getNdkIncludePathsForVersion(ndkRoot: string, ndkVersion: NdkVersionKey, _vbccTarget: string): string[] {
  return resolveNdkRootRelativePaths(ndkRoot, NDK_INCLUDE_SEGMENTS_BY_VERSION[ndkVersion]);
}

function getFallbackNdkIncludePaths(ndkRoot: string): string[] {
  const candidates = [
    path.join(ndkRoot, "Include_H"),
    path.join(ndkRoot, "Include_I"),
    path.join(ndkRoot, "Include", "include_h"),
    path.join(ndkRoot, "Include", "include_i"),
  ];

  return uniqueExistingPaths(candidates);
}

function getPpcNdkIncludePaths(_ndkRoot: string, _vbccTarget: string): string[] {
  return [];
}

export function getNdkLibraryPaths(ndkPath: string, vbccTarget: string): string[] {
  const root = normalizePath(ndkPath);
  if (!root) {
    return [];
  }

  if (isPpcTarget(vbccTarget)) {
    const ppcPaths = getPpcNdkLibraryPaths(root, vbccTarget);
    if (ppcPaths.length > 0) {
      return ppcPaths;
    }

    return getFallbackNdkLibraryPaths(root);
  }

  const ndkVersion = resolveNdkVersion(root, vbccTarget);
  if (!ndkVersion) {
    return getFallbackNdkLibraryPaths(root);
  }

  const resolvedPaths = getNdkLibraryPathsForVersion(root, ndkVersion, vbccTarget);
  if (resolvedPaths.length > 0) {
    return resolvedPaths;
  }

  return getFallbackNdkLibraryPaths(root);
}

function getNdkLibraryPathsForVersion(ndkRoot: string, ndkVersion: NdkVersionKey, _vbccTarget: string): string[] {
  return resolveNdkRootRelativePaths(ndkRoot, NDK_LIBRARY_SEGMENTS_BY_VERSION[ndkVersion]);
}

function getFallbackNdkLibraryPaths(ndkRoot: string): string[] {
  const candidates = [
    path.join(ndkRoot, "lib"),
    path.join(ndkRoot, "Include", "linker_libs"),
  ];

  return uniqueExistingPaths(candidates);
}

function getPpcNdkLibraryPaths(_ndkRoot: string, _vbccTarget: string): string[] {
  return [];
}

function normalizeVbccConfigName(vbccConfig: string): string {
  return vbccConfig.trim().replace(/^\+/, "");
}

export function inferVbccTargetFromConfig(vbccConfig: string): string {
  const normalizedConfig = normalizeVbccConfigName(vbccConfig);

  if (/^aos68k.?$/i.test(normalizedConfig)) {
    return "m68k-amigaos";
  }

  if (/^kick13/i.test(normalizedConfig)) {
    return "m68k-kick13";
  }

  if (/^(aosppc|newlib)$/i.test(normalizedConfig)) {
    return "ppc-amigaos";
  }

  if (/^(morphos|powerup|warpos)$/i.test(normalizedConfig)) {
    return `ppc-${normalizedConfig.toLowerCase()}`;
  }

  return normalizedConfig;
}

export function getVbccArchitectureDefine(_vbccConfig: string, vbccTarget: string): string | undefined {
  const normalizedTarget = vbccTarget.trim().toLowerCase();
  if (!normalizedTarget) {
    return undefined;
  }

  if (normalizedTarget.startsWith("ppc") || normalizedTarget.includes("-ppc")) {
    return "__PPC__";
  }

  if (normalizedTarget.startsWith("m68k") || normalizedTarget.includes("-m68k")) {
    return "__M68K__";
  }

  return undefined;
}

function isNewlibConfig(vbccConfig: string): boolean {
  return /^newlib$/i.test(normalizeVbccConfigName(vbccConfig));
}

function getVbccNewlibIncludePaths(vbccRoot: string): string[] {
  const root = normalizePath(vbccRoot);
  if (!root) {
    return [];
  }

  const candidates = [
    path.join(root, "os4-sdk", "Local", "common", "include"),
    path.join(root, "os4-sdk", "Local", "newlib", "include"),
    path.join(root, "os4-sdk", "newlib", "include"),
    path.join(root, "os4-sdk", "Include", "include_h"),
  ];

  return uniqueExistingPaths(candidates);
}

function getVbccNewlibLibraryPaths(vbccRoot: string): string[] {
  const root = normalizePath(vbccRoot);
  if (!root) {
    return [];
  }

  const candidates = [path.join(root, "os4-sdk", "Local", "newlib", "lib")];

  return uniqueExistingPaths(candidates);
}

function getVbccTargetIncludePaths(vbccRoot: string, vbccTarget: string): string[] {
  const root = normalizePath(vbccRoot);
  const target = vbccTarget.trim();

  if (!root || !target) {
    return [];
  }

  const candidates = [path.join(root, "targets", target, "include")];
  return uniqueExistingPaths(candidates);
}

function getVbccTargetLibraryPaths(vbccRoot: string, vbccTarget: string): string[] {
  const root = normalizePath(vbccRoot);
  const target = vbccTarget.trim();

  if (!root || !target) {
    return [];
  }

  const candidates = [path.join(root, "targets", target, "lib")];
  return uniqueExistingPaths(candidates);
}

export function getVbccSystemIncludePaths(vbccRoot: string, vbccConfig: string, vbccTarget: string): string[] {
  if (isNewlibConfig(vbccConfig)) {
    return getVbccNewlibIncludePaths(vbccRoot);
  }

  return getVbccTargetIncludePaths(vbccRoot, vbccTarget);
}

export function getVbccSystemLibraryPaths(vbccRoot: string, vbccConfig: string, vbccTarget: string): string[] {
  if (isNewlibConfig(vbccConfig)) {
    return getVbccNewlibLibraryPaths(vbccRoot);
  }

  return getVbccTargetLibraryPaths(vbccRoot, vbccTarget);
}

export function normalizePath(value: string | undefined): string {
  if (!value) {
    return "";
  }

  return path.normalize(value.trim());
}

export function isSupportedCSource(uri: vscode.Uri): boolean {
  const ext = path.extname(uri.fsPath).toLowerCase();
  return [".c", ".h"].includes(ext);
}

export function pathExists(target: string): boolean {
  try {
    fs.accessSync(target, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function getEnvironmentVariable(name: string): string | undefined {
  for (const [key, value] of Object.entries(process.env)) {
    if (key.toUpperCase() === name.toUpperCase()) {
      return value;
    }
  }

  return undefined;
}

function getDefaultVbccRoot(): string {
  const vbccFromEnv = normalizePath(getEnvironmentVariable("VBCC"));
  if (vbccFromEnv) {
    return vbccFromEnv;
  }

  return process.platform === "win32" ? "C:\\vbcc" : "/opt/amiga/vbcc";
}

function isSettingDefinedInAnyScope(
  inspected: ReturnType<vscode.WorkspaceConfiguration["inspect"]> | undefined,
): boolean {
  if (!inspected) {
    return false;
  }

  return (
    inspected.globalValue !== undefined ||
    inspected.workspaceValue !== undefined ||
    inspected.workspaceFolderValue !== undefined ||
    inspected.globalLanguageValue !== undefined ||
    inspected.workspaceLanguageValue !== undefined ||
    inspected.workspaceFolderLanguageValue !== undefined
  );
}

function getConfiguredVbccRoot(cfg: vscode.WorkspaceConfiguration): string {
  const inspected = cfg.inspect<string>("vbccRoot");
  if (!isSettingDefinedInAnyScope(inspected)) {
    return getDefaultVbccRoot();
  }

  return normalizePath(cfg.get<string>("vbccRoot", ""));
}

function getExecutableName(baseName: string): string {
  return process.platform === "win32" ? `${baseName}.exe` : baseName;
}

function chooseFirstExistingPath(candidates: string[]): string {
  for (const candidate of candidates) {
    if (pathExists(candidate)) {
      return candidate;
    }
  }

  return candidates[0] ?? "";
}

export function resolveToolchainPaths(vbccRoot: string): ResolvedToolchainPaths {
  const root = normalizePath(vbccRoot);
  if (!root) {
    return {
      vbccPath: "",
      vasmPath: "",
      vasmPpcPath: "",
      vlinkPath: "",
    };
  }

  const binDirs = Array.from(
    new Set([
      path.join(root, "bin"),
      path.join(root, "Bin"),
      root,
    ]),
  );

  const resolveTool = (names: string[]): string => {
    const candidates = binDirs.flatMap((dir) => names.map((name) => path.join(dir, getExecutableName(name))));
    return chooseFirstExistingPath(candidates);
  };

  return {
    vbccPath: resolveTool(["vc", "vbcc"]),
    vasmPath: resolveTool(["vasmm68k_mot", "vasm"]),
    vasmPpcPath: resolveTool(["vasmppc_std"]),
    vlinkPath: resolveTool(["vlink"]),
  };
}

export function getSettings(scope?: vscode.ConfigurationScope): VbccAmigaSettings {
  const cfg = vscode.workspace.getConfiguration("vbccAmiga", scope);

  return {
    vbccRoot: getConfiguredVbccRoot(cfg),
    ndkPath: normalizePath(cfg.get<string>("ndkPath", "")),
    vbccConfig: cfg.get<string>("vbccConfig", "aos68k"),
    vbccTarget: cfg.get<string>("vbccTarget", ""),
    intelliSenseMode: cfg.get<IntelliSenseMode>("intelliSenseMode", "gcc-x64"),
    cStandard: cfg.get<CppStandard>("cStandard", "c89"),
    extraIncludePaths: cfg.get<string[]>("extraIncludePaths", []),
    extraDefines: cfg.get<string[]>("extraDefines", []),
  };
}

export function getEffectiveVbccConfig(settings: VbccAmigaSettings): string {
  return settings.vbccConfig.trim();
}

export function getEffectiveVbccTarget(settings: VbccAmigaSettings): string {
  const explicitTarget = settings.vbccTarget.trim();
  if (explicitTarget) {
    return explicitTarget;
  }

  return inferVbccTargetFromConfig(getEffectiveVbccConfig(settings));
}

export function getVbccConfigArg(vbccConfig: string): string {
  const normalized = vbccConfig.trim();
  return normalized.startsWith("+") ? normalized : `+${normalized}`;
}