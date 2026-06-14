import { execFileSync } from "node:child_process";

const blockedExactFiles = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  ".env.test",
]);

const blockedPathPrefixes = ["data/", "data/attachments/"];
const blockedLocalEnvPattern = /^\.env\..*\.local$/;

function trackedFiles() {
  const output = execFileSync("git", ["ls-files"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return output
    .split("\n")
    .map((file) => file.trim())
    .filter(Boolean);
}

function isBlockedPath(file: string) {
  if (blockedExactFiles.has(file)) return true;
  if (blockedLocalEnvPattern.test(file)) return true;
  return blockedPathPrefixes.some((prefix) => file.startsWith(prefix));
}

const violations = trackedFiles().filter(isBlockedPath);

if (violations.length > 0) {
  console.error("PR guardrails failed. These files must not be tracked:");
  for (const file of violations) console.error(`- ${file}`);
  console.error("");
  console.error("Move secrets and real screenshots out of Git, then commit again.");
  process.exit(1);
}

console.log("PR guardrails passed. No blocked env or data files are tracked.");
