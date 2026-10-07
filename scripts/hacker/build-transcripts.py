#!/usr/bin/env python3
"""Build Hacker Listening transcripts from the source "LISTENING TRANSCRIPT" PDF.

Unlike YBM's photographed script books, Hacker's script PDF has a real text
layer, so this extracts it instead of reading page images. Output is one
allinone/src/data/hacker/transcripts/<test-id>.json per test, in the same
{ testId, entries: [{ from, to, lines }] } shape as YBM's transcripts (see
allinone/src/data/hacker/transcripts/AGENTS.md for the schema and conventions).

Usage:
  python3 scripts/hacker/build-transcripts.py                 # Vol 2, all 10 tests -> the data dir
  python3 scripts/hacker/build-transcripts.py --out /tmp/x 3  # one test, elsewhere (dry run)

Needs `pdftotext` (poppler) and nothing else. Verified on Vol 2 only: the page
template (a "TEST NN Answer Keys" page opens each 6-page block, two columns,
accent icons as Korean "미국식 발음 → 호주식 발음") is what the parser relies on,
so check another volume's PDF before trusting it there.
"""
import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import unicodedata
import xml.etree.ElementTree as ET

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
DEFAULT_PDF = '/Volumes/Samsung_T5/Download/Hacker/Bộ đề 1 (HACKER 2)/HACKER 2 LISTENING TRANSCRIPT.pdf'
DEFAULT_OUT = os.path.join(ROOT, 'allinone/src/data/hacker/transcripts')
H = '{http://www.w3.org/1999/xhtml}'

# The accent icon above each item names the speaker's accent, in speaker order.
ACCENT = {'미국식': 'Am', '영국식': 'Br', '호주식': 'Au', '캐나다식': 'Cn'}
HANGUL = re.compile(r'[\uac00-\ud7a3]')
warnings = []
review = []


def warn(test, msg):
    warnings.append(f'test {test:02d}: {msg}')


def load_pages(pdf):
    """pdftotext -bbox-layout gives every line with its coordinates, which is what
    lets us read the two columns in order (plain pdftotext scrambles them)."""
    with tempfile.NamedTemporaryFile(suffix='.html', delete=False) as tmp:
        path = tmp.name
    try:
        subprocess.run(['pdftotext', '-bbox-layout', pdf, path], check=True)
        raw = open(path, encoding='utf8').read()
    finally:
        os.unlink(path)
    raw = re.sub(r'<!DOCTYPE[^>]*>', '', raw)
    raw = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', raw)  # the text layer contains stray BELs
    return ET.fromstring(raw).findall('.//' + H + 'page')


def page_text(page):
    return ' '.join((w.text or '') for w in page.iter(H + 'word'))


def test_blocks(pages):
    """test number -> (first page, last page), 1-indexed. A test's block opens with
    its answer-key page — "TEST NN Answer Keys" in Vol 2, a page that simply starts
    with "TEST NN" in Vol 3 — and runs to the page before the next one."""
    starts = {}
    for i, page in enumerate(pages, 1):
        text = page_text(page)
        m = re.search(r'TEST\s+(\d{2})\s+Answer\s+Keys', text) or re.match(r'\s*TEST\s+(\d{2})\b', text)
        if m and int(m.group(1)) not in starts:
            starts[int(m.group(1))] = i
    order = sorted(starts)
    blocks = {}
    for k, n in enumerate(order):
        end = starts[order[k + 1]] - 1 if k + 1 < len(order) else len(pages)
        blocks[n] = (starts[n], end)
    return blocks


def page_lines(page):
    """Noise-filtered lines of one page: left column then right column, top to bottom."""
    out = []
    for ln in page.iter(H + 'line'):
        x, y = float(ln.get('xMin')), float(ln.get('yMin'))
        text = ' '.join((w.text or '') for w in ln.iter(H + 'word'))
        if x >= 560 or y >= 760 or y < 52:
            continue  # sidebar test index, footer, running header
        if HANGUL.search(text) and '발음' not in text:
            continue  # copyright blurb, labels
        out.append((0 if x < 300 else 1, y, x, text))
    out.sort(key=lambda r: (r[0], r[1], r[2]))
    return [(x, t) for _, _, x, t in out]


# One phrase in Vol 3 test 3 (Q44-46) is printed letter-spaced, so the text layer puts a
# space between every letter and the word breaks are lost. Confirmed against OCR of the
# page; any other such run is reported by the check in parse_test().
SPACED_FIXES = {
    's h o u l d i n c l u d e m o r e d e t a i l s a b o u t t h e': 'should include more details about the',
}
LETTER_SPACED = re.compile(r"(?<![A-Za-z'(])(?:[A-Za-z] ){4,}[A-Za-z](?![A-Za-z'])")


