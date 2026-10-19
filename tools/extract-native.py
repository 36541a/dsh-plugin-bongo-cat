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
import math
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

# Right-tap press. CatRightPunch is only the impact effect (arc + dashes) —
# the game rotates the paw NODE at runtime, so no sprite holds the "paw down"
# pose. Produce it here: swing the paw slightly and press it straight down
# beside the face (the reference is the game's own counter shot), keeping the
# wrist in the body's overlap so nothing detaches, and put the impact dashes
# to the paw's right. Pivot is a fraction of the paw sprite so every skin
# swings the same way.
PAW_SWING_DEG = -30.0
PAW_PRESS = (4, 14)             # extra down-right press after the swing (unscaled px)
DASH_FROM_PAW = (46, 2)         # dash centroid, unscaled px right of the paw centre
# Connected components smaller than this are the impact dashes; anything
# larger is the swoosh, which only makes sense against a drum.
DASH_MAX_AREA = 400


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


def _components(img: Image.Image, min_alpha: int = 40):
    """Yield 8-connected opaque components as lists of (x, y)."""
    w, h = img.size
    px = img.load()
    seen = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            index = y * w + x
            if seen[index]:
                continue
            if px[x, y][3] < min_alpha:
                seen[index] = 1
                continue
            stack = [(x, y)]
            seen[index] = 1
            comp = []
            while stack:
                cx, cy = stack.pop()
                comp.append((cx, cy))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h:
                            j = ny * w + nx
                            if not seen[j] and px[nx, ny][3] >= min_alpha:
                                seen[j] = 1
                                stack.append((nx, ny))
            yield comp


def impact_dashes(img: Image.Image) -> Image.Image:
    """Keep the small impact strokes of a punch sprite and drop the swoosh.

    The big arc in <Skin>RightPunch traces the paw's path against a drum.
    Without the drum it reads as a stray outline, while the three dashes
    still read as an impact mark next to the paw.
    """
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    src, dst = img.load(), out.load()
    for comp in _components(img):
        if len(comp) <= DASH_MAX_AREA:
            for x, y in comp:
                dst[x, y] = src[x, y]
    return out


def alpha_centroid(img: Image.Image) -> tuple[float, float]:
    """Alpha-weighted centroid of a sprite, in its own pixels."""
    total = 0.0
    sx = sy = 0.0
    for y in range(img.height):
        for x in range(img.width):
            a = img.getpixel((x, y))[3]
            total += a
            sx += a * x
            sy += a * y
    if total == 0:
        return (img.width / 2, img.height / 2)
    return (sx / total, sy / total)


def rotate_about(img: Image.Image, angle_deg: float, pivot: tuple[float, float]):
    """Rotate img visually counter-clockwise around pivot (img pixels).

    Uses an explicit affine map instead of Image.rotate(expand=True): where
    the pivot lands in the output is part of the contract here, and PIL's
    expand offset conventions are not. Returns (image, forward) where
    forward(point) maps an input pixel to its output position.
    """
    th = math.radians(angle_deg)
    w, h = img.size
    size = int(math.ceil(math.hypot(w, h))) + 4
    origin = (size / 2, size / 2)
    center = (w / 2, h / 2)
    cos_t, sin_t = math.cos(th), math.sin(th)
    # output q -> input p: p = center + R^-1 (q - origin),
    # R = [[cos, sin], [-sin, cos]] (counter-clockwise in y-down coords).
    coeffs = (
        cos_t, -sin_t, center[0] - (cos_t * origin[0] - sin_t * origin[1]),
        sin_t, cos_t, center[1] - (sin_t * origin[0] + cos_t * origin[1]),
    )
    out = img.transform((size, size), Image.AFFINE, coeffs, resample=Image.BICUBIC)

    def forward(point: tuple[float, float]) -> tuple[float, float]:
        rel = (point[0] - center[0], point[1] - center[1])
        return (
            origin[0] + cos_t * rel[0] + sin_t * rel[1],
            origin[1] - sin_t * rel[0] + cos_t * rel[1],
        )

    return out, forward


