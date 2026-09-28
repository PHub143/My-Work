#!/usr/bin/env python3
"""Cross-check YBM test data against the scanned pages themselves (needs tesseract, Pillow, numpy).

The audit (audit-ybm.mjs) proves the layers agree with each other; this proves they agree with the
*book*. It caught two real defects the audit could not see: Vol 1 listening keys read from the wrong
edition, and Test 4's Part 3 sets renumbered out of order in the content file.

  python3 .claude/skills/toeic-maker/scripts/verify-vs-pages.py keys      [all|vol-1|vol-1-test-04]
  python3 .claude/skills/toeic-maker/scripts/verify-vs-pages.py numbering [all|vol-N|vol-N-test-MM]
  add  --content FILE  to check a different content JSON than the committed one (single test only)

keys       Vol 1 only. Reads the correct choice the book prints in RED on each script page (sc-pNN.jpg),
           matches its text against the known choice texts (transcripts for Parts 1-2, content for Parts
           3-4) and compares the resulting letter with the committed listening key.
             confirmed   red answer == key
             CONFLICT    red answer != key  -> wrong key, OR content/transcript numbering is off
             no evidence OCR did not reach it (not a problem by itself)
numbering  Any volume with local lc-/rc- page images. OCRs the booklet pages and checks that each content
           question's text is printed next to the number the content file gives it. A misnumbered SET
           shows up as a run of consecutive questions all shifted by the same offset.
             LIKELY      >= 3 consecutive questions, same offset that is a multiple of 3 (not of 10)
             possible    everything else - usually OCR noise (4 read as 1, 8 as 3, near-duplicate stems)
           Look at the page before believing a "possible".

Exit code 1 only for keys CONFLICTs and numbering LIKELY runs.
Needs the gitignored page images: regenerate with scripts/ybm/render-pages.mjs if they are missing.
"""
import argparse
import difflib
import glob
import io
import json
import os
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.."))
DATA = f"{ROOT}/allinone/src/data/ybm"
PUB = f"{ROOT}/allinone/public/ybm"
norm = lambda s: re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", s.lower())).strip()


def ocr(img, psm):
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    out = subprocess.run(["tesseract", "stdin", "stdout", "--psm", str(psm)], input=buf.getvalue(), capture_output=True)
    return out.stdout.decode("utf-8", errors="replace")


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def test_ids(target):
    ids = [os.path.basename(p)[:-5] for p in sorted(glob.glob(f"{DATA}/content/vol-*-test-*.json"))]
    if target in ("all", None):
        return ids
    if re.fullmatch(r"vol-\d+", target):
        return [i for i in ids if i.startswith(target + "-")]
    return [i for i in ids if i == target]


# ---------------------------------------------------------------- keys ----

def choice_candidates(tid, content):
    """(question, letter, normalized text) for every choice we can match a red line against."""
    out = []
    tr = load(f"{DATA}/transcripts/{tid}.json")
    for e in tr["entries"]:
        if e["to"] > 31:
            continue
        for line in e["lines"]:
            text = re.sub(r"^[A-Za-z]{1,3}(?:-[A-Za-z]{2,3})?\|", "", line)
            m = re.match(r"^\(([A-D])\)\s*(.*)$", text)
            if m:
                out.append((e["from"], m.group(1), norm(m.group(2))))
    for part in ("3", "4"):
        for it in content["parts"][part]["items"]:
            for letter, text in it["choices"].items():
                out.append((it["number"], letter, norm(text)))
    return out


