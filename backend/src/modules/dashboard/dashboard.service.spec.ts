import assert from "node:assert/strict";
import { DashboardService, setDashboardPrisma } from "./dashboard.service";

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
  return {
    workspaceMember: {
      findUnique: mockFn(async () => overrides.member ?? { id: "member-1" }),
    },
    person: {
      count: mockFn(async () => overrides.personCount ?? 0),
    },
    opportunity: {
      findMany: mockFn(async () => overrides.opportunityRows ?? []),
      count: mockFn(async () => overrides.opportunityCount ?? 0),
    },
    pipelineStage: {
      findMany: mockFn(async () => overrides.pipelineStages ?? []),
    },
    activity: {
      findMany: mockFn(async () => overrides.activityRows ?? []),
    },
    task: {
      findMany: mockFn(async () => overrides.taskRows ?? []),
    },
  } as any;
}

async function main() {
  const prisma = createMockPrisma();
  setDashboardPrisma(prisma);

  const service = new DashboardService();
  await service.getStats("user-1", "workspace-1", "quarter");

  const newContactsArgs = prisma.person.count.calls[1][0];
  assert.equal(newContactsArgs.where.createdAt.gte instanceof Date, true);
  assert.equal(newContactsArgs.where.createdAt.gte.getMonth(), 6);

  const wonArgs = prisma.opportunity.count.calls[0][0];
  assert.equal(wonArgs.where.updatedAt.gte instanceof Date, true);
  assert.equal(wonArgs.where.updatedAt.gte.getMonth(), 6);

  const lostArgs = prisma.opportunity.count.calls[1][0];
  assert.equal(lostArgs.where.updatedAt.gte instanceof Date, true);
  assert.equal(lostArgs.where.updatedAt.gte.getMonth(), 6);

  const activityArgs = prisma.activity.findMany.calls[0][0];
  assert.equal(activityArgs.where.occurredAt.gte instanceof Date, true);
  assert.equal(activityArgs.where.occurredAt.gte.getMonth(), 6);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
