import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  checkDeploymentEnv,
  deploymentEnvSpecs,
  parseDotEnvContent,
  type DeploymentTarget,
} from "../src/server/config/deployment-env";

const target = parseTarget(process.argv[2]);
const env = loadEnvFiles(process.cwd());
const report = checkDeploymentEnv(env, target);

console.log(`Environment target: ${report.target}`);
console.log("");
console.log("Configured keys:");
for (const key of report.configuredKeys) {
  const spec = deploymentEnvSpecs.find((item) => item.key === key);
  const secretLabel = spec?.secret ? "secret" : "plain";
  console.log(`- ${key} (${secretLabel})`);
}

if (report.configuredKeys.length === 0) {
  console.log("- none");
}

console.log("");
console.log("Missing required keys:");
for (const key of report.missingRequiredKeys) {
  console.log(`- ${key}`);
}

if (report.missingRequiredKeys.length === 0) {
  console.log("- none");
}

console.log("");
console.log("Warnings:");
for (const warning of report.warningMessages) {
  console.log(`- ${warning}`);
}

if (report.warningMessages.length === 0) {
  console.log("- none");
}

if (
  report.missingRequiredKeys.length > 0 ||
  report.warningMessages.length > 0
) {
  process.exitCode = 1;
}

function parseTarget(value: string | undefined): DeploymentTarget {
  if (value === "local" || value === "staging" || value === "production") {
    return value;
  }

  return "local";
}

function loadEnvFiles(cwd: string): Record<string, string | undefined> {
  const dotenv = readOptionalDotEnv(join(cwd, ".env"));
  const dotenvLocal = readOptionalDotEnv(join(cwd, ".env.local"));

  return {
    ...dotenv,
    ...dotenvLocal,
    ...process.env,
  };
}

function readOptionalDotEnv(path: string): Record<string, string | undefined> {
  if (!existsSync(path)) return {};

  return parseDotEnvContent(readFileSync(path, "utf8"));
}
