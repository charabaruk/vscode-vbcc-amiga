import {
  VbccAmigaSettings,
  getEffectiveVbccTarget,
  getNdkIncludePaths,
  getNdkLibraryPaths,
  normalizePath,
} from "../core";

export interface NdkReportState {
  ndkRoot: string;
  vbccTarget: string;
  includePaths: string[];
  libraryPaths: string[];
}

export function resolveNdkReportState(settings: VbccAmigaSettings): NdkReportState {
  const ndkRoot = normalizePath(settings.ndkPath);
  const vbccTarget = getEffectiveVbccTarget(settings);

  return {
    ndkRoot,
    vbccTarget,
    includePaths: getNdkIncludePaths(settings.ndkPath, vbccTarget),
    libraryPaths: getNdkLibraryPaths(settings.ndkPath, vbccTarget),
  };
}