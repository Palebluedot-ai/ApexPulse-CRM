import { verifyPassword } from "./password";

export interface BetaUserRow {
  id: string;
  email: string;
  passwordHash: string | null;
  isActive: boolean;
}

export interface BetaUserCredential {
  id: string;
  email: string;
  passwordHash: string;
}

export type UserLookup = (email: string) => Promise<BetaUserRow | null>;

export interface DbLoginInput {
  email: string;
  password: string;
}

export type DbLoginResult =
  | { ok: true; userId: string; email: string }
  | { ok: false; reason: "invalid_credentials" };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findActiveUserByEmail(
  email: string,
  lookup: UserLookup,
): Promise<BetaUserCredential | null> {
  const row = await lookup(normalizeEmail(email));
  if (!row || !row.isActive || !row.passwordHash) return null;
  return { id: row.id, email: row.email, passwordHash: row.passwordHash };
}

export async function verifyDbLogin(
  input: DbLoginInput,
  lookup: UserLookup,
): Promise<DbLoginResult> {
  const user = await findActiveUserByEmail(input.email, lookup);
  if (!user) return { ok: false, reason: "invalid_credentials" };

  const matches = await verifyPassword(input.password, user.passwordHash);
  if (!matches) return { ok: false, reason: "invalid_credentials" };

  return { ok: true, userId: user.id, email: user.email };
}
