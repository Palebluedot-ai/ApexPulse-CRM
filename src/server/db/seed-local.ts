import { createDb } from "./client";
import { seedDemoData } from "./seed";

const { client, db } = createDb();

try {
  const result = await seedDemoData(db);
  console.log(
    JSON.stringify(
      {
        user: result.user.email,
        party: result.party.displayName,
        eventId: result.event.id,
        attachment: result.attachment.storageKey,
        task: result.task.description,
      },
      null,
      2,
    ),
  );
} finally {
  await client.end();
}