def red_lines(path):
    im = np.asarray(Image.open(path).convert("RGB")).astype(int)
    R, G, B = im[..., 0], im[..., 1], im[..., 2]
    redness = R - (G + B) / 2                            # the answer red is a muted rose; black text scores ~0
    threshold = min(35, max(20, 0.5 * np.percentile(redness, 99.8)))   # some scans print the red much fainter
    mask = (R > 130) & (redness > threshold)
    img = Image.fromarray(np.where(mask, 0, 255).astype("uint8"))
    lines = []
    for x0, x1 in ((0, int(img.width * 0.52)), (int(img.width * 0.48), img.width)):   # two columns per page
        half = img.crop((x0, 0, x1, img.height)).resize(((x1 - x0) * 4, img.height * 4), Image.LANCZOS)
        lines += [l.strip() for l in ocr(half, 6).splitlines() if len(l.strip()) >= 6]
    return lines


def verify_keys(tid, content_file):
    if not tid.startswith("vol-1-"):
        return None, f"{tid}: keys check needs script pages + transcripts (Vol 1 only) - skipped"
    pages = sorted(glob.glob(f"{PUB}/{tid}/sc-p*.jpg"))
    if not pages:
        return None, f"{tid}: no local sc-pNN.jpg script pages - render them with render-pages.mjs --script-only"
    key = load(f"{DATA}/keys/{tid}.json")["listening"]
    cands = choice_candidates(tid, load(content_file or f"{DATA}/content/{tid}.json"))
    with ThreadPoolExecutor(8) as pool:
        per_page = list(pool.map(red_lines, pages))
    evidence = {}
    for page, lines in zip(pages, per_page):
        for line in lines + [lines[i] + " " + lines[i + 1] for i in range(len(lines) - 1)]:   # wrapped choices
            # OCR garbles the "(B)" marker ("iB)", "{B}") - read the letter from it, then drop it before matching text
            marker = re.match(r"^\W{0,2}[il|!]?\s*[\(\[\{]?\s*([A-D])\s*[\)\]\}]", line)
            text = norm(re.sub(r"^.{0,5}?[\)\]\}]\s*", "", line)) if marker else norm(line)
            if len(text) < 6:
                continue
            hits = sorted(((difflib.SequenceMatcher(None, text, c).ratio(), q, l) for q, l, c in cands if c), reverse=True)
            hits = [h for h in hits if h[0] >= 0.75]
            if not hits:
                continue
            near = [h for h in hits if h[0] >= hits[0][0] - 0.08]
            if marker:                                    # near-identical choices ("October 9"/"October 23"): trust the printed letter
                same_letter = [h for h in near if h[2] == marker.group(1)]
                near = same_letter or near
            top = max(h[0] for h in near)
            for ratio, q, letter in [h for h in near if h[0] >= top - 0.02]:
                evidence.setdefault(q, {}).setdefault(letter, (round(ratio, 2), os.path.basename(page), line))
    confirmed = [q for q in range(1, 101) if q in evidence and set(evidence[q]) == {key[q - 1]}]
    conflicts = [q for q in range(1, 101) if q in evidence and key[q - 1] not in evidence[q]]
    none = [q for q in range(1, 101) if q not in evidence]
    report = [f"{tid}: confirmed {len(confirmed)} | CONFLICT {len(conflicts)} | no evidence {len(none)}"]
    for q in conflicts:
        seen = {l: f"{v[1]} '{v[2][:40]}'" for l, v in evidence[q].items()}
        report.append(f"     Q{q}: key says {key[q - 1]}, the page's red answer is {seen}")
    if conflicts:
        report.append("     -> wrong key, or the content/transcript question numbers are off (compare the booklet page)")
    return len(conflicts), "\n".join(report)


# ----------------------------------------------------------- numbering ----

