import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { eq } from "drizzle-orm";
import { hashPassword } from "../src/server/auth/password";
import { createDb } from "../src/server/db";
import { users } from "../src/server/db/schema";

interface Args {
  email: string;
  displayName: string;
  password?: string;
  resetPassword: boolean;
}

function parseCliArgs(): Args {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      "display-name": { type: "string" },
      password: { type: "string" },
      "reset-password": { type: "boolean", default: false },
    },
    strict: true,
  });

  const email = values.email?.trim().toLowerCase();
  const displayName = values["display-name"]?.trim();

  if (!email || !email.includes("@")) {
    throw new Error("--email <user@example.com> is required");
  }
  if (!displayName) {
    throw new Error("--display-name <name> is required");
  }

  return {
    email,
    displayName,
    password: values.password,
    resetPassword: Boolean(values["reset-password"]),
  };
}

function generateTemporaryPassword(): string {
  // 18 base64url chars ≈ 108 bits entropy — safe for one-time setup, easy to paste.
  return randomBytes(14).toString("base64url");
}

async function main() {
  const args = parseCliArgs();
  const password = args.password ?? generateTemporaryPassword();
  const passwordHash = await hashPassword(password);

  const { client, db } = createDb();
  try {
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, args.email))
      .limit(1);

    if (existing) {
      if (!args.resetPassword) {
        console.error(
          `User ${args.email} already exists. Pass --reset-password to overwrite the password.`,
        );
        process.exitCode = 1;
        return;
      }
      await db
        .update(users)
        .set({ passwordHash, isActive: true, updatedAt: new Date() })
        .where(eq(users.id, existing.id));
      console.log(`Reset password for ${args.email}.`);
    } else {
      await db.insert(users).values({
        email: args.email,
        displayName: args.displayName,
        roleType: "member",
        isActive: true,
        passwordHash,
      });
      console.log(`Created user ${args.email}.`);
    }

    if (!args.password) {
      console.log("");
      console.log("Temporary password (share with the user out of band):");
      console.log(password);
      console.log("");
      console.log("This is the only time it will be printed.");
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
