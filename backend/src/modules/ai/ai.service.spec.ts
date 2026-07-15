import assert from "node:assert/strict";
import { AiService, setAiPrisma } from "./ai.service";

type MockFn<TArgs extends any[] = any[], TResult = any> = ((...args: TArgs) => Promise<TResult>) & {
  calls: TArgs[];
};

function mockFn<TArgs extends any[] = any[], TResult = any>(impl: (...args: TArgs) => Promise<TResult>): MockFn<TArgs, TResult> {
  const fn = (async (...args: TArgs) => {
    fn.calls.push(args);
    return impl(...args);
  }) as MockFn<TArgs, TResult>;

  fn.calls = [];
  return fn;
}

function createMockPrisma(overrides: Record<string, any> = {}) {
  const member = overrides.member ?? { role: "ADMIN" };

  return {
    workspaceMember: {
      findUnique: mockFn(async () => member),
    },
    person: {
      findMany: mockFn(async () => overrides.personRows ?? []),
      count: mockFn(async () => overrides.personCount ?? 0),
    },
    company: {
      findMany: mockFn(async () => overrides.companyRows ?? []),
      count: mockFn(async () => overrides.companyCount ?? 0),
    },
    opportunity: {
      findMany: mockFn(async () => overrides.opportunityRows ?? []),
      count: mockFn(async () => overrides.opportunityCount ?? 0),
    },
    task: {
      findMany: mockFn(async () => overrides.taskRows ?? []),
      count: mockFn(async () => overrides.taskCount ?? 0),
    },
    note: {
      findMany: mockFn(async () => overrides.noteRows ?? []),
    },
    activity: {
      findMany: mockFn(async () => overrides.activityRows ?? []),
    },
    user: {
      findMany: mockFn(async () => overrides.userRows ?? []),
    },
    opportunityTotalPipelineValue: overrides.opportunityTotalPipelineValue,
  } as any;
}

