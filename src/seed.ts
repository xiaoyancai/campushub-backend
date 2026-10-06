import { readEnvironment } from "./config/environment.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { seedResources } from "./services/seed.service.js";
async function seed(): Promise<void> {
  try {
    await connectDatabase(readEnvironment().mongodbUri);
    await seedResources();
    console.log("Lab resources are ready.");
  } finally {
    await disconnectDatabase();
  }
}
seed().catch(() => {
  console.error("Seeding failed. Check MONGODB_URI and MongoDB availability.");
  process.exitCode = 1;
});
