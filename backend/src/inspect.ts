import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== LATEST WORKFLOW RUNS ===");
  const runs = await prisma.workflowRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 5,
  });
  console.log(JSON.stringify(runs, null, 2));

  console.log("\n=== CONTACT TestAutomation ===");
  const contact = await prisma.person.findFirst({
    where: { firstName: { contains: "TestAutomation" } },
  });
  console.log(JSON.stringify(contact, null, 2));

  console.log("\n=== CONTACT AutomatedValue ===");
  const contact2 = await prisma.person.findFirst({
    where: { firstName: "AutomatedValue" },
  });
  console.log(JSON.stringify(contact2, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
