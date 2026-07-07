import sys
from PIL import Image

src = sys.argv[1]        # transparent portrait png
out_portrait = sys.argv[2]
out_icon = sys.argv[3]   # 256x256 icon, or "-" to skip

im = Image.open(src).convert("RGBA")
# trim fully-transparent margins
bbox = im.getbbox()
if bbox:
    im = im.crop(bbox)
im.save(out_portrait)

if out_icon != "-":
    w, h = im.size
    side = min(w, h)                      # square crop around the head (top of the figure)
    left = (w - side) // 2
    head = im.crop((left, 0, left + side, side)).resize((256, 256), Image.LANCZOS)
    head.save(out_icon)
