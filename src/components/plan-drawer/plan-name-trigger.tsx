"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { suggestUniqueScenarioName } from "@/lib/scenario/naming";
import { useDrawerStore, useScenarioStore } from "@/lib/store";
import { cn } from "@/lib/utils";

import { NamePlanDialog } from "./name-plan-dialog";

type PendingAction = "duplicate" | "blank" | null;

/**
 * Header plan-name trigger.
 *
 * Shows the active plan's name as a dropdown affordance next to the
 * `<PlanDrawerTrigger />` gear pill. Without this surface, the
 * multi-plan model exists in code (store has duplicate/rename/switch)
 * but is invisible to the user — they had to open the drawer and
 * expand a collapsed section to discover it.
 *
 * Scope is deliberately narrow:
 *   - Switch to any saved plan
 *   - Save a copy of the active plan (prompt for a name)
 *   - Start a blank plan (prompt for a name)
 *   - "Manage in drawer" → opens the Plan Drawer where the full
 *     switcher (rename, delete, import, export) lives
 *
 * Hidden when the active scenario is still the built-in sample
 * (isPersonalized === false) — at that point the user hasn't created
 * a plan yet and there's nothing to switch between. The
 * `<PlanDrawerTrigger />` covers them with a "Take the quiz" CTA.
 */
