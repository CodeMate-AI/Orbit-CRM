import assert from "node:assert/strict";
import { PeopleService, setPeoplePrisma } from "./people.service";

async function main() {
  setPeoplePrisma({} as any);

  const service = new PeopleService({} as any, { emitToWorkspace: () => undefined } as any, {
    trigger: async () => undefined,
  } as any);

  const csv = await (service as any).exportCsv("user-1", "workspace-1");
  assert.match(csv, /Name, First Name, Last Name, Email, Phone, Job Title, Company, Lead Source, Industry, Tags, Created At/);

  const result = await (service as any).importCsv(
    "user-1",
    "workspace-1",
    [{ "First Name": "A", "Last Name": "B", Email: "a@example.com" }],
    true,
  );

  assert.deepEqual(result, { created: 0, updated: 0, skipped: 0, errors: [] });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
