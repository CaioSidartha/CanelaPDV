import bcrypt from "bcryptjs";

const ROUNDS = 12;

export async function hashPasswordServer(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPasswordServer(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
