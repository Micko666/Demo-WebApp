import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";
import { User } from "@/types";
import {
  findUserByEmail,
  insertUser,
  setCurrentSession,
  getUsers,
  saveUsers,
} from "./db";

export async function signUp(email: string, password: string) {
  const exists = findUserByEmail(email);
  if (exists) throw new Error("Korisnik već postoji.");
  const passwordHash = await bcrypt.hash(password, 10);
  const user: User = { id: uuid(), email, passwordHash, reports: [] };
  insertUser(user);
  return true;
}

export async function signIn(email: string, password: string) {
  const u = findUserByEmail(email);
  if (!u) throw new Error("Pogrešan e-mail ili lozinka.");
  const ok = await bcrypt.compare(password, u.passwordHash);
  if (!ok) throw new Error("Pogrešan e-mail ili lozinka.");
  setCurrentSession({ userId: u.id, email: u.email });
  return true;
}

export function signOut() {
  setCurrentSession(null);
}

export function deleteAllUsers_devOnly() {
  // helper ako želiš reset tokom razvoja
  saveUsers([]);
  setCurrentSession(null);
}
