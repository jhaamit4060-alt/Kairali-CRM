import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(
  new URL("../lib/ktahv-permissions.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const permissions = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

const salesAgent = {
  name: "Anagha S",
  action: { ktahvPage: "sales_agent" },
};
const accountsManager = {
  name: "Accounts User",
  action: { ktahvPage: "account_manager" },
};

test("sales agent can see only their own booking", () => {
  assert.equal(permissions.canViewKtahvBooking(salesAgent, " anagha   s "), true);
  assert.equal(permissions.canViewKtahvBooking(salesAgent, "Another Agent"), false);
});

test("sales agent cannot mutate another agent's booking", () => {
  assert.equal(
    permissions.canPerformKtahvMutation(salesAgent, "cancelBooking", "Another Agent"),
    false,
  );
  assert.equal(
    permissions.canPerformKtahvMutation(salesAgent, "cancelBooking", "Anagha S"),
    true,
  );
});

test("accounts role is limited to accounts verification mutations", () => {
  assert.equal(
    permissions.canPerformKtahvMutation(
      accountsManager,
      "accountStatusUpdate1",
      "Another Agent",
    ),
    true,
  );
  assert.equal(
    permissions.canPerformKtahvMutation(accountsManager, "cancelBooking", "Accounts User"),
    false,
  );
});

test("unknown mutation action is rejected", () => {
  assert.equal(permissions.isKtahvMutationAction("deleteDatabase"), false);
  assert.equal(permissions.isKtahvMutationAction("paymentCollection"), true);
});

test("global permission remains an explicit administrative override", () => {
  const admin = { name: "Admin", permissions: ["all"] };
  assert.equal(permissions.canAccessKtahvTeamPage(admin), true);
  assert.equal(
    permissions.canPerformKtahvMutation(admin, "checkoutStatusUpdate1", "Someone Else"),
    true,
  );
});
