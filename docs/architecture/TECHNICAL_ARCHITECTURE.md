# Technical Architecture

## Stack

```text
TypeScript
Vite
Canvas 2D
HTML/CSS overlay UI
Dexie / IndexedDB
Service Worker
Cache API
Remote API placeholder
PWA
Capacitor-ready
Tauri-ready
```

## Runtime flow

```text
App boot
→ Service Worker register
→ LocalDatabase init
→ AssetManifest load
→ PreloadManager preload assets
→ GameSession load/create
→ SceneManager or test scene load
→ GameLoop start
→ autosave locally
→ progress events appended
→ sync queue attempts remote sync if online
```

## Engine modules

- `GameLoop`
- `CanvasRenderer`
- `InputManager`
- future `SceneManager`
- future `Camera2D`
- future `CollisionSystem`
- future `DepthSortSystem`

## Game modules

- `GameState`
- `DialogueManager`
- `QuestManager`
- `EffectResolver`
- future `ResourceManager`
- future `ColourOfCommonsSystem`
- future `FragmentationSystem`
- future `PromiseSystem`

## Storage modules

- `LocalDatabase`
- `SaveRepository`
- `ProgressRepository`
- `SyncQueue`

## UI modules

- `DialogueUI`
- future HUD
- future Logbook
- future Report UI
- future Settings UI
