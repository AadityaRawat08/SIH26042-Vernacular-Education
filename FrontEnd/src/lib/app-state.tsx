import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  Classroom,
  Connectivity,
  InstituteProfile,
  LanguageCode,
  ParentProfile,
  PeriodPlan,
  Role,
  SyncItem,
  TeacherProfile,
  UpcomingLecture,
} from "./types";
import type { BoardSnapshot } from "./services/blackboard";
import {
  classrooms as seedClassrooms,
  defaultInstitute,
  defaultParent,
  defaultTeacher,
  syncQueue as seedSync,
  upcomingLectures as seedUpcoming,
} from "./mock/data";

/**
 * Local prototype state. Persisted to localStorage so the demo survives a
 * refresh. Swap for React Query + real endpoints when a backend exists.
 */

interface AppState {
  authenticated: boolean;
  mobile: string;
  role: Role | null;
  onboarded: boolean;
  teacher: TeacherProfile;
  institute: InstituteProfile;
  parent: ParentProfile;
  classrooms: Classroom[];
  upcoming: UpcomingLecture[];
  plan: PeriodPlan | null;
  connectivity: Connectivity;
  sync: SyncItem[];
  interfaceLanguage: LanguageCode;
  /** Saved final blackboards, one per finished lecture. */
  boards: BoardSnapshot[];
}

const initialState: AppState = {
  authenticated: false,
  mobile: "",
  role: null,
  onboarded: false,
  teacher: defaultTeacher,
  institute: defaultInstitute,
  parent: defaultParent,
  classrooms: seedClassrooms,
  upcoming: seedUpcoming,
  plan: null,
  connectivity: "online",
  sync: seedSync,
  interfaceLanguage: "en",
  boards: [],
};

interface AppContextValue extends AppState {
  set: (patch: Partial<AppState>) => void;
  /**
   * True once the persisted state has been read from localStorage.
   *
   * Route guards must wait for this: `authenticated` starts as `false` on the
   * very first render, so redirecting before hydration would bounce a signed-in
   * visitor out of the app on every refresh.
   */
  hydrated: boolean;
  login: (mobile: string) => void;
  logout: () => void;
  addClassroom: (c: Omit<Classroom, "id" | "colorKey">) => Classroom;
  savePlan: (plan: PeriodPlan) => void;
  approvePlan: () => void;
  clearSync: () => void;
  queueSync: (label: string, kind: string) => void;
  saveBoard: (snapshot: BoardSnapshot) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const STORAGE_KEY = "vpai.state.v1";

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState((s) => ({ ...s, ...(JSON.parse(raw) as Partial<AppState>) }));
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or unavailable */
    }
  }, [state, hydrated]);

  const set = useCallback((patch: Partial<AppState>) => setState((s) => ({ ...s, ...patch })), []);

  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      set,
      hydrated,
      login: (mobile) => set({ authenticated: true, mobile }),
      logout: () => setState({ ...initialState }),
      addClassroom: (c) => {
        const created: Classroom = {
          ...c,
          id: `c-${Date.now()}`,
          colorKey: "primary",
        };
        setState((s) => ({ ...s, classrooms: [...s.classrooms, created] }));
        return created;
      },
      savePlan: (plan) => set({ plan }),
      approvePlan: () => setState((s) => (s.plan ? { ...s, plan: { ...s.plan, approved: true } } : s)),
      clearSync: () => set({ sync: [] }),
      saveBoard: (snapshot) => setState((s) => ({ ...s, boards: [snapshot, ...(s.boards ?? [])].slice(0, 30) })),
      queueSync: (label, kind) =>
        setState((s) => ({
          ...s,
          sync: [...s.sync, { id: `sq-${Date.now()}`, label, kind, createdAt: "just now" }],
        })),
    }),
    [state, set, hydrated],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/**
 * Synchronous read of the persisted sign-in flag.
 *
 * TanStack Router `beforeLoad` cannot use React hooks, so the root route guard
 * reads the same `vpai.state.v1` record directly instead of duplicating the
 * flag somewhere else. Returns false when nothing has been written yet or the
 * payload is unreadable.
 */
export function isAppStateAuthenticated(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    return (JSON.parse(raw) as Partial<AppState>).authenticated === true;
  } catch {
    return false;
  }
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppStateProvider");
  return ctx;
}
