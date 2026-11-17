import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
function run(command: string, ...args: string[]): string {
  return execFileSync(command, args, { encoding: "utf8" }).trim();
}
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}
const repository = required("GITHUB_REPOSITORY");
const base = required("SOURCE_BRANCH");
const sha = required("SOURCE_SHA");
const source = process.env.SOURCE_PR || sha;
// Stable across reruns and new commits on the same failing PR: never create duplicate PRs.
const branch = `fix/auto-heal-${source}`;
const existing = JSON.parse(run("gh", "pr", "list", "--repo", repository, "--head", branch, "--state", "all", "--json", "number")) as unknown;
if (!Array.isArray(existing)) throw new Error("Invalid PR lookup.");
if (existing.length > 0) {
  console.log("A remediation PR already exists for this source; review it before attempting another repair.");
} else {
  const changes = run("git", "diff", "--name-only").split("\n");
  if (!changes.length || changes.some((path) => !/^src\/(services|controllers|models|routes)\/[\w./-]+\.ts$/.test(path) || /(__tests__|\.(test|spec)\.)/.test(path))) throw new Error("Unexpected modified files.");
  // Do not publish a patch against a branch that moved during inference/testing.
  const remote = run("gh", "api", `repos/${repository}/git/ref/heads/${base}`, "--jq", ".object.sha");
  if (remote !== sha) throw new Error("Source branch advanced; wait for its current CI run.");
  const body = `Automated source repair for ${process.env.SOURCE_PR ? `#${process.env.SOURCE_PR}` : sha}.\n\nBase: \`${sha}\`. Evidence: ${process.env.GITHUB_SERVER_URL}/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}\n\nLocal runner verification passed: lint, TypeScript, full Jest suite, and git diff --check. Tests and assertions were not edited. See auto-heal-audit artifact for diagnosis, patch, and logs.\n\n## Human-in-the-loop audit (pending)\n- [ ] Inspect the source diff and confirm the root cause is fixed, including adjacent and overlapping reservations.\n- [ ] Confirm no test assertions, dependencies, or workflow settings changed.\n- [ ] Inspect the attached verification log and reproduce checks as needed.\n- [ ] Record reviewer, date, findings, and approval here before accepting the patch.\n\nThis PR targets the failing branch; merge it there before merging the original PR to main.\n`;
  writeFileSync(".auto-heal/pr-body.md", body);
  run("git", "switch", "-c", branch);
  run("git", "config", "user.name", "github-actions[bot]");
  run("git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com");
  run("git", "add", "--", ...changes);
  run("git", "commit", "-m", "fix: auto-heal failing Jest tests");
  // Checkout does not persist credentials. Authenticate only this final publication command.
  run("git", "-c", "credential.helper=", "-c", 'credential.helper=!f() { echo username=x-access-token; echo "password=$GH_TOKEN"; }; f', "push", "origin", `HEAD:refs/heads/${branch}`);
  console.log(run("gh", "pr", "create", "--repo", repository, "--head", branch, "--base", base, "--title", "fix: auto-heal failing Jest tests", "--body-file", ".auto-heal/pr-body.md", "--draft"));
}