export function PlanNameTrigger() {
  const activeScenario = useScenarioStore((s) => s.activeScenario);
  const status = useScenarioStore((s) => s.status);
  const scenarioList = useScenarioStore((s) => s.scenarioList);
  const switchToScenario = useScenarioStore((s) => s.switchToScenario);
  const duplicateActive = useScenarioStore((s) => s.duplicateActiveScenario);
  const createBlank = useScenarioStore((s) => s.createBlankScenario);
  const refreshScenarioList = useScenarioStore((s) => s.refreshScenarioList);
  const openDrawer = useDrawerStore((s) => s.open);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  // Naming dialog state. We funnel both "Save a copy" and "Start a
  // blank plan" through one dialog (cleaner than juggling two), with
  // a `pendingAction` discriminator so submit knows which store
  // method to call.
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [draftName, setDraftName] = useState("");
  const [dialogBusy, setDialogBusy] = useState(false);

  // Refresh the list any time the menu opens — covers the case where
  // a plan was added/renamed in another tab or via the drawer.
  useEffect(() => {
    if (menuOpen) void refreshScenarioList();
  }, [menuOpen, refreshScenarioList]);

  // Close on outside click + Escape.
  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current) return;
      if (menuRef.current.contains(event.target as Node)) return;
      setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const handleSaveCopy = useCallback(() => {
    setMenuOpen(false);
    const base = `Copy of ${activeScenario.name ?? "My plan"}`;
    setDraftName(
      suggestUniqueScenarioName(
        base,
        scenarioList.map((s) => s.name),
      ),
    );
    setPendingAction("duplicate");
  }, [activeScenario.name, scenarioList]);

  const handleNewBlank = useCallback(() => {
    setMenuOpen(false);
    setDraftName(
      suggestUniqueScenarioName(
        "New plan",
        scenarioList.map((s) => s.name),
      ),
    );
    setPendingAction("blank");
  }, [scenarioList]);

  const handleDialogSubmit = useCallback(async () => {
    const trimmed = draftName.trim();
    if (!trimmed || pendingAction === null) return;
    setDialogBusy(true);
    try {
      if (pendingAction === "duplicate") {
        await duplicateActive(trimmed);
      } else if (pendingAction === "blank") {
        await createBlank(trimmed);
      }
      setPendingAction(null);
    } finally {
      setDialogBusy(false);
    }
  }, [draftName, pendingAction, duplicateActive, createBlank]);

  const handleDialogCancel = useCallback(() => {
    setPendingAction(null);
  }, []);

  const handleSwitch = useCallback(
    async (id: string) => {
      setMenuOpen(false);
      await switchToScenario(id);
    },
    [switchToScenario],
  );

  const handleManage = useCallback(() => {
    setMenuOpen(false);
    openDrawer();
  }, [openDrawer]);

  // Don't render anything until the store has hydrated and the user
  // has personalized data. Otherwise we'd flash a "Sample plan ▾"
  // header element on the marketing surface.
  if (status !== "ready" || activeScenario.isPersonalized === false) {
    return null;
  }

  // Prefer the explicitly-named scenario from the saved list; fall
  // back to the in-memory scenario's `name`. Either way we always
  // show *something* readable.
  const activeSummary = scenarioList.find((s) => s.isActive);
  const activeName =
    activeSummary?.name ?? activeScenario.name ?? "My plan";
  const otherCount = Math.max(0, scenarioList.length - 1);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="inline-flex max-w-[12rem] items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:border-primary/40 hover:shadow-sm focus-visible:border-primary/40"
      >
        <span className="truncate">{activeName}</span>
        {otherCount > 0 ? (
          <span className="rounded-full bg-muted/70 px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
            +{otherCount}
          </span>
        ) : null}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "size-3 shrink-0 text-muted-foreground transition-transform",
            menuOpen && "rotate-180",
          )}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {menuOpen ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-border/70 bg-background/95 shadow-[var(--shadow-surface)] backdrop-blur-xl"
        >
          {/* Saved-plans list. Always shows the active plan even when
              it's the only one — the affordance teaches users that the
              concept exists. */}
          <div className="px-2 py-2">
            <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Your plans
            </p>
            <ul className="space-y-0.5">
              {scenarioList.length === 0 ? (
                <li className="px-2 py-1 text-xs text-muted-foreground">
                  No saved plans yet — your edits will save automatically.
                </li>
              ) : (
                scenarioList.map((scenario) => (
                  <li key={scenario.id}>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={scenario.isActive}
                      onClick={() => void handleSwitch(scenario.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                        scenario.isActive
                          ? "bg-[rgba(255,107,53,0.08)] font-medium text-foreground"
                          : "text-foreground hover:bg-muted/70",
                      )}
                    >
                      <span className="truncate">{scenario.name}</span>
                      {scenario.isActive ? (
                        <span className="text-[9px] uppercase tracking-[0.12em] text-[var(--ember)]">
                          Active
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="border-t border-border/60 px-2 py-1">
            <MenuButton onClick={handleSaveCopy}>
              <PlusIcon />
              Save a copy of this plan
            </MenuButton>
            <MenuButton onClick={handleNewBlank}>
              <BlankIcon />
              Start a blank plan
            </MenuButton>
          </div>
          <div className="border-t border-border/60 px-2 py-1">
            <MenuButton onClick={handleManage}>
              <SettingsIcon />
              Manage plans in drawer
            </MenuButton>
          </div>
        </div>
      ) : null}

      {/* Shared inline dialog for both "Save a copy" and "Start a
          blank plan" — replaces the previous `window.prompt` flow
          which is blocked or unreliable in some browser contexts. */}
      <NamePlanDialog
        open={pendingAction !== null}
        title={
          pendingAction === "duplicate"
            ? "Save a copy of this plan"
            : "Start a blank plan"
        }
        description={
          pendingAction === "duplicate"
            ? "We'll duplicate your current plan under this name and switch to it. The original stays put."
            : "A fresh plan with the demo defaults — start editing or run the quiz against it."
        }
        value={draftName}
        onChange={setDraftName}
        onSubmit={handleDialogSubmit}
        onCancel={handleDialogCancel}
        busy={dialogBusy}
        submitLabel={
          pendingAction === "duplicate" ? "Save copy" : "Start plan"
        }
      />
    </div>
  );
}

function MenuButton({
  onClick,
  children,
}: {
  onClick: () => void | Promise<void>;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => void onClick()}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted/70"
    >
      {children}
    </button>
  );
}

function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5 text-muted-foreground"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function BlankIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5 text-muted-foreground"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5 text-muted-foreground"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
