# Asset upload instructions

This is the lightweight repository package, without the heavy generated character assets.

To restore the assets, download and unzip the asset packages:

```text
justurbanities_assets_part_01.zip
justurbanities_assets_part_02.zip
...
```

Copy their contents into the repository root, preserving folders.

The assets should end up in:

```text
public/assets/characters/
docs/assets/preview/
```

Then run:

```bash
npm install
npm run build
```
