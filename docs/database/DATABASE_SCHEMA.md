# Database Schema

## Local database

Uses Dexie over IndexedDB.

Current tables:

```text
sessions
savegames
progress_events
sync_queue
```

Future tables:

```text
users
settings
content_versions
reports
```

## Remote database future schema

Recommended tables:

```text
users
workshops
workshop_members
devices
game_sessions
savegames
progress_events
quest_progress
resource_snapshots
promise_logs
educational_reports
content_versions
```

## GDPR-oriented defaults

- anonymous local user by default;
- workshop code instead of personal data;
- append-only educational events;
- export/delete support later.
