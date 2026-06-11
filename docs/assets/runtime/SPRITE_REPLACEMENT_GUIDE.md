# Sprite Replacement Guide

## Rule

The game code should depend on file names and JSON manifests, not on the current placeholder artwork.

You can replace placeholder assets later without rewriting game logic.

## Replace a playable sprite

For example Maya:

```text
public/assets/characters/maya/sprites/
  char_maya_idle_down_01.png
  char_maya_walk_down_01.png
  char_maya_walk_down_02.png
  char_maya_walk_down_03.png
  char_maya_walk_down_04.png
```

Keep:

- same frame dimensions;
- transparent background;
- same foot baseline;
- same naming convention.

## Replace atlas

After updating frames, regenerate:

```text
maya_atlas.png
maya_atlas.json
```

Then update:

```text
src/data/asset_manifest.json
src/data/animations.json
```

## Recommended anchors

Use bottom-center origin:

```ts
originX = 0.5
originY = 1.0
```

This supports 2.5D depth sorting.