def clean(s):
    for bad, good in SPACED_FIXES.items():
        s = s.replace(bad, good)
    s = unicodedata.normalize('NFC', s)  # the text layer sometimes decomposes é into e + U+0301
    s = s.replace('\t', ' ')
    s = s.replace('\u2019', "'").replace('\u2018', "'").replace('\u201c', '"').replace('\u201d', '"')
    s = re.sub(r'\.\s\.\s\.', '...', s)
    # Small-cap A.M./P.M. come through as "p . m ." — the book prints them as capitals.
    s = re.sub(r'\b([apAP]) \. [mM] \.', lambda m: m.group(1).upper() + '.M.', s)
    # Kerning splits a repeated capital: "T T Radio" is printed "TT Radio".
    s = re.sub(r"(?<![A-Za-z'(])([A-Z]) ([A-Z])(?![A-Za-z'])", r'\1\2', s)
    s = re.sub(r'\s+', ' ', s).strip()
    # An italic title can leave a gap before the punctuation: "Herald ? It" -> "Herald? It".
    return re.sub(r'(?<=[A-Za-z0-9]) ([?!,;])(?=\s|$)', r'\1', s)


def join(parts):
    """Join wrapped lines; a line ending in a hyphen glues to the next without a space."""
    out = ''
    for p in parts:
        p = p.strip()
        if not p:
            continue
        if out and out.endswith('-') and p[:1].islower():
            out += p
        else:
            out = (out + ' ' + p) if out else p
    return out


def accents_of(text):
    return [ACCENT[w] for w in re.findall(r'(미국식|영국식|호주식|캐나다식)', text)]


# The first letter of a turn is sometimes split from its word ("W:\tH ello", "O h, no!").
# Any letter but A and I can only be an artifact. "A"/"I" are real words, so those were
# decided by hand across all twenty Vol 2-3 tests: seven "A <fragment>" openings are split words;
# every "I <word>" is a pronoun. Unreviewed "A <word>" openings are listed for a look.
SPLIT_A = ('bsolutely', 'lso', 'bout', 'n', 'ctually', 're', 'll')


def fix_split_first(text, test, q):
    m = re.match(r'^([A-Z]) ([a-z][^\s]*)(.*)$', text)
    if not m:
        return text
    letter, rest, tail = m.groups()
    if letter == 'A':
        if re.sub(r'[^a-z]', '', rest) in SPLIT_A:
            return letter + rest + tail
        review.append((test, q, text[:50]))
        return text
    if letter == 'I':
        return text
    return letter + rest + tail


