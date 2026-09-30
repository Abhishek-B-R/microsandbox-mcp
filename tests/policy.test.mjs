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

test("host path allowlist accepts paths under a root configured through a symlink", () => {
  const realRoot = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "microsandbox-mcp-policy-")));
  const linkParent = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "microsandbox-mcp-link-")));
  const linkedRoot = path.join(linkParent, "root");
  fs.symlinkSync(realRoot, linkedRoot);
  fs.writeFileSync(path.join(realRoot, "child.txt"), "ok");

  process.env.MICROSANDBOX_MCP_HOST_PATHS = linkedRoot;
  process.env.MICROSANDBOX_MCP_HOST_PATH_POLICY = "allowlist";
  resetServerConfigForTests();

  assert.equal(assertHostPathAllowed(path.join(linkedRoot, "child.txt")), path.join(realRoot, "child.txt"));
  assert.equal(assertHostPathAllowed(path.join(linkedRoot, "new.txt")), path.join(realRoot, "new.txt"));
});
