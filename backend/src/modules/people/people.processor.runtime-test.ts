import assert from "node:assert/strict";
import module from "node:module";

async function main() {
  const moduleAny = module as any;
  const originalLoad = moduleAny._load;
  const captured: Array<[string, string, object]> = [];
  const mockEmitToWorkspace = (workspaceId: string, event: string, data: object) => {
    captured.push([workspaceId, event, data]);
  };

  const mockPersonCreate = async () => ({ id: "person-1" });
  const mockCompanyFindFirst = async () => null;
  const mockCompanyCreate = async () => ({ id: "company-1" });

  moduleAny._load = function patchedLoad(request: string, parent: unknown, isMain: boolean) {
    if (request === "@prisma/client") {
      return {
        PrismaClient: class {
          company = {
            findFirst: mockCompanyFindFirst,
            create: mockCompanyCreate,
          };

          person = {
            create: mockPersonCreate,
          };
        },
      };
    }

    return originalLoad.apply(this, [request, parent, isMain]);
  };

  try {
    const { PeopleProcessor } = await import("./people.processor");
    const processor = new PeopleProcessor({ emitToWorkspace: mockEmitToWorkspace } as any);

    await processor.process({
      id: "job-1",
      data: {
        workspaceId: "workspace-1",
        csvContent: "First Name,Last Name,Email\nAda,Lovelace,ada@example.com",
        columnMapping: {
          firstName: "First Name",
          lastName: "Last Name",
          email: "Email",
          phone: "Phone",
          jobTitle: "Job Title",
          leadSource: "Lead Source",
          industry: "Industry",
          tags: "Tags",
          companyName: "Company",
        },
      },
    } as any);

    assert.deepEqual(captured, [["workspace-1", "person.created", { bulk: true }]]);
  } finally {
    moduleAny._load = originalLoad;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
