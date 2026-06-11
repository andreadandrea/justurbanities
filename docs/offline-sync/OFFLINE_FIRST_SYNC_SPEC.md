# Offline-first Sync Specification

## Principle

The game must work locally first.

Remote sync is a background process, not a requirement for gameplay.

## Data flow

```text
Player action
→ update GameState
→ save to IndexedDB
→ append ProgressEvent
→ add SyncQueue item
→ try remote sync if online
→ mark queue item as synced
```

## Conflict rules

- savegames: latest `updatedAt` wins;
- events: append-only;
- reports: regenerable;
- content: versioned.

## Current implementation

The current `SyncEngine` simulates successful sync while online.

Next step:

- add `RemoteApiClient` with fake and real adapters.
