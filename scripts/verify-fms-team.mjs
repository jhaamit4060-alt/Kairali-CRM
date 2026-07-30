import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const auditedPaths = [
  "app/api/arrival-departure/route.ts",
  "app/api/auth/login/route.ts",
  "app/api/auth/me/route.ts",
  "app/api/ktahv-bookings/actions/route.ts",
  "app/api/ktahv-bookings/route.ts",
  "app/fms/bookings/team/loading.tsx",
  "app/fms/bookings/team/page.tsx",
  "components/arrivalticketmodel.tsx",
  "components/departureticketmodel.tsx",
  "hooks/use-auth.tsx",
  "hooks/use-fms-bookings.tsx",
  "lib/db.ts",
  "lib/ktahv-bookings-server.ts",
  "lib/ktahv-permissions.ts",
  "lib/server-session.ts",
];

const typecheck = spawnSync(
  process.execPath,
  [
    "--max-old-space-size=4096",
    "./node_modules/typescript/bin/tsc",
    "--noEmit",
    "--pretty",
    "false",
  ],
  { encoding: "utf8" },
);

const compilerOutput = `${typecheck.stdout || ""}${typecheck.stderr || ""}`;
const auditedErrors = compilerOutput
  .split(/\r?\n/)
  .filter((line) => auditedPaths.some((path) => line.startsWith(`${path}(`)));

if (auditedErrors.length > 0) {
  throw new Error(`Audited TypeScript errors:\n${auditedErrors.join("\n")}`);
}

const clientSources = [
  "app/fms/bookings/team/page.tsx",
  "hooks/use-auth.tsx",
  "hooks/use-fms-bookings.tsx",
].map((path) => [path, readFileSync(path, "utf8")]);

const forbiddenClientPatterns = [
  ["direct Google Apps Script URL", /https:\/\/script\.google\.com\/macros\//],
  ["database credential", /\b(?:DB_PASSWORD|DB_HOST)\s*[:=]\s*["'][^"']+["']/],
];

for (const [path, source] of clientSources) {
  for (const [label, pattern] of forbiddenClientPatterns) {
    if (pattern.test(source)) {
      throw new Error(`${path} contains forbidden ${label}`);
    }
  }
}

const dbSource = readFileSync("lib/db.ts", "utf8");
for (const requiredName of ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"]) {
  if (!dbSource.includes(`requiredEnv('${requiredName}')`)) {
    throw new Error(`lib/db.ts does not require ${requiredName}`);
  }
}

console.log("Audited TypeScript and secret-boundary checks passed.");
