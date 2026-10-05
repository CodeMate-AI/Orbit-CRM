import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log("--------------------------------------------------");
  console.log("Orbit CRM Database Cleanup: Purging all collections");
  console.log("--------------------------------------------------");

  try {
    // 1. Delete dependent leaf entities first
    console.log("Cleaning activity timeline records...");
    await prisma.activity.deleteMany({});

    console.log("Cleaning file attachments...");
    await prisma.attachment.deleteMany({});

    console.log("Cleaning AI chat messages & sessions...");
    await prisma.chatMessage.deleteMany({});
    await prisma.chatSession.deleteMany({});

    console.log("Cleaning notes...");
    await prisma.note.deleteMany({});

    console.log("Cleaning opportunity contacts...");
    await prisma.opportunityContact.deleteMany({});

    console.log("Cleaning opportunities / deals...");
    await prisma.opportunity.deleteMany({});

    console.log("Cleaning pipeline stages & pipelines...");
    await prisma.pipelineStage.deleteMany({});
    await prisma.pipeline.deleteMany({});

    console.log("Cleaning tasks...");
    await prisma.task.deleteMany({});

    console.log("Cleaning people / leads...");
    await prisma.person.deleteMany({});

    console.log("Cleaning companies...");
    await prisma.company.deleteMany({});

    console.log("Cleaning invitations & password reset OTPs...");
    await prisma.invitation.deleteMany({});
    await prisma.passwordResetOtp.deleteMany({});

    // 2. Delete workspace associations and workspaces
    console.log("Cleaning workspace members & workspaces...");
    await prisma.workspaceMember.deleteMany({});
    await prisma.workspace.deleteMany({});

    // 3. Delete auth sessions, accounts, and users
    console.log("Cleaning Better Auth sessions, accounts, and users...");
    await prisma.session.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.user.deleteMany({});

    console.log("==================================================");
    console.log("✓ Database cleanup completed successfully!");
    console.log("All collections are clean and ready for production.");
    console.log("==================================================");
  } catch (error) {
    console.error("Database cleanup encountered an error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();
