import assert from "node:assert/strict";
import { ActivitiesService, setActivitiesPrisma } from "./activities.service";

async function main() {
  const activityFindMany = async () => [
    {
      id: "activity-1",
      type: "CALL",
      title: "Called contact",
      body: null,
      metadata: null,
      occurredAt: new Date("2026-07-16T10:00:00.000Z"),
      author: { id: "user-1", name: "Ava Admin", email: "ava@example.com" },
      personId: "person-1",
      companyId: null,
      opportunityId: null,
    },
    {
      id: "activity-2",
      type: "EMAIL",
      title: "Sent email",
      body: null,
      metadata: null,
      occurredAt: new Date("2026-07-15T10:00:00.000Z"),
      author: { id: "user-2", name: "Ben Builder", email: "ben@example.com" },
      personId: "person-1",
      companyId: null,
      opportunityId: null,
    },
  ];

  setActivitiesPrisma({
    workspaceMember: {
      findUnique: async () => ({ id: "member-1" }),
    },
    activity: {
      findMany: activityFindMany,
    },
  } as any);

  const service = new ActivitiesService();
  const activities = await service.listForEntity("user-1", "workspace-1", "person", "person-1", ["CALL"]);

  assert.equal(activities.length, 1);
  assert.equal(activities[0].type, "CALL");
  assert.equal(activities[0].author?.name, "Ava Admin");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
