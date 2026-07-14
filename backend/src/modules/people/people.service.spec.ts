import test from "node:test";
import assert from "node:assert/strict";
import { PeopleService } from "./people.service";

test("PeopleService dryRun parses CSV headers and validation warnings", async () => {
  const service = new PeopleService({} as any);

  const result = await service.dryRun({
    csvContent: "Email,First Name\ninvalid-email,Jane\n",
    workspaceId: "workspace-1",
  });

  assert.deepEqual(result.headers, ["Email", "First Name"]);
  assert.equal(result.totalRows, 1);
  assert.deepEqual(result.validationErrors, [
    'Row 2: Invalid email format ("invalid-email")',
  ]);
});

test("PeopleService startImport queues a background job", async () => {
  const addCalls: any[] = [];
  const service = new PeopleService({
    add: async (...args: any[]) => {
      addCalls.push(args);
      return { id: "job-1" };
    },
  } as any);

  const result = await service.startImport("user-1", {
    csvContent: "First Name,Last Name\nJane,Doe\n",
    columnMapping: {
      firstName: "First Name",
      lastName: "Last Name",
    },
    workspaceId: "workspace-1",
  });

  assert.deepEqual(addCalls[0], ["import-job", {
    csvContent: "First Name,Last Name\nJane,Doe\n",
    columnMapping: {
      firstName: "First Name",
      lastName: "Last Name",
    },
    workspaceId: "workspace-1",
    userId: "user-1",
  }]);
  assert.deepEqual(result, { jobId: "job-1" });
});
