"""
Genera deliverables/SUBTITULOS.srt a partir de src/timing.json.
Líneas de ≤ 38 caracteres, máximo 2 líneas por subtítulo, sin solapes.
Uso: python3 scripts/make_srt.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAXC = 38


def ts(s):
    ms = int(round(s * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    sec, ms = divmod(ms, 1000)
    return f'{h:02}:{m:02}:{sec:02},{ms:03}'


def balanced(text):
    """1 o 2 líneas equilibradas de ≤ MAXC caracteres."""
    if len(text) <= MAXC:
        return [text]
    words = text.split()
    best = None
    for i in range(1, len(words)):
        a, b = ' '.join(words[:i]), ' '.join(words[i:])
        if len(a) <= MAXC and len(b) <= MAXC:
            score = abs(len(a) - len(b))
            if best is None or score < best[0]:
                best = (score, [a, b])
    return best[1] if best else [text]


def split_block(text):
    """Divide en dos bloques por puntuación cercana al centro, o por la palabra central."""
    mid = len(text) / 2
    cands = [i + 1 for i, ch in enumerate(text) if ch in ',:;' and abs(i - mid) < len(text) * 0.2]
    if cands:
        k = min(cands, key=lambda i: abs(i - mid))
    else:
        spaces = [i for i, ch in enumerate(text) if ch == ' ']
        k = min(spaces, key=lambda i: abs(i - mid))
    return [text[:k].strip(), text[k:].strip()]


def chunks(phrase):
    """Bloques de ≤ 2 líneas; el tiempo se reparte en proporción a los caracteres."""
    text = phrase['text']
    blocks = [text] if len(balanced(text)) <= 2 and all(len(l) <= MAXC for l in balanced(text)) else split_block(text)
    total = sum(len(b) for b in blocks)
    t, out = phrase['start'], []
    dur = phrase['end'] - phrase['start']
    for b in blocks:
        d = dur * len(b) / total
        out.append((t, t + d, '\n'.join(balanced(b))))
        t += d
    return out


def main():
    tm = json.load(open(os.path.join(ROOT, 'src/timing.json'), encoding='utf-8'))
    items = []
    for p in tm['phrases']:
        items.extend(chunks(p))
    # extender cada subtítulo hasta 0,25 s antes del siguiente para lectura cómoda
    srt = []
    for i, (a, b, txt) in enumerate(items):
        nxt = items[i + 1][0] if i + 1 < len(items) else b + 1.5
        b = min(max(b + 0.35, a + 1.0), nxt - 0.05)
        srt.append(f'{i + 1}\n{ts(a)} --> {ts(b)}\n{txt}\n')
    out = os.path.join(ROOT, 'deliverables/SUBTITULOS.srt')
    with open(out, 'w', encoding='utf-8') as f:
        f.write('\n'.join(srt))
    print(open(out, encoding='utf-8').read())


if __name__ == '__main__':
    main()
