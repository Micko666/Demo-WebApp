import { User, LabReport, LabRow } from "@/types";

const USERS_KEY = "lg_users";
const CURRENT_KEY = "lg_current"; // Session

export function getUsers(): User[] {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); }
  catch { return []; }
}

export function saveUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getCurrentSession(): { userId: string; email: string } | null {
  try { return JSON.parse(localStorage.getItem(CURRENT_KEY) || "null"); }
  catch { return null; }
}

export function setCurrentSession(session: { userId: string; email: string } | null) {
  if (!session) localStorage.removeItem(CURRENT_KEY);
  else localStorage.setItem(CURRENT_KEY, JSON.stringify(session));
}

export function findUserByEmail(email: string): User | undefined {
  return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
}

export function findUserById(id: string): User | undefined {
  return getUsers().find(u => u.id === id);
}

export function insertUser(u: User) {
  const users = getUsers();
  users.push(u);
  saveUsers(users);
}

export function appendReport(userId: string, report: LabReport) {
  const users = getUsers();
  const i = users.findIndex(u => u.id === userId);
  if (i === -1) return;
  users[i].reports = users[i].reports || [];
  users[i].reports.push(report);
  saveUsers(users);
}

export function getCurrentUser() {
  const session = getCurrentSession();
  if (!session) return null;
  return findUserById(session.userId) || null;
}

/* ===================== CRUD nad reportima i redovima ===================== */

export function deleteReport(userId: string, reportId: string) {
  const users = getUsers();
  const ui = users.findIndex(u => u.id === userId);
  if (ui === -1) return;
  const before = users[ui].reports?.length || 0;
  users[ui].reports = (users[ui].reports || []).filter(r => r.id !== reportId);
  const after = users[ui].reports.length;
  if (after !== before) saveUsers(users);
}

export function deleteAllReportsForUser(userId: string) {
  const users = getUsers();
  const ui = users.findIndex(u => u.id === userId);
  if (ui === -1) return;
  users[ui].reports = [];
  saveUsers(users);
}

export function updateReport(userId: string, reportId: string, patch: Partial<LabReport>) {
  const users = getUsers();
  const ui = users.findIndex(u => u.id === userId);
  if (ui === -1) return;
  const ri = (users[ui].reports || []).findIndex(r => r.id === reportId);
  if (ri === -1) return;
  users[ui].reports![ri] = { ...users[ui].reports![ri], ...patch };
  saveUsers(users);
}

export function updateRow(userId: string, reportId: string, rowIndex: number, newRow: LabRow) {
  const users = getUsers();
  const ui = users.findIndex(u => u.id === userId);
  if (ui === -1) return;
  const ri = (users[ui].reports || []).findIndex(r => r.id === reportId);
  if (ri === -1) return;
  const rows = users[ui].reports![ri].rows || [];
  if (rowIndex < 0 || rowIndex >= rows.length) return;
  rows[rowIndex] = newRow;
  users[ui].reports![ri].rows = rows;
  saveUsers(users);
}

export function deleteRow(userId: string, reportId: string, rowIndex: number) {
  const users = getUsers();
  const ui = users.findIndex(u => u.id === userId);
  if (ui === -1) return;
  const ri = (users[ui].reports || []).findIndex(r => r.id === reportId);
  if (ri === -1) return;
  const rows = users[ui].reports![ri].rows || [];
  if (rowIndex < 0 || rowIndex >= rows.length) return;
  rows.splice(rowIndex, 1);
  users[ui].reports![ri].rows = rows;
  saveUsers(users);
}

/* ===================== DEV helper ===================== */
export function nukeAll_devOnly() {
  saveUsers([]);
  setCurrentSession(null);
}
