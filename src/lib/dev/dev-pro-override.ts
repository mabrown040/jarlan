/**
 * Dev-only "Pro override" — lets local dev flip Pro on without
 * needing a real Supabase session. Toggled from the QA personas panel.
 *
 * Production builds short-circuit all getters to `false`, so a
 * shipped bundle can't be tricked into enabling Pro via a crafted
 * localStorage value. The setter is also a no-op in production —
 * belt-and-suspenders so a dev utility can never leak to real users.
 */
const KEY = "calcifer:dev-pro-override";
export const DEV_PRO_OVERRIDE_EVENT = "calcifer:dev-pro-override-change";

export function getDevProOverride(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setDevProOverride(enabled: boolean) {
  if (process.env.NODE_ENV === "production") return;
  if (typeof window === "undefined") return;
  try {
    if (enabled) {
      window.localStorage.setItem(KEY, "1");
    } else {
      window.localStorage.removeItem(KEY);
    }
    // Same-tab observers listen for this; cross-tab get the native
    // `storage` event for free.
    window.dispatchEvent(new CustomEvent(DEV_PRO_OVERRIDE_EVENT));
  } catch {
    /* localStorage blocked — silently ignore in dev tooling */
  }
}
