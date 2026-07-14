import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { PeopleService, setPeoplePrisma } from "./people.service";

afterEach(() => {
  setPeoplePrisma({} as any);
});

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

test("PeopleService create converts empty companyId to null", async () => {
  const createCalls: any[] = [];
  setPeoplePrisma({
    workspaceMember: {
      findUnique: async () => ({ id: "member-1" }),
    },
    person: {
      create: async (args: any) => {
        createCalls.push(args);
        return {
          id: "person-1",
          firstName: args.data.firstName,
          lastName: args.data.lastName,
          email: args.data.email,
          phone: args.data.phone,
          jobTitle: args.data.jobTitle,
          leadSource: args.data.leadSource,
          industry: args.data.industry,
          tagsString: args.data.tagsString,
          companyId: args.data.companyId,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        };
      },
    },
  } as any);
  const service = new PeopleService({} as any);

  const result = await service.create("user-1", {
    firstName: "Jane",
    lastName: "Doe",
    workspaceId: "workspace-1",
    companyId: "",
  });

  assert.equal(createCalls[0].data.companyId, null);
  assert.equal(result.companyId, null);
});
