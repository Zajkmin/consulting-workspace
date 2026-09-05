import type { AppData, User } from "@/types";

const KEY = "consulting-workspace-data-v2";
const SESSION_KEY = "consulting-workspace-session-user";

type LegacyUser = Omit<User, "role"> & { role: User["role"] | "consultor" };
type LegacyAppData = Omit<AppData, "user" | "users"> & {
  user: LegacyUser;
  users: LegacyUser[];
};

const normalizeUserRole = (user: LegacyUser): User => ({
  ...user,
  role: user.role === "consultor" ? "usuario" : user.role,
});

const normalizeStoredData = (data: LegacyAppData): AppData => ({
  ...data,
  user: normalizeUserRole(data.user),
  users: data.users.map(normalizeUserRole),
});

export const localDataStore = {
  load(): AppData | null {
    if (typeof window === "undefined") return null;
    try {
      const value = localStorage.getItem(KEY);
      return value ? normalizeStoredData(JSON.parse(value) as LegacyAppData) : null;
    } catch {
      return null;
    }
  },
  save(data: AppData) {
    if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(data));
  },
  loadSession() {
    return typeof window === "undefined" ? null : localStorage.getItem(SESSION_KEY);
  },
  saveSession(id: string | null) {
    if (typeof window === "undefined") return;
    if (id) localStorage.setItem(SESSION_KEY, id);
    else localStorage.removeItem(SESSION_KEY);
  },
};