def booklet_ocr(path):
    im = Image.open(path).convert("L")
    W, H = im.size
    lines = []
    for x0, x1 in ((0, W // 2 + 10), (W // 2 - 10, W)):
        col = im.crop((x0, 0, x1, H))
        col = col.resize((col.width * 2, col.height * 2), Image.LANCZOS)
        lines += [l.strip() for l in ocr(col, 4).splitlines() if l.strip()]
    return os.path.basename(path), lines


def signature(item):
    return item["stem"] if item.get("stem") else " ".join(f"({k}) {v}" for k, v in item["choices"].items())


def shifted_runs(mismatches):
    runs, cur = [], []
    for m in sorted(mismatches):
        if cur and m[0] == cur[-1][0] + 1 and abs(m[2] - cur[-1][2]) <= 1:
            cur.append(m)
        else:
            if len(cur) >= 2:
                runs.append(cur)
            cur = [m]
    if len(cur) >= 2:
        runs.append(cur)
    return runs


def verify_numbering(tid, content_file):
    pages = sorted(glob.glob(f"{PUB}/{tid}/lc-p*.jpg") + glob.glob(f"{PUB}/{tid}/rc-p*.jpg"))
    pages = [p for p in pages if not os.path.basename(p).startswith(("lc-p01", "lc-p02", "rc-p01"))]
    if not pages:
        return None, f"{tid}: no local lc-/rc- page images - render them with render-pages.mjs"
    with ThreadPoolExecutor(8) as pool:
        ocr_pages = list(pool.map(booklet_ocr, pages))
    printed = []                                                    # (number, text, page)
    for page, lines in ocr_pages:
        for i, line in enumerate(lines):
            m = re.match(r"^(\d{2,3})\s*[\.\,\-:]\s*(\S.*)$", line)
            if m:
                printed.append((int(m.group(1)), norm(m.group(2) + " " + (lines[i + 1] if i + 1 < len(lines) else ""))[:60], page))
    content = load(content_file or f"{DATA}/content/{tid}.json")
    ok, unmatched, mismatches = 0, 0, []
    for key, part in content["parts"].items():
        if key == "2":
            continue                                                # 25 identical "Mark your answer" lines
        items = part["items"] if "items" in part else [it for s in part["sets"] for it in s["items"]]
        for it in items:
            sig = norm(signature(it))[:60]
            if len(sig) < 8:
                continue
            hits = []
            for num, text, page in printed:
                k = min(len(sig), len(text), 45)
                if k and difflib.SequenceMatcher(None, sig[:k], text[:k]).ratio() >= 0.8:
                    hits.append((num, page))
            if not hits:
                unmatched += 1
            elif any(num % 100 == it["number"] % 100 for num, _ in hits):   # tolerate a dropped/garbled leading digit
                ok += 1
            else:
                num, page = hits[0]
                mismatches.append((it["number"], num, ((num - it["number"] + 50) % 100) - 50, page))
    runs = shifted_runs(mismatches)
    likely = [r for r in runs if len(r) >= 3 and sorted(m[2] for m in r)[len(r) // 2] % 3 == 0 and sorted(m[2] for m in r)[len(r) // 2] % 10 != 0]
    report = [f"{tid}: verified {ok} | unmatched {unmatched} | shifted runs: LIKELY {len(likely)}, possible {len(runs) - len(likely)}"]
    for r in runs:
        tag = "LIKELY  " if r in likely else "possible"
        report.append(f"     {tag} Q{r[0][0]}-Q{r[-1][0]} printed as {[m[1] for m in r]} (offsets {[m[2] for m in r]}) on {r[0][3]}")
    if likely:
        report.append("     -> a whole set is probably numbered wrongly in the content file: open that page and compare")
    return len(likely), "\n".join(report)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("mode", choices=["keys", "numbering"])
    ap.add_argument("target", nargs="?", default="all")
    ap.add_argument("--content", help="use this content JSON instead of the committed one (single test)")
    args = ap.parse_args()
    ids = test_ids(args.target)
    if not ids:
        sys.exit(f"no test matches {args.target!r}")
    if args.content and len(ids) != 1:
        sys.exit("--content needs a single test id")
    worst = 0
    for tid in ids:
        count, text = (verify_keys if args.mode == "keys" else verify_numbering)(tid, args.content)
        print(text)
        if count:
            worst = 1
    sys.exit(worst)


if __name__ == "__main__":
    main()