async function main() {
  const service = new AiService();
  assert.equal((service as any).fallbackModel, "openrouter/free");

  {
    const prisma = createMockPrisma({
      personRows: [
        {
          id: "person-1",
          firstName: "Ada",
          lastName: "Lovelace",
          email: "ada@orbit.dev",
          phone: "+44 20 1234 5678",
          jobTitle: "Founder",
          company: { name: "Orbit Labs" },
          leadSource: "Referral",
          industry: "SaaS",
          city: "London",
        },
      ],
    });
    setAiPrisma(prisma);

    const rows = await service.listWorkspacePeople("user-1", "workspace-1", "");
    assert.equal(prisma.person.findMany.calls.length, 1);
    const args = prisma.person.findMany.calls[0][0];
    assert.equal(args.take, 20);
    assert.equal(args.where.workspaceId, "workspace-1");
    assert.equal(args.where.deletedAt, null);
    assert.equal(args.where.OR, undefined);
    assert.deepEqual(rows, [
      {
        id: "person-1",
        name: "Ada Lovelace",
        email: "ada@orbit.dev",
        phone: "+44 20 1234 5678",
        companyName: "Orbit Labs",
        leadSource: "Referral",
        industry: "SaaS",
        city: "London",
        jobTitle: "Founder",
      },
    ]);
  }

  {
    const prisma = createMockPrisma({
      companyRows: [
        {
          id: "company-1",
          name: "Orbit Labs",
          domain: "orbit.dev",
          industry: "SaaS",
          city: "London",
          employeeCount: 42,
          annualRevenue: "1250000.00",
        },
      ],
    });
    setAiPrisma(prisma);

    const rows = await service.listWorkspaceCompanies("user-1", "workspace-1", "");
    assert.equal(prisma.company.findMany.calls.length, 1);
    const args = prisma.company.findMany.calls[0][0];
    assert.equal(args.take, 20);
    assert.equal(args.where.OR, undefined);
    assert.deepEqual(rows, [
      {
        id: "company-1",
        name: "Orbit Labs",
        domain: "orbit.dev",
        industry: "SaaS",
        city: "London",
        employeeCount: 42,
        annualRevenue: 1250000,
      },
    ]);
  }

  {
    const prisma = createMockPrisma({
      opportunityRows: [
        {
          id: "opp-1",
          name: "Orbit Expansion",
          amount: "25000.00",
          closeDate: new Date("2026-08-01T00:00:00.000Z"),
          probability: 70,
          source: "Inbound",
          stage: { name: "Proposal" },
          company: { name: "Orbit Labs" },
          contacts: [
            { person: { firstName: "Ada", lastName: "Lovelace", email: "ada@orbit.dev" } },
          ],
        },
      ],
    });
    setAiPrisma(prisma);

    const rows = await service.listWorkspaceOpportunities("user-1", "workspace-1", "");
    assert.equal(prisma.opportunity.findMany.calls.length, 1);
    const args = prisma.opportunity.findMany.calls[0][0];
    assert.equal(args.take, 20);
    assert.equal(args.where.OR, undefined);
    assert.deepEqual(rows, [
      {
        id: "opp-1",
        name: "Orbit Expansion",
        amount: 25000,
        closeDate: "2026-08-01T00:00:00.000Z",
        probability: 70,
        source: "Inbound",
        stageName: "Proposal",
        companyName: "Orbit Labs",
        contacts: [
          { name: "Ada Lovelace", email: "ada@orbit.dev" },
        ],
      },
    ]);
  }

  {
    const prisma = createMockPrisma({
      taskRows: [
        {
          id: "task-1",
          title: "Follow up with Ada",
          status: "IN_PROGRESS",
          priority: "HIGH",
          dueDate: new Date("2026-07-20T00:00:00.000Z"),
          description: "Send proposal and next steps",
          assignee: { name: "Jordan Lee" },
          person: { firstName: "Ada", lastName: "Lovelace" },
          company: { name: "Orbit Labs" },
        },
      ],
    });
    setAiPrisma(prisma);

    const rows = await service.listWorkspaceTasks("user-1", "workspace-1", "");
    assert.equal(prisma.task.findMany.calls.length, 1);
    const args = prisma.task.findMany.calls[0][0];
    assert.equal(args.take, 20);
    assert.equal(args.where.OR, undefined);
    assert.deepEqual(rows, [
      {
        id: "task-1",
        title: "Follow up with Ada",
        status: "IN_PROGRESS",
        priority: "HIGH",
        dueDate: "2026-07-20T00:00:00.000Z",
        description: "Send proposal and next steps",
        assigneeName: "Jordan Lee",
        personName: "Ada Lovelace",
        companyName: "Orbit Labs",
      },
    ]);
  }

  {
    const prisma = createMockPrisma({
      personCount: 4,
      companyCount: 2,
      opportunityCount: 3,
      taskCount: 5,
      personRows: [
        { leadSource: "Referral" },
        { leadSource: "Referral" },
        { leadSource: "Organic" },
        { leadSource: null },
      ],
      companyRows: [{ id: "company-1" }, { id: "company-2" }],
      opportunityRows: [
        { amount: "100.00", stage: { name: "Discovery" } },
        { amount: "250.00", stage: { name: "Discovery" } },
        { amount: null, stage: { name: "Closed Won" } },
      ],
      taskRows: [
        { status: "TODO" },
        { status: "IN_PROGRESS" },
        { status: "DONE" },
        { status: "DONE" },
        { status: "TODO" },
      ],
    });
    setAiPrisma(prisma);

    const summary = await (service as any).getWorkspaceSummary("user-1", "workspace-1");
    assert.deepEqual(summary, {
      people: {
        totalCount: 4,
        byLeadSource: [
          { leadSource: "Referral", count: 2 },
          { leadSource: "Organic", count: 1 },
          { leadSource: "Unknown", count: 1 },
        ],
      },
      companies: {
        totalCount: 2,
      },
      opportunities: {
        totalCount: 3,
        totalPipelineValue: 350,
        byStage: [
          { stage: "Discovery", count: 2, totalValue: 350 },
          { stage: "Closed Won", count: 1, totalValue: 0 },
        ],
      },
      tasks: {
        totalCount: 5,
        byStatus: {
          TODO: 2,
          IN_PROGRESS: 1,
          DONE: 2,
        },
      },
    });
  }

  {
    const prisma = createMockPrisma({
      noteRows: [
        {
          id: "note-1",
          title: "Acme kickoff",
          body: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Acme is ready" }] }] },
          createdAt: new Date("2026-07-14T10:00:00.000Z"),
          person: null,
          company: { name: "Acme Corp" },
          opportunity: null,
        },
      ],
    });
    setAiPrisma(prisma);

    const rows = await (service as any).listWorkspaceNotes("user-1", "workspace-1", "Acme");
    assert.equal(prisma.note.findMany.calls.length, 1);
    const args = prisma.note.findMany.calls[0][0];
    assert.equal(args.take, 10);
    assert.equal(args.orderBy.createdAt, "desc");
    assert.deepEqual(rows, [
      {
        id: "note-1",
        title: "Acme kickoff",
        bodyPreview: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Acme is ready"}]}]}',
        linkedEntityName: "Acme Corp",
        linkedEntityType: "company",
        createdAt: "2026-07-14T10:00:00.000Z",
      },
    ]);
  }

  {
    const prisma = createMockPrisma({
      activityRows: [
        {
          id: "activity-1",
          type: "CALL",
          title: "Discovery call",
          body: "Discussed pricing",
          occurredAt: new Date("2026-07-15T08:00:00.000Z"),
          person: { firstName: "Ada", lastName: "Lovelace" },
          company: null,
          opportunity: null,
        },
      ],
    });
    setAiPrisma(prisma);

    const rows = await (service as any).listWorkspaceActivities("user-1", "workspace-1", "call", "CALL");
    assert.equal(prisma.activity.findMany.calls.length, 1);
    const args = prisma.activity.findMany.calls[0][0];
    assert.equal(args.take, 10);
    assert.equal(args.orderBy.occurredAt, "desc");
    assert.deepEqual(rows, [
      {
        id: "activity-1",
        type: "CALL",
        title: "Discovery call",
        body: "Discussed pricing",
        occurredAt: "2026-07-15T08:00:00.000Z",
        linkedEntityName: "Ada Lovelace",
        linkedEntityType: "person",
      },
    ]);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
