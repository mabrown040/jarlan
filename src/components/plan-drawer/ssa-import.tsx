"use client";

import { useRef, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Upload } from "lucide-react";

import { parseSSAXml } from "@/lib/ssa/parse-ssa-xml";
import type { SSAParseResult } from "@/lib/ssa/parse-ssa-xml";

interface Props {
  onImport: (result: SSAParseResult) => void;
  importedAt?: string;
}

export function SSAImport({ onImport, importedAt }: Props) {
  const [showSteps, setShowSteps] = useState(!importedAt);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = parseSSAXml(e.target?.result as string);
        onImport(result);
        setShowSteps(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not read this file.");
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setShowSteps((v) => !v)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {showSteps ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
        How to download your SSA statement
      </button>

      {showSteps && (
        <ol className="ml-4 space-y-1.5 text-xs text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">1.</span> Go to{" "}
            <a
              href="https://www.ssa.gov/myaccount"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--ember)] hover:underline"
            >
              ssa.gov/myaccount
            </a>{" "}
            and sign in (free account)
          </li>
          <li>
            <span className="font-medium text-foreground">2.</span> Click{" "}
            <strong className="text-foreground">Statements</strong> in the left menu
          </li>
          <li>
            <span className="font-medium text-foreground">3.</span> Next to your most recent statement,
            click <strong className="text-foreground">Download</strong> and choose{" "}
            <strong className="text-foreground">XML</strong>
          </li>
          <li>
            <span className="font-medium text-foreground">4.</span> Upload the file below — your
            benefit estimates fill in automatically
          </li>
        </ol>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={[
          "flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-2 border-dashed p-4 text-center transition-colors select-none",
          isDragging
            ? "border-[var(--ember)] bg-[var(--ember)]/5"
            : "border-border hover:border-[var(--ember)]/50 hover:bg-muted/30",
        ].join(" ")}
      >
        {importedAt ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-xs text-muted-foreground">
              Imported{" "}
              {new Date(importedAt).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}
            </span>
            <span className="text-xs text-[var(--ember)]">Upload a newer statement</span>
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium">Upload SSA statement XML</span>
            <span className="text-xs text-muted-foreground">drag and drop or click to browse</span>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".xml,application/xml,text/xml"
        className="hidden"
        onChange={handleChange}
      />

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
