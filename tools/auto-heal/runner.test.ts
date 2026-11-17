import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const runner = fileURLToPath(new URL("./runner.ts", import.meta.url));
const loader = import.meta.resolve("tsx");
const path = "src/services/reservation.service.ts";
const original = "if (!overlap) throw new Error('Conflict');\n";
const fix = { path, before: "if (!overlap)", after: "if (overlap)" };
for (const scenario of [
  { name: "applies a unique source edit and records evidence", edits: [fix], ok: true },
  { name: "rejects changes to tests", edits: [{ ...fix, path: "src/services/__tests__/reservation.test.ts" }], ok: false },
  { name: "rejects path traversal", edits: [{ ...fix, path: "src/services/../../package.json" }], ok: false },
  { name: "rejects ambiguous or missing matches", edits: [{ ...fix, before: "missing text" }], ok: false },
  { name: "validates all edits before writing any file", edits: [fix, { ...fix, path: "package.json" }], ok: false },
  { name: "fails closed when the model cannot suggest a fix", edits: [], ok: false },
]) {
  test(scenario.name, () => {
    const cwd = mkdtempSync(join(tmpdir(), "campushub-heal-"));
    try {
      mkdirSync(join(cwd, "src/services"), { recursive: true });
      mkdirSync(join(cwd, ".auto-heal"));
      writeFileSync(join(cwd, path), original);
      writeFileSync(join(cwd, ".auto-heal/test-results.log"), "FAIL reservation: unexpected Conflict");
      writeFileSync(join(cwd, "package.json"), '{"type":"module"}');
      execFileSync("git", ["init", "-q"], { cwd });
      execFileSync("git", ["add", "src", "package.json"], { cwd });
      execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "-qm", "fixture"], { cwd });
      const fixture = join(cwd, "mock.ts");
      writeFileSync(fixture, `globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: ${JSON.stringify(JSON.stringify({ summary: "Repair overlap guard", edits: scenario.edits }))} } }] }), {status: 200});\n`);
      const result = spawnSync(process.execPath, ["--import", loader, "--import", fixture, runner], {
        cwd, encoding: "utf8", env: { ...process.env, BASE_SHA: "", AUTO_HEAL_API_KEY: "test-placeholder", AUTO_HEAL_ENDPOINT: "https://example.invalid/chat/completions", AUTO_HEAL_MODEL: "test" },
      });
      assert.equal(result.status === 0, scenario.ok, result.stderr);
      assert.equal(readFileSync(join(cwd, path), "utf8"), scenario.ok ? original.replace("if (!overlap)", "if (overlap)") : original);
      if (scenario.ok) assert.match(readFileSync(join(cwd, ".auto-heal/fix.diff"), "utf8"), /\+if \(overlap\)/);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
}
