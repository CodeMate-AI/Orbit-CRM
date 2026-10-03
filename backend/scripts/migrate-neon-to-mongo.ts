import { PrismaClient } from "@prisma/client";
import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
import * as path from "path";
import * as dns from "node:dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const pgPrisma = new PrismaClient();
const MONGO_URI =
  process.env.DATABASE_URL_MONGO ||
  "mongodb+srv://BiswajitDash:bfZY9K723cgtSppL@cluster0.fhdoh.mongodb.net/Orbit_CRM?retryWrites=true&w=majority&appName=Cluster0";

function sanitizeRecord(record: any): any {
  if (!record || typeof record !== "object") return record;
  const result: any = { ...record };
  
  // In MongoDB with Prisma @map("_id"), the primary key is stored as _id
  if (result.id !== undefined) {
    result._id = result.id;
    // Remove duplicate id field so MongoDB stores only _id (mapped to id in Prisma)
    delete result.id;
  }

  // Convert Decimals to JavaScript Numbers / Floats
  for (const key of Object.keys(result)) {
    const val = result[key];
    if (val !== null && val !== undefined && typeof val === "object" && "d" in val && "s" in val && "e" in val) {
      result[key] = Number(val);
    }
  }

  return result;
}

async function migrateCollection(
  mongoDb: any,
  collectionName: string,
  fetchFn: () => Promise<any[]>
) {
  console.log(`\nFetching ${collectionName} from Neon DB...`);
  const records = await fetchFn();
  console.log(`Found ${records.length} records in Neon DB.`);

  if (records.length === 0) {
    console.log(`No records to migrate for ${collectionName}.`);
    return 0;
  }

  const collection = mongoDb.collection(collectionName);
  const sanitized = records.map(sanitizeRecord);

  let migratedCount = 0;
  for (const doc of sanitized) {
    await collection.replaceOne({ _id: doc._id }, doc, { upsert: true });
    migratedCount++;
  }

  console.log(`Successfully migrated ${migratedCount} records to collection '${collectionName}'.`);
  return migratedCount;
}

async function main() {
  console.log("=== Orbit CRM: Neon DB (PostgreSQL) -> MongoDB Migration ===");
  const mongoClient = new MongoClient(MONGO_URI);
  await mongoClient.connect();
  const mongoDb = mongoClient.db("Orbit_CRM");
  console.log("Connected to MongoDB Atlas: Orbit_CRM\n");

  const results: Record<string, number> = {};

  try {
    results["User"] = await migrateCollection(mongoDb, "User", () => pgPrisma.user.findMany());
    results["Workspace"] = await migrateCollection(mongoDb, "Workspace", () => pgPrisma.workspace.findMany());
    results["WorkspaceMember"] = await migrateCollection(mongoDb, "WorkspaceMember", () => pgPrisma.workspaceMember.findMany());
    results["Pipeline"] = await migrateCollection(mongoDb, "Pipeline", () => pgPrisma.pipeline.findMany());
    results["PipelineStage"] = await migrateCollection(mongoDb, "PipelineStage", () => pgPrisma.pipelineStage.findMany());
    results["Company"] = await migrateCollection(mongoDb, "Company", () => pgPrisma.company.findMany());
    results["Person"] = await migrateCollection(mongoDb, "Person", () => pgPrisma.person.findMany());
    results["Opportunity"] = await migrateCollection(mongoDb, "Opportunity", () => pgPrisma.opportunity.findMany());
    results["OpportunityContact"] = await migrateCollection(mongoDb, "OpportunityContact", () => pgPrisma.opportunityContact.findMany());
    results["Task"] = await migrateCollection(mongoDb, "Task", () => pgPrisma.task.findMany());
    results["Note"] = await migrateCollection(mongoDb, "Note", () => pgPrisma.note.findMany());
    results["Activity"] = await migrateCollection(mongoDb, "Activity", () => pgPrisma.activity.findMany());
    results["Attachment"] = await migrateCollection(mongoDb, "Attachment", () => pgPrisma.attachment.findMany());
    results["Session"] = await migrateCollection(mongoDb, "Session", () => pgPrisma.session.findMany());
    results["Account"] = await migrateCollection(mongoDb, "Account", () => pgPrisma.account.findMany());
    results["Invitation"] = await migrateCollection(mongoDb, "Invitation", () => pgPrisma.invitation.findMany());
    results["PasswordResetOtp"] = await migrateCollection(mongoDb, "PasswordResetOtp", () => pgPrisma.passwordResetOtp.findMany());
    results["Verification"] = await migrateCollection(mongoDb, "Verification", () => pgPrisma.verification.findMany());
    results["ChatSession"] = await migrateCollection(mongoDb, "ChatSession", () => pgPrisma.chatSession.findMany());
    results["ChatMessage"] = await migrateCollection(mongoDb, "ChatMessage", () => pgPrisma.chatMessage.findMany());

    console.log("\n=== Migration Summary ===");
    console.table(results);
    console.log("\nAll data successfully migrated from Neon DB to MongoDB Atlas!");
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  } finally {
    await pgPrisma.$disconnect();
    await mongoClient.close();
  }
}

main();
