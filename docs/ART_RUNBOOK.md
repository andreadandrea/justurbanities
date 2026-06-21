# Character Art Runbook (Higgsfield) — parallel art session

> **Purpose:** turn-key instructions for a **separate, parallel Claude Code session** to (re)generate
> character portraits + icons with Higgsfield and commit them. This track touches **only**
> `public/assets/characters/**` so it never conflicts with the code work on
> `claude/gracious-knuth-w640t8` (which touches `src/`).
>
> **Prerequisite:** this session's environment must have the Higgsfield asset hosts allowlisted
> (network egress = Custom, with defaults kept, plus `*.cloudfront.net`, `upload.higgsfield.ai`,
> `*.higgsfield.ai`). Verify first (step 0); if it fails, the environment still has the old policy.

---

## Branch

Work on a dedicated branch off the latest code tip:

```
git fetch origin
git checkout claude/gracious-knuth-w640t8
git checkout -b claude/character-art
```

Only `public/assets/characters/**` is modified here. Open a **separate draft PR** for this branch
(it merges cleanly alongside the code PR #2 because the file sets are disjoint).

---

## Step 0 — verify egress is actually open

```
curl -sS -o /dev/null -w "%{http_code}\n" https://d8j0ntlcm91z4.cloudfront.net/ 2>&1
```
Anything other than `Host not in allowlist:` means the host is reachable (a 403/404 *from CloudFront*
is fine). If you see `Host not in allowlist`, STOP — the environment was not recreated with the new
network policy; the user must start a fresh session after saving the allowlist.

---

## What already exists (this is an UPGRADE, not a create)

Every character already has placeholder runtime assets with the **final names** the asset manifest
expects — do not rename, just overwrite:

```
public/assets/characters/<id>/portraits/portrait_<id>_neutral.png
public/assets/characters/<id>/portraits/portrait_<id>_positive.png
public/assets/characters/<id>/portraits/portrait_<id>_concerned.png
public/assets/characters/<id>/portraits/portrait_<id>_focused.png
public/assets/characters/<id>/icons/icon_<id>.png
public/assets/characters/<id>/references/<id>_reference_sheet.jpeg   (input, do not change)
```
`src/data/asset_manifest.json` already references these paths → **no manifest edits needed.**

**Target format (match Maya, the proven example):**
- Portraits: RGBA PNG, transparent background, head-and-chest framing, ~360×520 (variable height OK).
- Icon: RGBA PNG, **256×256**, transparent background, head/face centered.

Maya is already done — use her as the visual quality bar; do **not** regenerate her.

---

## Priority order

1. **Playables (priority A):** `samir`, `elena`, `luca`  *(maya already done)*
2. **Key NPCs (priority A):** `anna`, `ben`, `zoe`
3. **Priority B:** `abdullah`, `alexandria`, `amin`, `giorgia`, `gwen`, `lia`, `matilda`, `pablo`, `ruben`, `sigrid`, `tom`
4. **Priority C:** `donald`, `marta`, `siobhan`, `mrs_viveca`

Generate one character fully, eyeball it against Maya, then continue. Budget: ~692 credits at start —
each `nano_banana_pro` 2k image is a few credits; 4 portraits × ~22 chars is the bulk, so check
`balance` periodically.

---

## Per-character pipeline

For a character `<id>`:

### 1. Import the reference sheet (server-side, no egress needed)
The reference is reachable via raw GitHub on this branch:
```
mcp__Higgsfield__media_import_url(
  type="image",
  url="https://raw.githubusercontent.com/andreadandrea/justurbanities/claude/character-art/public/assets/characters/<id>/references/<id>_reference_sheet.jpeg"
)
```
(Use whatever branch the reference sheet is committed on; `claude/gracious-knuth-w640t8` also works.)
Keep the returned `media_id`.

### 2. Generate the 4 expression portraits
Model `nano_banana_pro`, `aspect_ratio="2:3"`, `resolution="2k"`, `medias=[{role:"image", value:<media_id>}]`.
Use this **approved prompt template** (the Samir PoC the user signed off on), swapping the expression clause:

> Head-and-shoulders character portrait of the person shown in the provided character reference sheet:
> exactly the same individual — same face, hair, skin tone, and the same clothing/outfit from the sheet.
> Front-facing, chest-up framing, **<EXPRESSION>**. Clean flat pale solid background (no scenery), soft
> even lighting. Exactly the same hand-drawn illustrated comic/vector art style, line work and color
> palette as the reference sheet. Single character, centered, no text, no border, no UI.

`<EXPRESSION>` per file:
- `neutral`   → "a calm, friendly neutral expression, looking slightly toward the viewer"
- `positive`  → "a warm, happy, encouraging smile"
- `concerned` → "a concerned, worried but composed expression"
- `focused`   → "a focused, determined, attentive expression"

Keep each job id.

### 3. Cut out the background (server-side)
For each portrait job: `mcp__Higgsfield__remove_background({ media_id:<job_id>, media_type:"image" })`.
Keep the transparent result job id / url (via `job_display`).

### 4. Download the transparent PNGs (needs egress — that's why this is a new session)
Get each result `rawUrl` from `job_display`, then:
```
curl -sS -o /tmp/portrait_<id>_<expr>.png "<rawUrl>"
file /tmp/portrait_<id>_<expr>.png   # expect PNG RGBA
```

### 5. Normalize + build the icon (local, Pillow)
```
pip install --quiet pillow   # pypi is in the Trusted allowlist
```
```python
# tools/art_postprocess.py  (write once, reuse)
import sys
from PIL import Image

src = sys.argv[1]        # transparent portrait png
out_portrait = sys.argv[2]
out_icon = sys.argv[3]   # 256x256 icon, or "-" to skip

im = Image.open(src).convert("RGBA")
# trim fully-transparent margins
bbox = im.getbbox()
if bbox: im = im.crop(bbox)
im.save(out_portrait)

if out_icon != "-":
    w, h = im.size
    side = min(w, h)                      # square crop around the head (top of the figure)
    left = (w - side) // 2
    head = im.crop((left, 0, left + side, side)).resize((256, 256), Image.LANCZOS)
    head.save(out_icon)
```
Run per portrait; build the icon **once** from the `neutral` portrait:
```
python tools/art_postprocess.py /tmp/portrait_<id>_neutral.png \
  public/assets/characters/<id>/portraits/portrait_<id>_neutral.png \
  public/assets/characters/<id>/icons/icon_<id>.png
python tools/art_postprocess.py /tmp/portrait_<id>_positive.png  public/assets/characters/<id>/portraits/portrait_<id>_positive.png  -
python tools/art_postprocess.py /tmp/portrait_<id>_concerned.png public/assets/characters/<id>/portraits/portrait_<id>_concerned.png -
python tools/art_postprocess.py /tmp/portrait_<id>_focused.png   public/assets/characters/<id>/portraits/portrait_<id>_focused.png   -
```

### 6. Update metadata + commit
Bump the character's `metadata/<id>_asset_metadata.json` `status` to
`"runtime_portraits_generated_higgsfield_nano_banana_pro"`. Then:
```
git add public/assets/characters/<id>
git commit -m "art(<id>): Higgsfield portraits + icon from reference sheet"
```
Commit per character (easy to revert a bad one). Push the branch and keep the draft PR updated.

---

## Out of scope here (separate, harder phase)
Directional **walk/idle sprite atlases** (the `sprites/` + `atlas/` files, Maya-style 4-direction frames)
are NOT reliably produced by single-image generation and need a dedicated approach — leave the existing
placeholder atlas/sprites untouched for now and flag them for a later pass.

## Verify before finishing
- `npm run build` still passes (you only changed assets, but confirm the manifest still resolves).
- Spot-check a couple of portraits have transparent backgrounds and the icon is 256×256.
- Each character committed separately; draft PR opened for `claude/character-art`.
