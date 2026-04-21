"use client";

import { useEffect, useState } from "react";

import { useScenarioStore } from "@/lib/store/use-scenario-store";
import { cn } from "@/lib/utils";

/**
 * Scenario switcher — lives at the top of the Plan Drawer so users
 * can see every saved plan, switch between them, rename, duplicate,
 * or delete without leaving the drawer.
 *
 * Design choices:
 * - Collapsible list (summary row + expandable). Keeps the drawer
 *   dense by default; users who have one plan don't see chrome they
 *   don't need.
 * - Rename inline (double-click style): click the pencil to edit,
 *   Enter to save, Esc to cancel. Avoids a modal for a one-field
 *   mutation.
 * - Delete with single-tap confirmation (click trash → "Sure?" →
 *   click again). A full modal feels heavy in a drawer; the two-tap
 *   pattern prevents accidents without interrupting the flow.
 */
export function ScenarioSwitcher() {
  const scenarioList = useScenarioStore((s) => s.scenarioList);
  const activeScenarioId = useScenarioStore((s) => s.activeScenario.id);
  const refreshScenarioList = useScenarioStore((s) => s.refreshScenarioList);
  const switchToScenario = useScenarioStore((s) => s.switchToScenario);
  const duplicateActive = useScenarioStore((s) => s.duplicateActiveScenario);
  const createBlank = useScenarioStore((s) => s.createBlankScenario);
  const renameScenario = useScenarioStore((s) => s.renameScenario);
  const deleteScenario = useScenarioStore((s) => s.deleteScenario);

  const [expanded, setExpanded] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Refresh the list every time the drawer mounts — cheap IDB read,
  // covers the case where the user seeded personas or edited in
  // another tab.
  useEffect(() => {
    void refreshScenarioList();
  }, [refreshScenarioList]);

  const activeSummary = scenarioList.find((s) => s.isActive);
  const activeName = activeSummary?.name ?? "Current plan";
  const otherCount = scenarioList.length - (activeSummary ? 1 : 0);

  function startRename(id: string, currentName: string) {
    setRenamingId(id);
    setRenameDraft(currentName);
    setConfirmDeleteId(null);
  }
  async function commitRename() {
    if (!renamingId) return;
    await renameScenario(renamingId, renameDraft);
    setRenamingId(null);
    setRenameDraft("");
  }

  return (
    <div className="border-b border-border/60 bg-[var(--gradient-card-surface)]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/40"
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">
            Current plan
          </p>
          <p className="truncate text-sm font-medium text-foreground">
            {activeName}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {otherCount > 0 ? (
            <span>
              +{otherCount} other{otherCount === 1 ? "" : "s"}
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
              "size-3.5 transition-transform",
              expanded && "rotate-180",
            )}
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {expanded ? (
        <div className="space-y-1 border-t border-border/40 px-3 py-2">
          {scenarioList.length === 0 ? (
            <p className="px-2 py-1 text-xs text-muted-foreground">
              No saved plans yet.
            </p>
          ) : (
            <ul className="space-y-1">
              {scenarioList.map((scenario) => {
                const isRenaming = renamingId === scenario.id;
                const isConfirmingDelete = confirmDeleteId === scenario.id;
                return (
                  <li
                    key={scenario.id}
                    className={cn(
                      "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                      scenario.isActive
                        ? "bg-[rgba(255,107,53,0.08)]"
                        : "hover:bg-muted/50",
                    )}
                  >
                    {isRenaming ? (
                      <input
                        autoFocus
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void commitRename();
                          } else if (e.key === "Escape") {
                            setRenamingId(null);
                            setRenameDraft("");
                          }
                        }}
                        onBlur={() => void commitRename()}
                        className="min-w-0 flex-1 rounded border border-border/60 bg-background px-2 py-0.5 text-sm"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => void switchToScenario(scenario.id)}
                        className="min-w-0 flex-1 truncate text-left font-medium text-foreground"
                        aria-current={scenario.isActive ? "true" : undefined}
                      >
                        {scenario.name}
                        {scenario.isActive ? (
                          <span className="ml-2 text-[10px] font-normal uppercase tracking-wider text-[var(--ember)]">
                            active
                          </span>
                        ) : null}
                      </button>
                    )}

                    {/* Per-row actions — inline icon buttons. Hidden on
                        non-hover to keep the list calm. */}
                    {!isRenaming ? (
                      <div
                        className={cn(
                          "flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity",
                          "group-hover:opacity-100 focus-within:opacity-100",
                          scenario.isActive && "opacity-100",
                        )}
                      >
                        <IconButton
                          label="Rename"
                          onClick={() => startRename(scenario.id, scenario.name)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3" aria-hidden="true"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                        </IconButton>
                        {isConfirmingDelete ? (
                          <button
                            type="button"
                            onClick={async () => {
                              await deleteScenario(scenario.id);
                              setConfirmDeleteId(null);
                            }}
                            className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--glow)] hover:bg-[rgba(239,68,68,0.12)]"
                          >
                            Confirm
                          </button>
                        ) : (
                          <IconButton
                            label="Delete"
                            onClick={() => setConfirmDeleteId(scenario.id)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3" aria-hidden="true"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                          </IconButton>
                        )}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex items-center gap-2 border-t border-border/40 pt-2 mt-1">
            <button
              type="button"
              onClick={() => void duplicateActive()}
              className="flex-1 rounded-md border border-border/60 bg-card/70 px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-card"
            >
              Duplicate this plan
            </button>
            <button
              type="button"
              onClick={() => void createBlank()}
              className="flex-1 rounded-md border border-border/60 bg-card/70 px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-card"
            >
              New blank plan
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
    >
      {children}
    </button>
  );
}
