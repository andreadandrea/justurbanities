# Asset Pipeline

## Included

This repository includes generated placeholder runtime assets for characters.

They are useful for:

- preload testing;
- cache testing;
- UI testing;
- Canvas rendering;
- dialogue scenes;
- character selection;
- development before final sprite production.

They are not final production-quality sprites.

## Runtime structure

```text
public/assets/characters/[characterId]/
  references/
  portraits/
  icons/
  sprites/
  atlas/
  metadata/
```

## Data

```text
src/data/asset_manifest.json
src/data/characters.json
src/data/animations.json
```

## Replacement rule

Final art can replace placeholder frames later if file names and manifest paths remain stable.
