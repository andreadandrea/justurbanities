# Preload and Cache Notes

The runtime should preload from:

```text
src/data/asset_manifest.json
```

For each character, preload:

- icon;
- neutral portrait;
- atlas image;
- atlas JSON.

The Service Worker should cache:

- app shell;
- JSON content;
- required boot assets;
- vertical-slice characters;
- current scene environments.

For workshop use, provide a "Download content for offline play" button that caches all required assets.
