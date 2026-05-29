import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { users, type User } from "@/server/db/schema";
import { AUTH_SESSION_COOKIE } from "./constants";
import { getLocalAuthConfig, verifySessionToken } from "./session";

type Db = PostgresJsDatabase<typeof import("@/server/db/schema")>;

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
  }
}

export function isUnauthorizedError(error: unknown): error is UnauthorizedError {
  return error instanceof UnauthorizedError;
}

export async function getCurrentUser(db: Db): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  const identity = verifySessionToken(token, getLocalAuthConfig());

  if (!identity) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.id, identity.userId),
        eq(users.email, identity.email),
        eq(users.isActive, true),
      ),
    )
    .limit(1);

  return user ?? null;
}

export async function requireCurrentUser(db: Db): Promise<User> {
  const user = await getCurrentUser(db);
  if (!user) throw new UnauthorizedError();
  return user;
}
