#!/usr/bin/env python3
"""Extract the original Bongo Cat (Steam app 1337970) artwork into DSH plugin frames.

The plugin never ships any game art. This script runs on the user's own
machine, reads the sprites out of the installed Unity game, composes the
idle / left-tap / right-tap frames exactly the way the game layers them,
and writes PNGs into the plugin's storage. The assets stay local.

Requirements: Python 3.10+ and `pip install UnityPy` (Pillow comes with it).

Usage:
    python tools/extract-native.py --out "%USERPROFILE%\\.dsh\\storages\\bongo-cat\\native"
    python tools/extract-native.py --list                    # list installed skins
    python tools/extract-native.py --skin Black --out ...     # another skin

Outputs (plus native.json metadata):
    idle.png, tap-left.png, tap-right.png

Layout note: the numbers below were derived from the game's own sprite atlas
(each part is authored in a 256x256 box; textureRect locates the art inside
the box) and the BaseCat/RightPaw/Bongos RectTransforms. The drums and the
right paw are separate nodes; punch frames swap in place.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("Pillow is missing. Run: pip install UnityPy")

try:
    import UnityPy
except ImportError:  # pragma: no cover
    sys.exit("UnityPy is missing. Run: pip install UnityPy")

APP_ID = "1337970"
ASSETS_REL = "BongoCat_Data/sharedassets0.assets"

# Canvas + per-part box origins, in unscaled sprite pixels.
#
# "paw" is the right-paw origin used when the drums are absent. It is the
# SAME origin as the body on purpose: both sprites are authored in the same
# 256x256 box, so placing each one at its own textureRect reproduces the
# game's own two-paw pose — the one shipped as <Skin>Icon (and shown in the
# skin picker). Verified against CatIcon: the paw's pink pads land at the
# same height as the left paw's pads, within one pixel.
# "paw_drum" is the origin the game uses when the paw rests on a drum.
CANVAS = (340, 250)
ORIGIN = {
    "cat": (40, -55),
    "paw": (40, -55),
    "paw_drum": (57, -30),
    "bongo_left": (25, 55),
    "bongo_right": (62, 55),
}
DRUMS = ("DefaultBongoLeft", "DefaultBongoRight")

# Dress-up overlays are a layer of their own, and the game's own prefab says
# exactly where it goes. Under `LobbyMember/Cat_Multiplayer/Visuals/BobTransform`
# (all children anchored at (0.5,0.5), pivot (0.5,0.5), 128x128):
#
#     Body   anchoredPosition (-6.3,  9.8)   256px sprite drawn into 128 -> x0.5
#     Hat    anchoredPosition ( 10.0, 45.0)  256px sprite drawn into 128 -> x0.5
#
# This canvas is in *sprite* pixels, i.e. twice the UI units those nodes use,
# so the 0.5 UI scale cancels out: an item is placed at 1:1 with its sprite
# and only the offset survives. Converting the Hat node into canvas pixels:
#
#     dx = (10.0 - (-6.3)) * 2 =  32.6     dy = (45.0 - 9.8) * -2 = -70.4
#     anchor = ORIGIN["cat"] + 128 + (dx, dy) = (200.6, 2.6)
#
# The game has a single cosmetic node (one item worn at a time); the plugin's
# four slots all hang off it.
COSMETIC_ANCHOR = (200.6, 2.6)
COSMETIC_SCALE = 1.0

# Emotes (`itemslot:emote`) are whole cat faces — `FaceBaseEmoji` is a 128x128
# head that fills its box — and the game has no separate face node, so their
# anchor is the cat's head centre in this artboard, measured off the composed
# idle frame (head bbox x 62..219, y 33..145). A 128px emote centred there
# covers the face exactly.
# Emotes are complete faces, but what the cat needs is only their EXPRESSION.
# `FaceBaseEmoji` is the neutral face of the same art, so each emote's features
# are `base features + (emote - base)`, and they are fitted onto the cat's own
# face: the anchor is the centre of the cat's eyes/mouth bbox, the scale makes
# the emoji's 128 box cover that bbox.
COSMETIC_FACE_ANCHOR = (157, 111)
COSMETIC_FACE_SCALE = 0.75

# Bumped whenever the geometry above changes, so an existing catalogue is
# re-exported instead of silently keeping rects from the old formula.
CATALOG_VERSION = 7

# Right tap. Assembly-CSharp's Cat.Tap() calls ShowRightPunch(true), whose only
# visual change is swapping the right-paw Image's sprite to <Skin>RightPunch
# (the matching drum sprite is the other half, absent from this cat-only
# composition); CatHitRight then waits _hitDuration (0.1 s in the shipped
# scene) and ShowRightPunch(false) restores <Skin>Right. Nothing rotates or
# moves at runtime, so the authentic right-tap frame is simply the idle body
# plus <Skin>RightPunch at the paw's own origin — no synthesized swing.


# ----------------------------------------------------------------------
# game discovery
# ----------------------------------------------------------------------
def steam_roots() -> list[Path]:
    roots: list[Path] = []
    if os.name == "nt":
        try:
            import winreg

            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Valve\Steam") as key:
                value, _ = winreg.QueryValueEx(key, "SteamPath")
                roots.append(Path(value))
        except OSError:
            pass
    roots += [
        Path(r"C:\Program Files (x86)\Steam"),
        Path(r"C:\Program Files\Steam"),
        Path("D:/SteamLibrary"),
        Path("E:/SteamLibrary"),
    ]
    return [p for p in roots if p.exists()]


def steam_libraries() -> list[Path]:
    libs: list[Path] = []
    for steam in steam_roots():
        libs.append(steam / "steamapps")
        vdf = steam / "steamapps" / "libraryfolders.vdf"
        if vdf.exists():
            text = vdf.read_text(encoding="utf-8", errors="ignore")
            for match in re.finditer(r'"path"\s+"([^"]+)"', text):
                libs.append(Path(match.group(1).replace("\\\\", "\\")) / "steamapps")
    seen, unique = set(), []
    for lib in libs:
        key = str(lib).lower()
        if key not in seen and lib.exists():
            seen.add(key)
            unique.append(lib)
    return unique


def find_game(explicit: str | None) -> Path:
    if explicit:
        game = Path(explicit)
        if (game / ASSETS_REL).exists():
            return game
        raise SystemExit(f"not a Bongo Cat install: {game}")
    for lib in steam_libraries():
        common = lib / "common"
        if not common.exists():
            continue
        for entry in common.iterdir():
            if entry.is_dir() and re.search(r"bongo\s*cat", entry.name, re.I):
                if (entry / ASSETS_REL).exists():
                    return entry
    raise SystemExit("Bongo Cat was not found. Pass --game <install dir>.")


# ----------------------------------------------------------------------
# sprite extraction + composition
# ----------------------------------------------------------------------
def load_sprites(assets: Path, names: set[str]) -> dict[str, tuple[Image.Image, tuple[float, float, float, float]]]:
    env = UnityPy.load(str(assets))
    out: dict[str, tuple[Image.Image, tuple[float, float, float, float]]] = {}
    for obj in env.objects:
        if obj.type.name != "Sprite":
            continue
        sprite = obj.read()
        name = getattr(sprite, "m_Name", "")
        if name not in names:
            continue
        rect = sprite.m_RD.textureRect
        out[name] = (
            sprite.image.convert("RGBA"),
            (rect.x, rect.y, rect.width, rect.height),
        )
    return out


def list_skins(assets: Path) -> list[str]:
    env = UnityPy.load(str(assets))
    names = set()
    for obj in env.objects:
        if obj.type.name != "Sprite":
            continue
        name = getattr(obj.read(), "m_Name", "")
        match = re.match(r"^(.+?)Left$", name)
        if match:
            names.add(match.group(1))
    return sorted(names)


def compose(
    sprites: dict[str, tuple[Image.Image, tuple[float, float, float, float]]],
    skin: str,
    scale: int,
    with_drums: bool = False,
) -> dict[str, Image.Image]:
    parts = dict(sprites)

    def art(key: str):
        img, (rx, ry, rw, rh) = parts[key]
        img = img.resize((img.width * scale, img.height * scale), Image.LANCZOS)
        origin = ORIGIN_BOX.get(key, ORIGIN["paw"])
        if key in ("CatRight", "CatRightPunch"):
            origin = ORIGIN["paw_drum"] if with_drums else ORIGIN["paw"]
        x = origin[0] + rx
        y = origin[1] + (256 - ry - rh)
        return img, x * scale, y * scale

    def bbox(img):
        return img.getbbox() or (0, 0, img.width, img.height)

    w, h = CANVAS[0] * scale, CANVAS[1] * scale

    def frame(cat_key: str, right_punch: bool) -> Image.Image:
        canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        # drums first (they sit behind the paws), punch variants aligned by base
        if with_drums:
            for idle_key, punch_key, punch in (
                ("BongoL", "BongoLP", False),
                ("BongoR", "BongoRP", right_punch),
            ):
                img, x, y = art(idle_key)
                if not punch:
                    canvas.alpha_composite(img, (int(x), int(y)))
                    continue
                bb = bbox(img)
                cx = x + (bb[0] + bb[2]) / 2
                base_y = y + bb[3]
                p_img, _, _ = art(punch_key)
                pb = bbox(p_img)
                px = int(cx - (pb[0] + pb[2]) / 2)
                py = int(base_y - pb[3])
                canvas.alpha_composite(p_img, (px, py))
        img, x, y = art(cat_key)
        canvas.alpha_composite(img, (int(x), int(y)))

        # Right paw: idle <Skin>Right, or the game's own <Skin>RightPunch pose
        # while the hit lasts — both positioned at the paw image's origin.
        img, x, y = art("CatRightPunch" if right_punch else "CatRight")
        canvas.alpha_composite(img, (int(x), int(y)))
        return canvas

    frames = {
        "idle": frame("CatLeft", False),
        "tap-left": frame("CatLeftPunch", False),
        "tap-right": frame("CatLeft", True),
    }
    if with_drums:
        return frames, (0, 0, w, h)
    # Cat-only frames: crop to content (+ a small margin) so the overlay is tight.
    cropped: dict[str, Image.Image] = {}
    boxes = [img.getbbox() or (0, 0, img.width, img.height) for img in frames.values()]
    left = min(b[0] for b in boxes)
    top = min(b[1] for b in boxes)
    right = max(b[2] for b in boxes)
    bottom = max(b[3] for b in boxes)
    pad = 8 * scale
    box = (max(0, left - pad), max(0, top - pad), min(w, right + pad), min(h, bottom + pad))
    for name, img in frames.items():
        cropped[name] = img.crop(box)
    return cropped, box


# Box origin lookup keyed by the internal keys used by art(). The right-paw
# entries are placeholders: art() swaps in ORIGIN["paw"] or ORIGIN["paw_drum"]
# depending on whether the drums are present.
ORIGIN_BOX = {
    "CatLeft": ORIGIN["cat"],
    "CatLeftPunch": ORIGIN["cat"],
    "CatRight": ORIGIN["paw"],
    "CatRightPunch": ORIGIN["paw"],
    "BongoL": ORIGIN["bongo_left"],
    "BongoLP": ORIGIN["bongo_left"],
    "BongoR": ORIGIN["bongo_right"],
    "BongoRP": ORIGIN["bongo_right"],
}


def export_catalog(assets: Path, out: Path, max_icon: int = 128) -> dict:
    """Export one icon per skin so the plugin can offer a picker."""
    env = UnityPy.load(str(assets))
    sprites = {}
    for obj in env.objects:
        if obj.type.name != "Sprite":
            continue
        sprite = obj.read()
        sprites[getattr(sprite, "m_Name", "")] = sprite

    names = set()
    for name in sprites:
        match = re.match(r"^(.+?)Left$", name)
        if match and not match.group(1).startswith("DefaultBongo"):
            names.add(match.group(1))

    icon_dir = out / "icons"
    icon_dir.mkdir(parents=True, exist_ok=True)
    items = []
    for name in sorted(names):
        sprite = sprites.get(f"{name}Icon") or sprites.get(f"{name}Left")
        if sprite is None:
            continue
        image = sprite.image.convert("RGBA")
        scale = min(1.0, max_icon / max(image.width, image.height))
        if scale < 1.0:
            image = image.resize(
                (max(1, int(image.width * scale)), max(1, int(image.height * scale))),
                Image.LANCZOS,
            )
        image.save(icon_dir / f"{name}.png")
        items.append({"name": name})

    meta = {"skins": items, "count": len(items)}
    (out / "skins.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return meta


# ----------------------------------------------------------------------
# cosmetics catalogue (hats / faces / back pieces / props)
# ----------------------------------------------------------------------
# The game's own item definitions are ScriptableObject assets whose m_Name is
# the Steam item's display name ("927 - Symbol Sparkle Emoji"). Every cosmetic
# is authored on the same 256-box canvas as the cat, so an item is a
# full-canvas overlay: paint the sprite at ORIGIN["cat"] and crop with the same
# box the frames use. Slots are not in any local metadata (the game reads the
# category from the Steam inventory), so they are inferred from the item name.
COSMETIC_DIR = "cosmetics"

BACK_RE = re.compile(r"(?i)(wings?|cape|tail|backpack|shell|jetpack|parachute|scythe|flag|aura|trail)")
HAT_RE = re.compile(
    r"(?i)(hat|cap|cap$|crown|helmet|halo|beret|beanie|beanie|turban|headband|headphone"
    r"|earmuff|antenna|horns?|tiara|wig|hair|mane|mohawk|hood|ushanka|strawhat|knit"
    r"|rice hat|cone|pumpkin|santa|wizard|witch|jester|fez|flower|leaf|leaves"
    r"|feather|antler|visor|ears?$|tent|mushroom|bonnet|bucket)"
)
FACE_RE = re.compile(
    r"(?i)(glasses|shades|goggles?|monocle|blush|moustache|mustache|beard|brow"
    r"|eye|tears?|sweat|nose|tattoo|scar|blindfold|bandage|makeup|\blips?\b|mouth"
    r"|mask)"
)
RARITY_LEGENDARY = ("gold", "diamond", "platinum", "legend", "mythic", "rainbow",
                    "void", "zeus", "poseidon", "hades", "dragon", "phoenix",
                    "crystal", "emperor", "king", "queen")
RARITY_RARE = ("silver", "ruby", "sapphire", "emerald", "amethyst", "crown",
               "wings", "unicorn", "santa", "halloween", "christmas", "spirit",
               "ghost", "angel", "demon", "gem")


def classify_cosmetic(name: str, item_slot: str) -> tuple[str, str, int]:
    """Return (slot, layer, rarity) for one item.

    `item_slot` is the game's own `itemslot` tag, which is the authoritative
    split: `emote` items are whole cat faces (`FaceBaseEmoji`, `FaceAngryEmoji`
    …) meant to sit on the head, while `hat` items are worn on the hat node.
    Name keywords only decide *where on the body* a hat sits.
    """
    lower = name.lower()
    if item_slot == "emote" and lower.startswith("face"):
        # `Face*` emotes are complete cat faces — the only items the game does
        # NOT draw on the hat node. They become the cat's expression.
        slot, layer = "face", "front"
    elif item_slot == "emote":
        # Flags, food, hearts, symbols: they are tagged `emote` but they are not
        # faces, and there is no expression to lift out of them (their artwork
        # is mostly white, which a diff against the white face drops entirely —
        # the rice ball came out as a floating square of seaweed). The game
        # hangs the whole sticker on the head node, so they stay a prop.
        slot, layer = "accessory", "front"
    elif BACK_RE.search(name):
        slot, layer = "back", "back"
    elif HAT_RE.search(name):
        slot, layer = "hat", "front"
    else:
        # Glasses, body props, food, costumes: everything else the game hangs
        # on the hat node. Grouping is only the panel's tabs; the anchor is
        # the hat node for all of them.
        slot, layer = "accessory", "front"
    if any(word in lower for word in RARITY_LEGENDARY):
        rarity = 3
    elif any(word in lower for word in RARITY_RARE):
        rarity = 2
    else:
        rarity = 1
    return slot, layer, rarity


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "item"


def load_script_ids(game: Path) -> dict[int, str]:
    """MonoScript path id → class name (globalgamemanagers.assets)."""
    path = game / "BongoCat_Data" / "globalgamemanagers.assets"
    if not path.exists():
        return {}
    env = UnityPy.load(str(path))
    ids: dict[int, str] = {}
    for obj in env.objects:
        if obj.type.name != "MonoScript":
            continue
        try:
            ids[obj.path_id] = getattr(obj.read(), "m_Name", "")
        except Exception:
            continue
    return ids


def _read_len_string(data: bytes, pos: int) -> tuple[str, int]:
    length = int.from_bytes(data[pos:pos + 4], "little", signed=True)
    if not 0 <= length < 2000:
        raise ValueError("bad serialized string length")
    return data[pos + 4:pos + 4 + length].decode("utf-8", "ignore"), pos + 4 + length


def load_item_names(assets: Path, script_ids: dict[int, str]) -> dict[str, str]:
    """Item display name → the game's own `itemslot` tag (hat / emote / skin …).

    The tag lives in the item's serialized tag list ("itemslot:hat"), which is
    the only authoritative slot information on this machine — the Steam
    inventory API is what normally supplies it.
    """
    target = {pid for pid, name in script_ids.items() if name == "SteamItemBasic"}
    env = UnityPy.load(str(assets))
    items: dict[str, str] = {}
    for obj in env.objects:
        if obj.type.name != "MonoBehaviour":
            continue
        try:
            data = obj.get_raw_data()
        except Exception:
            continue
        if len(data) < 32:
            continue
        script = int.from_bytes(data[20:28], "little", signed=True)
        if script not in target:
            continue
        try:
            name, _ = _read_len_string(data, 28)
        except Exception:
            continue
        match = re.search(rb"itemslot:([a-z]+)", data)
        items[name] = match.group(1).decode("ascii") if match else ""
    return items



def _dark_blobs(img: "Image.Image", lo: int = 25, hi: int = 3000) -> list[list[tuple[int, int]]]:
    """Connected blobs of the dark line art (eyes, mouth, brows)."""
    W, H = img.size
    px = img.load()
    dark = {(x, y) for y in range(H) for x in range(W)
            if px[x, y][3] > 128 and sum(px[x, y][:3]) < 430}
    seen: set[tuple[int, int]] = set()
    blobs: list[list[tuple[int, int]]] = []
    for point in dark:
        if point in seen:
            continue
        stack, comp = [point], []
        seen.add(point)
        while stack:
            cx, cy = stack.pop()
            comp.append((cx, cy))
            for q in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                if q in dark and q not in seen:
                    seen.add(q)
                    stack.append(q)
        if lo <= len(comp) <= hi:
            blobs.append(comp)
    return blobs


def _bbox(points) -> tuple[int, int, int, int]:
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    return min(xs), min(ys), max(xs), max(ys)


def _outline_points(img: "Image.Image") -> set[tuple[int, int]]:
    """The face contour: the dark blob with the largest extent.

    It wraps the whole head, so it wins on bounding-box area even when another
    shape (sunglasses, a hat brim) is heavier.
    """
    W, H = img.size
    px = img.load()
    dark = {(x, y) for y in range(H) for x in range(W)
            if px[x, y][3] > 128 and sum(px[x, y][:3]) < 430}
    seen: set[tuple[int, int]] = set()
    best: set[tuple[int, int]] = set()
    best_area = -1
    for point in dark:
        if point in seen:
            continue
        stack, comp = [point], []
        seen.add(point)
        while stack:
            cx, cy = stack.pop()
            comp.append((cx, cy))
            for q in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                if q in dark and q not in seen:
                    seen.add(q)
                    stack.append(q)
        xs = [p[0] for p in comp]
        ys = [p[1] for p in comp]
        area = (max(xs) - min(xs)) * (max(ys) - min(ys))
        if area > best_area:
            best_area, best = area, set(comp)
    return best


def _near_mask(points: set[tuple[int, int]], size: tuple[int, int], radius: int) -> "Image.Image":
    """L mask, 255 within `radius` px of any point in `points`."""
    from PIL import ImageFilter
    mask = Image.new("L", size, 0)
    mp = mask.load()
    for (x, y) in points:
        if 0 <= x < size[0] and 0 <= y < size[1]:
            mp[x, y] = 255
    return mask.filter(ImageFilter.MaxFilter(radius * 2 + 1))


def blank_face(frame: "Image.Image", features: set[tuple[int, int]]) -> "Image.Image":
    """Paint the cat's eyes/mouth out with its own fur colour.

    The mask is built from the features themselves, dilated and then feathered.
    An ellipse fitted to their bounding box looks right but is smaller than the
    box at the corners, so the feather ran straight through the eye and mouth
    corners and left grey ghosts of them on the blanked frame.
    """
    from PIL import ImageFilter, ImageChops
    if not features:
        return frame.copy()
    xs = [p[0] for p in features]
    ys = [p[1] for p in features]
    x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
    px = frame.load()
    cols = []
    for y in range(max(0, y0 - 18), min(frame.height, y1 + 18)):
        for x in range(max(0, x0 - 18), min(frame.width, x1 + 18)):
            r, g, b, a = px[x, y]
            if a > 200 and sum((r, g, b)) > 600:
                cols.append((r, g, b))
    if not cols:
        return frame.copy()
    cols.sort(key=lambda c: sum(c))
    fur = cols[len(cols) // 2]

    mask = Image.new("L", frame.size, 0)
    mp = mask.load()
    for (x, y) in features:
        mp[x, y] = 255
    # Dilate well past the features, then feather: the soft edge lands on flat
    # fur (invisible) instead of on the feature itself (a grey ghost).
    mask = mask.filter(ImageFilter.MaxFilter(25)).filter(ImageFilter.GaussianBlur(5))

    # Never bite into the head outline: it is the one dark thing the face
    # touches, and a chipped contour looks worse than a soft edge.
    ring = Image.new("L", frame.size, 0)
    rp = ring.load()
    for y in range(max(0, y0 - 30), min(frame.height, y1 + 30)):
        for x in range(max(0, x0 - 30), min(frame.width, x1 + 30)):
            if (x, y) in features:
                continue
            r, g, b, a = px[x, y]
            if a > 128 and r + g + b < 430:
                rp[x, y] = 255
    mask = ImageChops.subtract(mask, ring.filter(ImageFilter.MaxFilter(7)))

    out = frame.copy()
    out.paste(Image.new("RGBA", frame.size, fur + (255,)), (0, 0), mask)
    return out


def _drop_small_fragments(img: "Image.Image", near: "Image.Image", max_px: int = 250, ratio: float = 0.4) -> "Image.Image":
    """Erase small blobs that sit on the shared face outline.

    Each emote is drawn with a slightly different contour, so the diff against
    the neutral face picks up slivers of the outline near the edge. They are
    not part of the expression and, once pasted, land outside the cat's face as
    stray marks.
    """
    W, H = img.size
    px = img.load()
    np_ = near.load()
    pts = {(x, y) for y in range(H) for x in range(W) if px[x, y][3] > 20}
    seen: set[tuple[int, int]] = set()
    drop: list[tuple[int, int]] = []
    for point in pts:
        if point in seen:
            continue
        stack, comp = [point], []
        seen.add(point)
        while stack:
            cx, cy = stack.pop()
            comp.append((cx, cy))
            for q in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                if q in pts and q not in seen:
                    seen.add(q)
                    stack.append(q)
        if len(comp) <= max_px:
            inside = sum(1 for (x, y) in comp if np_[x, y] > 0)
            if inside >= len(comp) * ratio:
                drop.extend(comp)
    if not drop:
        return img
    out = img.copy()
    op = out.load()
    for (x, y) in drop:
        op[x, y] = (0, 0, 0, 0)
    return out


def expression_patch(sprite, base_features: set[tuple[int, int]], base: "Image.Image",
                     ring_near: "Image.Image | None" = None,
                     ring_rgb: tuple[int, int, int] | None = None) -> "Image.Image":
    """The emote's expression only: the neutral face's features plus whatever
    this emote changes, with the shared head/ears/outline dropped."""
    from PIL import ImageChops
    art = sprite.image.convert("RGBA")
    W, H = art.size
    # Emotes are not all the same size: `Face*` faces are 128x128 while the
    # themed ones (`Nature Fire Emoji` …) come on a different canvas. Compare
    # against a base resampled to this size so the diff is pixel-aligned.
    ref = base if base.size == art.size else base.resize(art.size, Image.LANCZOS)
    diff = ImageChops.difference(art.convert("RGB"), ref.convert("RGB"))
    ap, dp = art.load(), diff.load()
    rp_ref = ref.load()
    rn = ring_near.load() if ring_near is not None else None
    out = Image.new("RGBA", art.size, (0, 0, 0, 0))
    op = out.load()
    sx, sy = W / base.width, H / base.height
    for (bx, by) in base_features:
        x, y = int(bx * sx), int(by * sy)
        if 0 <= x < W and 0 <= y < H:
            op[x, y] = ap[x, y]
    # Full canvas: the fixed 12/14 px inset used to clip marks that sit near
    # the edge of the emote's box (the heart that floats between the ears came
    # out as half a heart). The outline is excluded by colour below instead.
    for y in range(H):
        for x in range(W):
            if ap[x, y][3] <= 80:
                continue
            r, g, b = dp[x, y]
            peak = max(r, g, b)
            cr, cg, cb = ap[x, y][:3]
            # A flat threshold misses marks that only differ in INTENSITY: the
            # blush is (255,166,166) over the neutral face's own (250,223,221),
            # a peak difference of 57, so only its anti-aliased rim survived and
            # the cheeks came out as crescents. A mark also ADDS saturation,
            # which is the test used here — the face's own pink gradient is
            # just as saturated as the neutral face's, so it stays out.
            sat = max(cr, cg, cb) - min(cr, cg, cb)
            if not (peak > 60 or (peak > 24 and sat > 55)):
                continue
            # Slivers of the shared head outline differ from the neutral face by
            # a few levels; drop them, but keep genuinely black art (sunglasses)
            # that happens to sit near the contour.
            if rn is not None and ring_rgb is not None and rn[x, y] > 0:
                if abs(cr - ring_rgb[0]) < 45 and abs(cg - ring_rgb[1]) < 45 and abs(cb - ring_rgb[2]) < 45:
                    continue
            op[x, y] = ap[x, y]
    if ring_near is not None:
        out = _drop_small_fragments(out, ring_near)
    return out


def export_cosmetics(assets: Path, out: Path, scale: int, force: bool = False) -> dict:
    """Export every dress-up overlay as PNG + write native/cosmetics/catalog.json.

    Rects are stored in CANVAS coordinates, so the catalogue does not depend on
    the frame's crop box: switching skins only re-crops the frames, and the
    browser maps canvas → frame with the box from native.json. That is what
    makes a skin switch cheap — the 514 overlays are exported once.
    """
    cosmetic_dir = out / COSMETIC_DIR
    catalog_path = cosmetic_dir / "catalog.json"
    if not force and catalog_path.exists():
        try:
            existing = json.loads(catalog_path.read_text(encoding="utf-8"))
        except Exception:
            existing = None
        if (
            isinstance(existing, dict)
            and existing.get("version") == CATALOG_VERSION
            and existing.get("rectSpace") == "canvas"
            and existing.get("scale") == scale
            and existing.get("items")
        ):
            print(json.dumps({"ok": True, "cosmetics": len(existing["items"]), "skipped": True}, ensure_ascii=False))
            return existing

    game = assets.parent.parent
    script_ids = load_script_ids(game)
    raw_names = load_item_names(assets, script_ids)

    env = UnityPy.load(str(assets))
    sprite_objects: dict[str, object] = {}
    for obj in env.objects:
        if obj.type.name != "Sprite":
            continue
        try:
            name = getattr(obj.read(), "m_Name", "")
        except Exception:
            continue
        sprite_objects[name] = obj

    cosmetics: list[dict] = []
    used: set[str] = set()
    for raw in sorted(raw_names):
        match = re.match(r"^(\d+)\s*-\s*(.+)$", raw)
        if match is None:
            continue
        item_no = int(match.group(1))
        name = match.group(2).strip()
        key = name.replace(" ", "")
        if key not in sprite_objects:
            continue
        # A skin is split into <Skin>Left / <Skin>Right; anything else drawn on
        # the canvas is a dress-up overlay.
        if f"{key}Left" in sprite_objects:
            continue
        slot, layer, rarity = classify_cosmetic(name, raw_names[raw])
        base = slugify(name)
        slug = base
        suffix = 2
        while slug in used:
            slug = f"{base}-{suffix}"
            suffix += 1
        used.add(slug)
        cosmetics.append({
            "id": slug,
            "itemId": item_no,
            "name": name,
            "slot": slot,
            "layer": layer,
            "rarity": rarity,
            "sprite": key,
        })

    cosmetic_dir = out / COSMETIC_DIR
    cosmetic_dir.mkdir(parents=True, exist_ok=True)
    base_sprite = sprite_objects.get("FaceBaseEmoji")
    base_img = base_sprite.read().image.convert("RGBA") if base_sprite is not None else None
    base_features: set[tuple[int, int]] = set()
    ring_near = None
    base_cx = base_cy = None
    if base_img is not None:
        outline = _outline_points(base_img)
        base_features = set(p for blob in _dark_blobs(base_img, 25, 8000) for p in blob
                            if p not in outline)
        ring_near = _near_mask(outline, base_img.size, 10)
        ring_rgb = None
        if outline:
            samples = [base_img.getpixel(p)[:3] for p in list(outline)[:600]]
            ring_rgb = tuple(int(sum(c[i] for c in samples) / len(samples)) for i in range(3))
        if base_features:
            xs = [p[0] for p in base_features]
            ys = [p[1] for p in base_features]
            base_cx = (min(xs) + max(xs)) / 2
            base_cy = (min(ys) + max(ys)) / 2

    exported = 0
    for item in cosmetics:
        sprite = sprite_objects[item["sprite"]].read()
        if item["slot"] == "face" and base_img is not None:
            # Emotes contribute their EXPRESSION, not their head: the patch is
            # the neutral face's features plus whatever this emote changes.
            patch = expression_patch(sprite, base_features, base_img, ring_near, ring_rgb)
            k = COSMETIC_FACE_SCALE
            width_px = max(1, int(round(patch.width * scale * k)))
            height_px = max(1, int(round(patch.height * scale * k)))
            overlay = patch.resize((width_px, height_px), Image.LANCZOS)
            # The emote's FEATURES sit on the cat's features. Centring the
            # 128 box instead put them ~22 canvas px too low: the eyes/mouth
            # are not centred in their own box.
            fx = base_cx if base_cx is not None else patch.width / 2
            fy = base_cy if base_cy is not None else patch.height / 2
            x = (COSMETIC_FACE_ANCHOR[0] - fx * k) * scale
            y = (COSMETIC_FACE_ANCHOR[1] - fy * k) * scale
        else:
            image = sprite.image.convert("RGBA")
            rect = sprite.m_RD.textureRect
            rx, ry, rw, rh = rect.x, rect.y, rect.width, rect.height
            # The sprite's own authored box (m_Rect), not a hardcoded 256.
            box_w, box_h = sprite.m_Rect.width, sprite.m_Rect.height
            k = COSMETIC_SCALE
            width_px = max(1, int(round(image.width * scale * k)))
            height_px = max(1, int(round(image.height * scale * k)))
            overlay = image.resize((width_px, height_px), Image.LANCZOS)
            # Box centre on the anchor, then the art's own offset inside the box
            # (textureRect is y-up, the canvas is y-down). No intermediate
            # canvas: a tall hat legitimately sits above the artboard.
            x = (COSMETIC_ANCHOR[0] - box_w / 2 * k + rx * k) * scale
            y = (COSMETIC_ANCHOR[1] - box_h / 2 * k + (box_h - ry - rh) * k) * scale
        overlay.save(cosmetic_dir / f"{item['id']}.png")
        # `rect` stays in CANVAS pixels so the catalogue survives a change of
        # skin (and of crop box).
        item["rect"] = [int(round(x)), int(round(y)), width_px, height_px]

        # Tile icon: the overlay's own content, padded, at most 96 px.
        pad = 6 * scale
        padded = Image.new("RGBA", (overlay.width + pad * 2, overlay.height + pad * 2), (0, 0, 0, 0))
        padded.alpha_composite(overlay, (pad, pad))
        icon_scale = min(1.0, 96 / max(padded.width, padded.height))
        if icon_scale < 1.0:
            padded = padded.resize((max(1, int(padded.width * icon_scale)), max(1, int(padded.height * icon_scale))), Image.LANCZOS)
        padded.save(cosmetic_dir / f"{item['id']}.icon.png")
        exported += 1

    stamp = __import__("datetime").datetime.now().isoformat(timespec="seconds")
    catalog = {
        "version": CATALOG_VERSION,
        "rectSpace": "canvas",
        "stamp": stamp,
        "scale": scale,
        "size": [CANVAS[0] * scale, CANVAS[1] * scale],
        "items": [
            {k: item[k] for k in ("id", "name", "slot", "layer", "rarity", "rect")}
            for item in cosmetics
        ],
    }
    (cosmetic_dir / "catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"ok": True, "cosmetics": exported, "size": catalog["size"]}, ensure_ascii=False))
    return catalog


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract original Bongo Cat frames for dsh-plugin-bongo-cat")
    parser.add_argument("--out", help="output directory (plugin native storage)")
    parser.add_argument("--game", help="Bongo Cat install directory")
    parser.add_argument("--skin", default="Cat", help="skin name (see --list; the game ships 244 skins)")
    parser.add_argument("--scale", type=int, default=3, help="pixel scale (default 3)")
    parser.add_argument("--list", action="store_true", help="list installed skins and exit")
    parser.add_argument("--with-drums", action="store_true", help="include the bongo drums (default: cat only)")
    parser.add_argument("--catalog", action="store_true", help="export skin icons + skins.json and exit")
    parser.add_argument("--cosmetics", action="store_true", help="re-export the dress-up catalogue even when it is up to date")
    args = parser.parse_args()

    game = find_game(args.game)
    assets = game / ASSETS_REL
    if args.list:
        for name in list_skins(assets):
            print(name)
        return
    if not args.out:
        raise SystemExit("--out is required (or use --list)")

    if args.catalog:
        meta = export_catalog(assets, Path(args.out))
        print(json.dumps({"ok": True, "catalog": meta["count"]}, ensure_ascii=False))
        return

    skin = args.skin
    if skin.startswith("DefaultBongo"):
        raise SystemExit("DefaultBongo* are the drums, not a cat skin. Try --skin Cat")
    wanted = {f"{skin}Left", f"{skin}LeftPunch", f"{skin}Right", f"{skin}RightPunch"}
    if args.with_drums:
        wanted |= {f"{DRUMS[0]}", f"{DRUMS[0]}Punch", f"{DRUMS[1]}", f"{DRUMS[1]}Punch"}
    raw = load_sprites(assets, wanted)
    missing = wanted - set(raw)
    if missing:
        raise SystemExit(f"sprites missing for skin {skin!r}: {sorted(missing)}")

    keymap = {
        "CatLeft": f"{skin}Left",
        "CatLeftPunch": f"{skin}LeftPunch",
        "CatRight": f"{skin}Right",
        "CatRightPunch": f"{skin}RightPunch",
    }
    if args.with_drums:
        keymap |= {
            "BongoL": DRUMS[0],
            "BongoLP": f"{DRUMS[0]}Punch",
            "BongoR": DRUMS[1],
            "BongoRP": f"{DRUMS[1]}Punch",
        }
    sprites = {k: raw[v] for k, v in keymap.items()}

    frames, box = compose(sprites, skin, max(1, min(6, args.scale)), with_drums=args.with_drums)

    # sanity: the cat must occupy the middle band of the frame
    idle = frames["idle"]
    w, h = idle.size
    face = idle.crop((int(w*0.35), int(h*0.15), int(w*0.65), int(h*0.55)))
    if face.getbbox() is None:
        raise SystemExit("composition sanity check failed: no cat art in the middle band")

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    face_frames: dict[str, str] = {}
    cat_blobs = _dark_blobs(frames["idle"])
    face_pixels = set(p for blob in cat_blobs for p in blob)
    for name, image in frames.items():
        image.save(out / f"{name}.png")
        # A second copy with the cat's own eyes/mouth painted out: the browser
        # swaps to it while a face item is worn.
        if face_pixels:
            blank_face(image, face_pixels).save(out / f"{name}-face.png")
            face_frames[name] = f"{name}-face.png"

    # Dress-up overlays ride along on their own canvas-space coordinates: the
    # catalogue is exported once and reused across skins, so a skin switch only
    # re-crops the frames (the old code re-exported all 514 overlays every time
    # and made switching take ~11 s).
    cosmetic_catalog = export_cosmetics(assets, out, max(1, min(6, args.scale)), force=args.cosmetics)

    meta = {
        "source": "steam-bongo-cat",
        "appId": APP_ID,
        "skin": skin,
        "scale": max(1, min(6, args.scale)),
        "drums": bool(args.with_drums),
        "frames": {name: f"{name}.png" for name in frames},
        "size": list(frames["idle"].size),
        # Where the cropped frame sits inside the full canvas. The browser needs
        # it to map the canvas-space cosmetic rects onto the stage.
        "box": [int(v) for v in box],
        "faceFrames": face_frames,
        "cosmetics": {
            "count": len(cosmetic_catalog["items"]),
            "stamp": cosmetic_catalog["stamp"],
        },
        "gameDir": str(game),
        "extractedAt": __import__("datetime").datetime.now().isoformat(timespec="seconds"),
    }
    (out / "native.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"ok": True, **meta}, ensure_ascii=False))


if __name__ == "__main__":
    main()

