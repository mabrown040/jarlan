"use client";

import { useEffect, useRef, useState } from "react";

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
  const refreshScenarioList = useScenarioStore((s) => s.refreshScenarioList);
  const switchToScenario = useScenarioStore((s) => s.switchToScenario);
  const duplicateActive = useScenarioStore((s) => s.duplicateActiveScenario);
  const createBlank = useScenarioStore((s) => s.createBlankScenario);
  const renameScenario = useScenarioStore((s) => s.renameScenario);
  const deleteScenario = useScenarioStore((s) => s.deleteScenario);
  const exportScenarios = useScenarioStore((s) => s.exportScenarios);
  const importScenarios = useScenarioStore((s) => s.importScenarios);

  // Default-expanded once the user actually has multiple plans —
  // there's something to do with the list. Stays collapsed for
  // single-plan users so the drawer chrome doesn't feel busy.
  const scenarioCount = scenarioList.length;
  const [expanded, setExpanded] = useState(scenarioCount > 1);
  // Auto-expand if a second plan appears while the drawer is open.
  // Avoids the "I duplicated my plan but the list didn't open" gotcha.
  useEffect(() => {
    if (scenarioCount > 1) setExpanded(true);
  }, [scenarioCount]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  // Import result flash — shows "Imported N" or "That file didn't
  // look like a Jarlan export" briefly after import attempts.
  const [importFlash, setImportFlash] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFilePick(file: File) {
    const raw = await file.text();
    const result = await importScenarios(raw);
    if (!result) {
      setImportFlash("Couldn't read that file — not a Jarlan export.");
    } else if (result.imported === 0) {
      setImportFlash("No valid scenarios found in that file.");
    } else {
      const dropped = result.dropped
        ? ` (${result.dropped} skipped)`
        : "";
      setImportFlash(
        `Imported ${result.imported} scenario${result.imported === 1 ? "" : "s"}${dropped}.`,
      );
    }
    setTimeout(() => setImportFlash(null), 4500);
  }

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

          {/* Import / Export — smaller secondary actions. Lets users
              take their data elsewhere or bring in a backup. Hidden
              file input is triggered by the Import button so we get
              a real file picker without styling a raw <input>. */}
          <div className="flex items-center gap-2 pt-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                // Reset so the same file can be re-picked (otherwise
                // the change event won't fire the second time).
                e.target.value = "";
                if (file) void handleFilePick(file);
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              title="Import scenarios from a previously-exported JSON file"
            >
              Import JSON
            </button>
            <button
              type="button"
              onClick={() => void exportScenarios()}
              className="flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              title="Download the current plan as a JSON file"
            >
              Export current
            </button>
            <button
              type="button"
              onClick={() => void exportScenarios({ includeAll: true })}
              className="flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              title="Download every saved plan in one file"
            >
              Export all
            </button>
          </div>
          {importFlash ? (
            <p className="mt-1 rounded-md bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
              {importFlash}
            </p>
          ) : null}
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