def compose(
    sprites: dict[str, tuple[Image.Image, tuple[float, float, float, float]]],
    skin: str,
    scale: int,
    with_drums: bool = False,
) -> dict[str, Image.Image]:
    parts = dict(sprites)
    if not with_drums:
        # Only the small strokes; the arc needs a drum behind it to make sense.
        parts["Dashes"] = (impact_dashes(sprites["CatRightPunch"][0]), sprites["CatRightPunch"][1])

    def art(key: str):
        img, (rx, ry, rw, rh) = parts[key]
        img = img.resize((img.width * scale, img.height * scale), Image.LANCZOS)
        origin = ORIGIN_BOX.get(key, ORIGIN["paw"])
        if key in ("CatRight", "CatRightPunch", "Dashes"):
            origin = ORIGIN["paw_drum"] if with_drums else ORIGIN["paw"]
        x = origin[0] + rx
        y = origin[1] + (256 - ry - rh)
        return img, x * scale, y * scale

    def swing(canvas: Image.Image) -> None:
        """Right hit: press the paw down beside the face, dashes at its right.

        The game swings the paw NODE at runtime — <Skin>RightPunch is only the
        impact effect — so the down pose has to be produced here. A mild swing
        plus a straight downward press keeps the paw in place (matching the
        game's own counter shot), with the wrist still inside the body's
        overlap so nothing detaches.
        """
        paw_img, (rx, ry, rw, rh) = parts["CatRight"]
        big = paw_img.resize((paw_img.width * scale, paw_img.height * scale), Image.LANCZOS)
        base = (ORIGIN["paw"][0] + rx, ORIGIN["paw"][1] + (256 - ry - rh))
        pivot = (rw * 0.45 * scale, rh * 0.92 * scale)
        swung, forward = rotate_about(big, PAW_SWING_DEG, pivot)
        where = forward(pivot)
        target = (
            (base[0] + rw * 0.45 + PAW_PRESS[0]) * scale,
            (base[1] + rh * 0.92 + PAW_PRESS[1]) * scale,
        )
        canvas.alpha_composite(swung, (int(round(target[0] - where[0])), int(round(target[1] - where[1]))))
        # dashes sit to the paw's right, at pad height
        center_out = forward((rw * 0.5 * scale, rh * 0.5 * scale))
        paw_center = (target[0] - where[0] + center_out[0], target[1] - where[1] + center_out[1])
        dash_img, _ = parts["Dashes"]
        dash_big = dash_img.resize((dash_img.width * scale, dash_img.height * scale), Image.LANCZOS)
        cx, cy = alpha_centroid(dash_img)
        dash_pos = (
            paw_center[0] + DASH_FROM_PAW[0] * scale - cx * scale,
            paw_center[1] + DASH_FROM_PAW[1] * scale - cy * scale,
        )
        canvas.alpha_composite(dash_big, (int(round(dash_pos[0])), int(round(dash_pos[1]))))

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

        if with_drums:
            img, x, y = art("CatRightPunch" if right_punch else "CatRight")
            canvas.alpha_composite(img, (int(x), int(y)))
        elif right_punch:
            swing(canvas)
        else:
            img, x, y = art("CatRight")
            canvas.alpha_composite(img, (int(x), int(y)))
        return canvas

    frames = {
        "idle": frame("CatLeft", False),
        "tap-left": frame("CatLeftPunch", False),
        "tap-right": frame("CatLeft", True),
    }
    if with_drums:
        return frames
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
    return cropped


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


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract original Bongo Cat frames for dsh-plugin-bongo-cat")
    parser.add_argument("--out", help="output directory (plugin native storage)")
    parser.add_argument("--game", help="Bongo Cat install directory")
    parser.add_argument("--skin", default="Cat", help="skin name (see --list; the game ships 244 skins)")
    parser.add_argument("--scale", type=int, default=3, help="pixel scale (default 3)")
    parser.add_argument("--list", action="store_true", help="list installed skins and exit")
    parser.add_argument("--with-drums", action="store_true", help="include the bongo drums (default: cat only)")
    parser.add_argument("--catalog", action="store_true", help="export skin icons + skins.json and exit")
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

    frames = compose(sprites, skin, max(1, min(6, args.scale)), with_drums=args.with_drums)

    # sanity: the cat must occupy the middle band of the frame
    idle = frames["idle"]
    w, h = idle.size
    face = idle.crop((int(w*0.35), int(h*0.15), int(w*0.65), int(h*0.55)))
    if face.getbbox() is None:
        raise SystemExit("composition sanity check failed: no cat art in the middle band")

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    for name, image in frames.items():
        image.save(out / f"{name}.png")

    meta = {
        "source": "steam-bongo-cat",
        "appId": APP_ID,
        "skin": skin,
        "scale": max(1, min(6, args.scale)),
        "drums": bool(args.with_drums),
        "frames": {name: f"{name}.png" for name in frames},
        "size": list(frames["idle"].size),
        "gameDir": str(game),
        "extractedAt": __import__("datetime").datetime.now().isoformat(timespec="seconds"),
    }
    (out / "native.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"ok": True, **meta}, ensure_ascii=False))


if __name__ == "__main__":
    main()