def parse_test(n, lines_stream, vol):
    items = {}      # Part 1/2: number -> item
    groups = []     # Part 3/4 question groups
    part = None
    cur = None
    grp = None
    awaiting_accent = False

    for x, text in lines_stream:
        t = text.strip()
        m_part = re.fullmatch(r'PART ([1-4])', t)
        if m_part:
            part = int(m_part.group(1)); cur = None; grp = None
            continue
        if part is None:
            continue  # the answer-key grid before PART 1

        m_hdr = re.match(r'^Questions?\s+(\d+)\s*-\s*(\d+)\s+refer', t)  # one test prints "Question 92-94"
        if m_hdr:
            part = 3 if int(m_hdr.group(1)) < 71 else 4
            grp = {'from': int(m_hdr.group(1)), 'to': int(m_hdr.group(2)), 'accents': [], 'turns': [], 'text': []}
            groups.append(grp); cur = None; awaiting_accent = True
            continue

        if part in (1, 2):
            if re.fullmatch(r'\d{1,2}', t) and (x <= 80 or 300 <= x <= 320):
                cur = {'num': int(t), 'accents': [], 'q': [], 'choices': []}
                items[cur['num']] = cur
                continue
            if cur is None:
                continue
            if '발음' in t:
                cur['accents'] = accents_of(t); continue
            m = re.match(r'^\(([A-D])\)\s*(.*)$', t)
            if m:
                cur['choices'].append([m.group(1), [m.group(2)]]); continue
            (cur['choices'][-1][1] if cur['choices'] else cur['q']).append(t)
        else:
            if grp is None:
                continue
            if '발음' in t:
                grp['accents'] = accents_of(t); awaiting_accent = False; continue
            if awaiting_accent:
                continue  # wrapped tail of the "Questions X-Y refer to ..." header
            m = re.match(r'^([MW]\d?):\s*(.*)$', t)
            if m:
                grp['turns'].append([m.group(1), [m.group(2)]]); continue
            (grp['turns'][-1][1] if grp['turns'] else grp['text']).append(t)

    entries = []
    # ---- Part 1 (photos) and Part 2 (question-response) ----------------------
    for q in range(1, 32):
        it = items.get(q)
        if not it:
            warn(n, f'Q{q} missing'); continue
        ch = [(l, clean(join(parts))) for l, parts in it['choices']]
        if q <= 6:
            if [l for l, _ in ch] != list('ABCD'):
                warn(n, f'Q{q} choices {[l for l, _ in ch]}')
            lines = [f'({l}) {txt}' for l, txt in ch]
        else:
            if [l for l, _ in ch] != list('ABC'):
                warn(n, f'Q{q} choices {[l for l, _ in ch]}')
            acc = it['accents']
            if len(acc) != 2:
                warn(n, f'Q{q} accents {acc}')
                acc = (acc + ['??', '??'])[:2]
            lines = [f"{acc[0]}|{clean(join(it['q']))}"]
            for i, (l, txt) in enumerate(ch):
                lines.append(f'{acc[1]}|({l}) {txt}' if i == 0 else f'({l}) {txt}')
        entries.append({'from': q, 'to': q, 'lines': lines})

    # ---- Part 3 (conversations) and Part 4 (talks) ---------------------------
    want = [(a, a + 2) for a in range(32, 100, 3)]
    got = [(g['from'], g['to']) for g in groups]
    if got != want:
        warn(n, f'group ranges differ: missing {[w for w in want if w not in got]} extra {[g for g in got if g not in want]}')
    for g in groups:
        if g['from'] < 71:
            labels = []
            for lab, _ in g['turns']:
                if lab not in labels:
                    labels.append(lab)
            if len(labels) != len(g['accents']):
                warn(n, f"Q{g['from']} labels {labels} vs accents {g['accents']}")
            # Accents are listed in order of first appearance: M, W1, W2 -> Au, Br, Am.
            tag = {lab: f"{lab[0]}-{g['accents'][i] if i < len(g['accents']) else '??'}" for i, lab in enumerate(labels)}
            lines = [f"{tag[lab]}|{fix_split_first(clean(join(parts)), n, g['from'])}" for lab, parts in g['turns']]
            if len(lines) < 2:
                warn(n, f"Q{g['from']} only {len(lines)} turns")
        else:
            if len(g['accents']) != 1:
                warn(n, f"Q{g['from']} talk accents {g['accents']}")
            acc = g['accents'][0] if g['accents'] else '??'
            lines = [f"{acc}|{clean(join(g['text']))}"]
            if len(lines[0]) < 40:
                warn(n, f"Q{g['from']} talk looks short: {lines[0]}")
        entries.append({'from': g['from'], 'to': g['to'], 'lines': lines})

    entries.sort(key=lambda e: e['from'])
    covered = [q for e in entries for q in range(e['from'], e['to'] + 1)]
    if covered != list(range(1, 101)):
        warn(n, f'entries do not tile 1-100 ({len(covered)} covered)')
    if len(entries) != 54:
        warn(n, f'{len(entries)} entries (want 54)')
    if any('??' in l for e in entries for l in e['lines']):
        warn(n, 'an accent could not be read (??)')
    for e in entries:
        for l in e['lines']:
            m = LETTER_SPACED.search(l)
            if m:
                warn(n, f"Q{e['from']} has a letter-spaced run, add it to SPACED_FIXES: {m.group(0)!r}")
    return {'testId': f'vol-{vol}-test-{n:02d}', 'entries': entries}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('tests', nargs='*', type=int, help='test numbers (default: every test found)')
    ap.add_argument('--pdf', default=DEFAULT_PDF)
    ap.add_argument('--vol', type=int, default=2)
    ap.add_argument('--out', default=DEFAULT_OUT)
    args = ap.parse_args()

    pages = load_pages(args.pdf)
    blocks = test_blocks(pages)
    if not blocks:
        sys.exit('no "TEST NN Answer Keys" pages found — is this the Listening transcript PDF?')
    which = args.tests or sorted(blocks)
    os.makedirs(args.out, exist_ok=True)
    for n in which:
        first, last = blocks[n]
        stream = []
        for p in range(first, last + 1):
            stream += page_lines(pages[p - 1])
        data = parse_test(n, stream, args.vol)
        with open(os.path.join(args.out, f"vol-{args.vol}-test-{n:02d}.json"), 'w', encoding='utf8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write('\n')
        print(f'test {n:02d}: pages {first}-{last}, {len(data["entries"])} entries')

    if review:
        print(f'\n{len(review)} turn(s) open with "A <word>" and were left as the article — glance at them:')
        for r in review:
            print('  ', r)
    if warnings:
        print(f'\n{len(warnings)} WARNING(S):')
        for w in warnings:
            print('  ', w)
        sys.exit(1)
    print('\nno warnings')


if __name__ == '__main__':
    main()
