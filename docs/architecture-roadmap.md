# Architecture Roadmap

## Current Architecture (Local-First)

### Data flow
```
Zustand store (in-memory) ←→ IndexedDB (persistence) ←→ UI components
```

- **State**: `useScenarioStore` (Zustand) holds the active scenario in memory
- **Persistence**: IndexedDB via Dexie (`src/lib/db/database.ts`) — auto-saved on a 250ms debounce
- **Hydration**: `initialize()` loads the saved draft from IndexedDB on first mount
- **No backend**: All data stays in the browser

### Shared hooks

Two hooks eliminate boilerplate that was previously copy-pasted across every workspace:

**`useInitializeStore(sharedScenarioParam?)`** — `src/lib/hooks/use-initialize-store.ts`
- Hydrates the store from IndexedDB (or a shared URL param)
- Guards against double-init (StrictMode, multiple components)
- Every page that reads from the store should call this

**`useAutoSaveScenario({ syncUrl? })`** — `src/lib/hooks/use-auto-save-scenario.ts`
- 250ms debounced save to IndexedDB
- Optionally syncs compressed scenario to URL search params
- Skips saving when `isPersonalized === false` (default/sample data)

### Adding a new page or article

1. Call `useInitializeStore()` in your component
2. Read from the store: `const activeScenario = useScenarioStore((s) => s.activeScenario)`
3. If the page allows editing, add `useAutoSaveScenario({ syncUrl: true })`
4. If the page needs formatting, add `useGlobalScenarioFormatting(activeScenario)`
5. Use `activeScenario.isPersonalized !== false` to check if the user has entered real data

That's it. No init effects, no refs, no debounce timers.

### The `isPersonalized` flag

- Lives on the `Scenario` object (`isPersonalized?: boolean`)
- `false` = default sample data, should not be shown as "your plan"
- `true` = user entered their own data (via quiz, manual edits, or shared URL)
- `undefined` = legacy saved scenario from before this flag existed (treated as personalized)
- Set automatically by store updaters (`updateIncome`, `updateExpenses`, etc.) and `replaceScenario`

---

## Future: Backend Migration

When moving to a real backend with user accounts, the architecture shifts significantly.

### Session-level hydration (replaces per-component init)

Instead of every component calling `useInitializeStore()`, hydration happens once at the app shell level:

```
User logs in → app/(app)/layout.tsx fetches GET /api/scenario → store hydrated → all child routes ready
```

**What to build:**
- `app/(app)/layout.tsx` — server component that fetches the scenario and passes it to a client provider
- `ScenarioProvider` — client component that hydrates the store from the server-fetched data
- Remove all `useInitializeStore()` calls from individual pages

New pages would need zero data-loading boilerplate.

### API persistence (replaces IndexedDB auto-save)

```
Store mutation → optimistic UI → debounced PATCH /api/scenario → background sync
```

**What to build:**
- Zustand middleware that intercepts mutations and queues API calls
- IndexedDB becomes an offline write-ahead log, not the source of truth
- Conflict resolution for multi-tab editing (last-write-wins or merge)
- Offline queue with retry when network returns

### Eliminate the `isPersonalized` flag

With a backend, a new user simply has no scenario record. The API returns `null` until they complete onboarding. The default scenario becomes a template used only to seed a new record during quiz completion — never stored as if it were real user data.

### Eliminate the `useHasExistingDraft` hook

Currently checks IndexedDB to decide whether to show the welcome wizard. With auth, this becomes: does the user have a scenario record? The API tells you.

### URL-shared scenarios

Currently the entire scenario is compressed into a URL search param. With a backend, shared scenarios could be stored server-side with a short ID:

```
/dashboard?s=abc123  →  GET /api/shared/abc123  →  hydrate store
```

This is cleaner, avoids URL length limits, and lets you track sharing analytics.

### Data model considerations

- **Multi-scenario support**: The current model has one active scenario. A backend could support multiple named scenarios with comparison features.
- **Versioning**: The `version` field on the scenario is already there. Backend migrations can use this for schema evolution.
- **Collaboration**: Shared scenarios are currently read-only snapshots. A backend enables real-time collaborative planning (couples, financial advisors).

---

## Migration sequence

1. **Auth + user accounts** — Add authentication, user records
2. **API endpoints** — `GET/PATCH /api/scenario`, backed by a database
3. **Layout-level hydration** — Move init to `app/(app)/layout.tsx`, remove per-component hooks
4. **Store middleware for API sync** — Replace `saveDraft()` with API persistence
5. **Deprecate IndexedDB as primary store** — Keep as offline cache only
6. **Remove `isPersonalized` flag** — New users have no scenario until onboarding
