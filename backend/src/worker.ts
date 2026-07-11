import "reflect-metadata";

async function bootstrapWorker() {
  const queueName = process.env.WORKFLOW_QUEUE_NAME ?? "workflow-jobs";
  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

  console.log(`Orbit CRM worker placeholder started for queue: ${queueName}`);
  console.log(`Redis target: ${redisUrl}`);
}

void bootstrapWorker();
