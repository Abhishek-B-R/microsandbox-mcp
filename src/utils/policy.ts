import fs from "node:fs";
import path from "node:path";

import { getServerConfig } from "../config.js";
import { fail, type ToolResult } from "./response.js";

export class PolicyError extends Error {
  readonly code = "host_path_denied";

  constructor(message: string, readonly path: string) {
    super(message);
  }
}

export function assertHostPathAllowed(rawPath: string): string {
  const config = getServerConfig();
  const resolved = resolveExistingAware(rawPath);

  if (config.hostPathPolicy === "unrestricted") {
    return resolved;
  }

  const allowed = config.hostPaths.some((allowedPath) => isWithinPath(resolved, allowedPath));
  if (!allowed) {
    throw new PolicyError("host path is outside MICROSANDBOX_MCP_HOST_PATHS", resolved);
  }

  return resolved;
}

export function formatPolicyError(error: PolicyError): ToolResult {
  return fail(error.code, error.message, { details: { path: error.path } });
}

const MAX_SYMLINK_HOPS = 40;

// Resolve symlinks in the longest existing prefix of the path, following
// dangling links too, so a path that does not exist yet is checked against
// where it would actually be created.
function resolveExistingAware(rawPath: string): string {
  const resolved = path.resolve(rawPath);
  const missing: string[] = [];
  let current = resolved;
  let hops = 0;

  while (true) {
    try {
      return path.join(fs.realpathSync.native(current), ...missing);
    } catch {
      // Fall through and resolve what does exist.
    }

    const target = readLinkOrUndefined(current);
    if (target !== undefined && hops < MAX_SYMLINK_HOPS) {
      hops += 1;
      // The link exists, so its directory does too. Resolve the target from
      // the real directory so ".." in the target is followed the way the OS
      // follows it.
      current = path.resolve(fs.realpathSync.native(path.dirname(current)), target);
      continue;
    }

    const parent = path.dirname(current);
    if (parent === current || target !== undefined) {
      return resolved;
    }
    missing.unshift(path.basename(current));
    current = parent;
  }
}

function readLinkOrUndefined(candidate: string): string | undefined {
  try {
    return fs.readlinkSync(candidate);
  } catch {
    return undefined;
  }
}

function isWithinPath(candidate: string, allowedPath: string): boolean {
  const relative = path.relative(allowedPath, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
