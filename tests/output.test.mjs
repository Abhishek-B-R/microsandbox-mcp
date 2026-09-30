import assert from "node:assert/strict";
import test from "node:test";

import { limitText } from "../dist/utils/output.js";

test("limitText returns short text unchanged", () => {
  assert.deepEqual(limitText("hello", "stdout", 5), { text: "hello" });
});

test("limitText does not split a multi-byte character", () => {
  const result = limitText("héllo", "stdout", 2);

  assert.equal(result.text, "h");
  assert.deepEqual(result.truncated, { field: "stdout", returnedBytes: 1, totalBytes: 6 });
});

test("limitText never reports more bytes than the limit", () => {
  const value = "日本語🚀";
  for (let maxBytes = 1; maxBytes < Buffer.byteLength(value, "utf8"); maxBytes += 1) {
    const result = limitText(value, "content", maxBytes);

    assert.ok(result.truncated, `expected truncation at ${maxBytes} bytes`);
    assert.ok(result.truncated.returnedBytes <= maxBytes, `returned too much at ${maxBytes} bytes`);
    assert.ok(value.startsWith(result.text), `returned text is not a prefix at ${maxBytes} bytes`);
  }
});
