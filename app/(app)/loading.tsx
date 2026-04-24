export default function AppGroupLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-6 py-12"
    >
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div
          aria-hidden="true"
          className="size-6 animate-spin rounded-full border-2 border-muted border-t-foreground"
        />
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  );
}
