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

# canvas + per-part box origins, in unscaled sprite pixels
CANVAS = (340, 250)
ORIGIN = {
    "cat": (40, -55),
    "paw": (57, -30),
    "bongo_left": (25, 55),
    "bongo_right": (62, 55),
}
DRUMS = ("DefaultBongoLeft", "DefaultBongoRight")

# How far the right paw drops on a tap when no drum hides it (sprite pixels).
PAW_DROP = 8


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
    def art(key: str):
        img, (rx, ry, rw, rh) = sprites[key]
        img = img.resize((img.width * scale, img.height * scale), Image.LANCZOS)
        # The right paw keeps its authored origin in both modes: in the game it
        # rests on the drum, and without the drum the same spot reads as the paw
        # resting at the body's lower-right edge.
        x = ORIGIN_BOX[key][0] + rx
        y = ORIGIN_BOX[key][1] + (256 - ry - rh)
        return img, x * scale, y * scale

    def bbox(img):
        return img.getbbox() or (0, 0, img.width, img.height)

    w, h = CANVAS[0] * scale, CANVAS[1] * scale

    def frame(cat_key: str, paw_key: str, left_punch: bool, right_punch: bool) -> Image.Image:
        canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        # drums first (they sit behind the paws), punch variants aligned by base
        if with_drums:
            for side, idle_key, punch_key, punch in (
                ("bongo_left", "BongoL", "BongoLP", left_punch),
                ("bongo_right", "BongoR", "BongoRP", right_punch),
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
            img, x, y = art(paw_key)
            canvas.alpha_composite(img, (int(x), int(y)))
        else:
            # Mirror the left paw: same height, resting at the body's right edge.
            paw, px, py = art("CatRight")
            if right_punch:
                py += PAW_DROP * scale
            canvas.alpha_composite(paw, (int(px), int(py)))
        return canvas

    frames = {
        "idle": frame("CatLeft", "CatRight", False, False),
        "tap-left": frame("CatLeftPunch", "CatRight", True, False),
        "tap-right": frame("CatLeft", "CatRightPunch", False, True),
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


# box origin lookup keyed by the internal keys used by art()
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
