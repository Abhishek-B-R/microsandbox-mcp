import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { resetServerConfigForTests } from "../dist/config.js";
import { PolicyError, assertHostPathAllowed } from "../dist/utils/policy.js";

test("host path allowlist accepts paths under configured roots", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "microsandbox-mcp-policy-"));
  const child = path.join(root, "child.txt");
  fs.writeFileSync(child, "ok");

  process.env.MICROSANDBOX_MCP_HOST_PATHS = fs.realpathSync.native(root);
  process.env.MICROSANDBOX_MCP_HOST_PATH_POLICY = "allowlist";
  resetServerConfigForTests();

  assert.equal(assertHostPathAllowed(child), fs.realpathSync.native(child));
});

test("host path allowlist rejects paths outside configured roots", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "microsandbox-mcp-policy-"));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "microsandbox-mcp-outside-"));

  process.env.MICROSANDBOX_MCP_HOST_PATHS = fs.realpathSync.native(root);
  process.env.MICROSANDBOX_MCP_HOST_PATH_POLICY = "allowlist";
  resetServerConfigForTests();

  assert.throws(() => assertHostPathAllowed(outside), PolicyError);
});

test("host path allowlist rejects new paths reached through a symlink out of the root", () => {
  const root = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "microsandbox-mcp-policy-")));
  const outside = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "microsandbox-mcp-outside-")));
  fs.symlinkSync(outside, path.join(root, "escape"));
  fs.symlinkSync(path.join(outside, "planted.txt"), path.join(root, "dangling"));
  fs.mkdirSync(path.join(outside, "deep"));
  fs.symlinkSync(path.join(outside, "deep"), path.join(root, "deep"));
  fs.symlinkSync("../relative.txt", path.join(outside, "deep", "relative"));

  process.env.MICROSANDBOX_MCP_HOST_PATHS = root;
  process.env.MICROSANDBOX_MCP_HOST_PATH_POLICY = "allowlist";
  resetServerConfigForTests();

  assert.throws(() => assertHostPathAllowed(path.join(root, "escape", "new-dir", "file.txt")), PolicyError);
  assert.throws(() => assertHostPathAllowed(path.join(root, "dangling")), PolicyError);
  assert.throws(() => assertHostPathAllowed(path.join(root, "deep", "relative")), PolicyError);
});

test("host path allowlist accepts new nested paths under the root", () => {
  const root = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "microsandbox-mcp-policy-")));

  process.env.MICROSANDBOX_MCP_HOST_PATHS = root;
  process.env.MICROSANDBOX_MCP_HOST_PATH_POLICY = "allowlist";
  resetServerConfigForTests();

  const nested = path.join(root, "new-dir", "deeper", "file.txt");
  assert.equal(assertHostPathAllowed(nested), nested);
});
