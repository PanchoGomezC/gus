"""
Banda sonora original + diseño sonoro + mezcla — 100 % procedural y reproducible.

Lee build/cues.json (mismo timeline que la animación) y la locución, y exporta
a public/assets/audio/:
  music.wav      música original (cama electrónica minimalista, 108 BPM, Re mayor)
  sfx.wav        efectos sincronizados con cada transformación visual
  vo.wav         locución procesada (HPF + nivel)
  mix_master.wav mezcla final (antes de normalizar loudness con FFmpeg)
y los stems a deliverables/stems/.

Uso: python scripts/audio_design.py --vo public/assets/audio/vo_guide.wav
"""
import argparse
import json
import os

import numpy as np
import soundfile as sf
from scipy.signal import butter, fftconvolve, resample_poly, sosfilt

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RNG = np.random.default_rng(20260)

# ------------------------------------------------------------------ utilidades


def secs(n):
    return np.arange(int(n * SR)) / SR


def hz(note):
    """'D4' → Hz (A4 = 440)."""
    names = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
    n, o = note[:-1], int(note[-1])
    return 440.0 * 2 ** ((names[n] + 12 * (o + 1) - 69) / 12)


def lp(x, f, order=2):
    return sosfilt(butter(order, min(f, SR * 0.45), 'low', fs=SR, output='sos'), x, axis=0)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x, axis=0)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, min(hi, SR * 0.45)], 'band', fs=SR, output='sos'), x, axis=0)


def pan(mono, p):
    """p ∈ [-1, 1], equal power."""
    a = (p + 1) * np.pi / 4
    return np.stack([mono * np.cos(a), mono * np.sin(a)], axis=1)


class Bus:
    def __init__(self, dur):
        self.x = np.zeros((int(dur * SR), 2))

    def add(self, t, sig, gain=1.0):
        if sig.ndim == 1:
            sig = pan(sig, 0)
        i = int(round(t * SR))
        if i < 0:
            sig = sig[-i:]
            i = 0
        j = min(len(self.x), i + len(sig))
        if j > i:
            self.x[i:j] += sig[: j - i] * gain


def adsr(n, a, d, s, r, sustain_len=None):
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    hold = n - a_n - d_n - r_n if sustain_len is None else int(sustain_len * SR)
    hold = max(0, hold)
    env = np.concatenate([
        np.linspace(0, 1, max(1, a_n)) ** 2,
        np.linspace(1, s, max(1, d_n)),
        np.full(hold, s),
        np.linspace(s, 0, max(1, r_n)) ** 1.5,
    ])
    return np.pad(env, (0, max(0, n - len(env))))[:n]


def make_ir(rt60=2.6, pre=0.022, damp=5200):
    n = int((rt60 + pre) * SR)
    t = np.arange(n) / SR
    decay = np.exp(-6.9 * np.maximum(0, t - pre) / rt60) * (t >= pre)
    ir = RNG.standard_normal((n, 2)) * decay[:, None]
    ir = lp(ir, damp)
    ir[:, 1] = np.roll(ir[:, 1], 37)
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


IR = make_ir()
IR_SHORT = make_ir(1.1, 0.012, 7000)


def reverb(x, wet=0.25, ir=None):
    ir = IR if ir is None else ir
    y = np.stack([fftconvolve(x[:, k], ir[:, k])[: len(x)] for k in range(2)], axis=1)
    return x * (1 - wet) + y * wet


def saw_add(f, t, harmonics=10):
    y = np.zeros_like(t)
    for k in range(1, harmonics + 1):
        if f * k > 16000:
            break
        y += np.sin(2 * np.pi * f * k * t + k * 0.7) / k
    return y


# ------------------------------------------------------------------ instrumentos


def pad_chord(notes, dur, bright=1800, a=0.9, r=1.4, gain=1.0):
    t = secs(dur + r)
    out = np.zeros((len(t), 2))
    for i, nte in enumerate(notes):
        f = hz(nte)
        for det, p in ((-7, -0.55), (0, 0.0), (7, 0.55)):
            ff = f * 2 ** (det / 1200)
            v = saw_add(ff, t + RNG.random(), 8) * 0.33
            out += pan(v, p * (0.6 + 0.4 * (i % 2)))
    out = hp(lp(out, bright, 2), 90, 2)  # el subgrave lo aporta el bajo
    env = adsr(len(t), a, 0.6, 0.85, r, sustain_len=max(0, dur - a - 0.6))
    return out * env[:, None] * gain / len(notes)


def sub_note(f, dur, gain=1.0, a=0.05, r=0.5):
    t = secs(dur + r)
    y = np.sin(2 * np.pi * f * t) + 0.18 * np.sin(4 * np.pi * f * t)
    return pan(y * adsr(len(t), a, 0.2, 0.9, r, sustain_len=max(0, dur - a - 0.2)) * gain, 0)


def pluck(f, gain=1.0, decay=0.32, p=0.0, bright=4200):
    t = secs(decay * 4)
    env = np.exp(-t / decay) * (1 - np.exp(-t / 0.003))
    y = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) * np.exp(-t / (decay * 0.4)) + 0.12 * np.sin(6 * np.pi * f * t) * np.exp(-t / (decay * 0.25)))
    return pan(lp(y * env, bright) * gain, p)


def bell(f, gain=1.0, decay=1.2, p=0.0, partials=((1, 1), (2.0, 0.42), (2.76, 0.28), (5.4, 0.12), (8.93, 0.05))):
    t = secs(decay * 4)
    y = np.zeros_like(t)
    for ratio, amp in partials:
        y += amp * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t / (decay / (0.6 + ratio * 0.25)))
    y *= 1 - np.exp(-t / 0.002)
    return pan(y * gain, p)


def kick(gain=1.0, f0=110, f1=46, decay=0.32):
    t = secs(decay * 4)
    f = f1 + (f0 - f1) * np.exp(-t / 0.045)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) * np.exp(-t / decay)
    click = lp(RNG.standard_normal(len(t)) * np.exp(-t / 0.002), 3000) * 0.15
    return pan((y + click) * gain, 0)


def boom(gain=1.0):
    t = secs(4.5)
    f = 38 + 50 * np.exp(-t / 0.12)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) * np.exp(-t / 1.5) * (1 - np.exp(-t / 0.004))
    noise = lp(RNG.standard_normal(len(t)), 220) * np.exp(-t / 0.5) * 0.25
    return pan((y + noise) * gain, 0)


def noise_sweep(dur, f0, f1, gain=1.0, p0=0.0, p1=0.0, shape='swell', q=0.5):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = RNG.standard_normal(n)
    # banda que se desplaza: procesamos por bloques
    out = np.zeros(n)
    blk = 1024
    for i in range(0, n, blk):
        u = i / max(1, n - 1)
        fc = f0 * (f1 / f0) ** u
        lo, hi = fc * (1 - q * 0.5), fc * (1 + q * 0.5)
        seg = x[max(0, i - 256): i + blk]
        y = bp(seg, max(30, lo), hi, 2)[-min(blk, n - i):]
        out[i: i + len(y)] = y
    if shape == 'swell':
        env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.6
    elif shape == 'rise':
        env = (t / dur) ** 2.2 * (1 - np.exp(-(dur - t) / 0.01))
    else:
        env = np.exp(-t / (dur * 0.3))
    ps = np.linspace(p0, p1, n)
    a = (ps + 1) * np.pi / 4
    mono = out * env * gain
    return np.stack([mono * np.cos(a), mono * np.sin(a)], axis=1)


def key_click(gain=1.0, p=0.0):
    t = secs(0.05)
    n = RNG.standard_normal(len(t)) * np.exp(-t / 0.0025)
    body = np.sin(2 * np.pi * (1900 + 400 * RNG.random()) * t) * np.exp(-t / 0.006) * 0.4
    low = np.sin(2 * np.pi * 180 * t) * np.exp(-t / 0.01) * 0.5
    return pan((bp(n, 1500, 7000) + body + low) * gain, p)


def tick(gain=1.0, p=0.0, f=5200):
    t = secs(0.02)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.0018) + bp(RNG.standard_normal(len(t)), 3000, 12000) * np.exp(-t / 0.001) * 0.5
    return pan(y * gain, p)


def thud(gain=1.0, f=160, p=0.0):
    t = secs(0.4)
    y = np.sin(2 * np.pi * f * t * (1 - 0.25 * t)) * np.exp(-t / 0.07) + lp(RNG.standard_normal(len(t)), 1800) * np.exp(-t / 0.008) * 0.35
    return pan(y * gain, p)


def glide(f0, f1, dur, gain=1.0, p=0.0):
    t = secs(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = np.sin(np.pi * t / dur) ** 0.8
    return pan(np.sin(ph) * env * gain, p)


# ------------------------------------------------------------------ composición


def compose(T, dur):
    c = T['cues']
    s = T['scenes']
    s1, s2, s3, s4, s5, s6, s7, s8 = s
    END = T['END']
    beat = 60 / 108
    eighth = beat / 2
    susp = s8 - 0.35  # breve suspensión antes del cierre
    line2 = c['line2']

    mus = Bus(dur + 3)

    # --- pads (progresión en Re mayor) ---
    chords = [
        (0.0, s2, ['D3', 'A3', 'E4', 'F#4', 'C#5'], 900, 0.55),
        (s2, s3, ['B2', 'F#3', 'C#4', 'D4', 'A4'], 1300, 0.7),
        (s3, s5, ['G2', 'D3', 'F#3', 'A3', 'B3'], 1700, 0.75),
        (s5, s6, ['E2', 'B2', 'F#3', 'G3', 'D4'], 2000, 0.8),
        (s6, s6 + (s7 - s6) * 0.5, ['B2', 'F#3', 'A3', 'C#4', 'D4'], 1200, 0.6),
        (s6 + (s7 - s6) * 0.5, s7, ['G2', 'D3', 'A3', 'B3', 'E4'], 1300, 0.6),
        (s7, susp, ['A2', 'E3', 'A3', 'D4', 'E4'], 2600, 0.85),
        (s8 - 0.05, line2, ['D3', 'G3', 'A3', 'D4', 'E4'], 900, 0.45),
        (line2, END + 0.2, ['D2', 'A2', 'F#3', 'C#4', 'E4', 'A4'], 2200, 0.95),
    ]
    for a, b, notes, bright, g in chords:
        rel = 0.35 if b == susp else 1.3
        if a == 0.0:
            mus.add(0.0, pad_chord(notes, b - a, bright, a=2.6, r=rel, gain=g * 0.9))
        else:
            mus.add(a - 0.25, pad_chord(notes, b - a + 0.25, bright, a=0.7, r=rel, gain=g))

    # --- sub bajo ---
    roots = [(s2, s3, 'B1', 0.5), (s3, s5, 'G1', 0.55), (s5, s6, 'E1', 0.6), (s6, s7, 'B1', 0.4), (s7, susp, 'A1', 0.6), (line2, END - 0.2, 'D2', 0.75)]
    for a, b, n, g in roots:
        mus.add(a, sub_note(hz(n), b - a, gain=g, a=0.15, r=0.35 if b == susp else 1.2) * 0.4)

    # --- arpegio (pulso elegante) ---
    arps = [
        (s3, s5, ['G4', 'D5', 'F#5', 'A5', 'B5', 'A5', 'F#5', 'D5'], 0.11, 0.2),
        (s5, s6, ['E4', 'B4', 'D5', 'F#5', 'G5', 'F#5', 'D5', 'B4'], 0.16, 0.24),
        (s6, s7, ['B4', 'F#5', 'A5', 'D5'], 0.07, 0.18),
        (s7, susp, ['A4', 'E5', 'A5', 'C#6', 'E6', 'C#6', 'A5', 'E5'], 0.14, 0.26),
    ]
    for a, b, seq, g0, g1 in arps:
        n = 0
        tt = a
        while tt < b - 0.02:
            u = (tt - a) / max(0.01, b - a)
            g = g0 + (g1 - g0) * u
            bright = 2600 + 2400 * u if a != s6 else 1800
            mus.add(tt, pluck(hz(seq[n % len(seq)]), gain=g, decay=0.28, p=0.45 * (1 if n % 2 else -1), bright=bright))
            n += 1
            tt += eighth

    # --- pulso rítmico (agentes y evolución) ---
    for a, b, g in ((s5, s6 - 0.1, 0.42), (s7 + 0.5, susp, 0.5)):
        tt = a
        k = 0
        while tt < b:
            ramp = 0.6 + 0.4 * (tt - a) / max(0.1, b - a)
            mus.add(tt, kick(gain=g * ramp))
            mus.add(tt + beat / 2, tick(gain=0.05 * ramp, p=0.3 if k % 2 else -0.3, f=7800))
            tt += beat
            k += 1

    # --- riser hacia la convergencia, corte seco → suspensión ---
    rise_a = c['converge'][0] - 0.6
    mus.add(rise_a, noise_sweep(susp - rise_a, 300, 6500, gain=0.09, shape='rise', q=0.8))
    for i, n in enumerate(['A5', 'C#6', 'E6', 'A6']):
        mus.add(rise_a + 0.25 * i, bell(hz(n), gain=0.04, decay=1.6, p=(i - 1.5) * 0.3))

    # --- resolución ---
    mus.add(line2, boom(gain=0.75))
    for i, n in enumerate(['D5', 'F#5', 'A5', 'E6']):
        mus.add(line2 + 0.03 * i, bell(hz(n), gain=0.07, decay=2.4, p=(i - 1.5) * 0.35))

    music = hp(reverb(mus.x, wet=0.32), 32, 2)

    # automatización general: la música baja en la escena 06 para dar protagonismo a la voz
    t = np.arange(len(music)) / SR
    auto = np.ones_like(t)
    auto *= 1 - 0.3 * np.clip((t - s6) / 0.8, 0, 1) * (1 - np.clip((t - s7) / 0.8, 0, 1))
    # suspensión
    auto *= 1 - 0.85 * np.clip((t - susp) / 0.12, 0, 1) * (1 - np.clip((t - (s8 - 0.05)) / 0.25, 0, 1))
    # final limpio
    auto *= 1 - np.clip((t - (END - 1.6)) / 1.55, 0, 1) ** 1.3
    music *= auto[:, None]
    return music[: int(dur * SR)]


def sound_design(T, dur):
    c = T['cues']
    s = T['scenes']
    s1, s2, s3, s4, s5, s6, s7, s8 = s
    fx = Bus(dur + 3)
    X = lambda x: (x - 540) / 540  # posición de pantalla → panorama

    # 01 — ambiente subgrave delicado + aire
    t = secs(s2 + 0.5)
    amb = np.sin(2 * np.pi * 41 * t) * np.clip(t / 3.0, 0, 1) * 0.12 + lp(RNG.standard_normal(len(t)), 900) * 0.012 * np.clip(t / 2, 0, 1)
    amb *= 1 - np.clip((t - s2) / 0.5, 0, 1)
    fx.add(0, pan(amb, 0))
    # caja que se dibuja
    fx.add(c['boxDraw'][0], noise_sweep(0.65, 2500, 6000, gain=0.05, shape='swell', q=0.6))
    # teclado
    for i in range(len(T['prompt'])):
        if T['prompt'][i] == ' ':
            continue
        fx.add(c['typeStart'] + i * c['typeStep'], key_click(gain=0.22 + 0.06 * RNG.random(), p=-0.3 + 0.5 * i / len(T['prompt'])))
    # respuesta
    fx.add(c['answer'][0], glide(880, 1320, 0.16, gain=0.05))
    # compactación: absorción + golpe sólido
    a, b = c['compact']
    fx.add(a, noise_sweep(b - a, 5000, 400, gain=0.16, shape='rise', q=1.2))
    fx.add(b - 0.02, thud(gain=0.55, f=120))

    # 02 — pliegue en módulos, vidrio, línea
    for i in range(4):
        fx.add(c['split'][0] + 0.12 + i * 0.05, bell(2400 + 260 * i, gain=0.035, decay=0.25, p=X(540 + (i - 1.5) * 178) * 0.8))
    a, b = c['lineDraw']
    fx.add(a, noise_sweep(b - a, 900, 4200, gain=0.07, p0=-0.7, p1=0.7, q=0.35))

    # 03 — nacimiento, flujo de datos, fusión
    a, b = c['birth']
    fx.add(a, noise_sweep(b - a + 0.1, 300, 1600, gain=0.08, shape='swell', q=0.9))
    d0 = c['decompose'][0]
    for i in range(0, 216, 3):
        delay = 0.42 * (i / 216) + 0.06 * RNG.random()
        arrive = d0 + delay + 0.8
        x = 180 + 720 * (i / 216)
        fx.add(arrive, tick(gain=0.035 + 0.02 * RNG.random(), p=X(x) * 0.85, f=4200 + 2500 * RNG.random()))
    fx.add(d0, noise_sweep(1.25, 1800, 5200, gain=0.035, p0=-0.5, p1=0.6, q=0.5))
    fx.add(c['fuse'][0] + 0.15, thud(gain=0.22, f=200))
    fx.add(c['fuse'][0] + 0.2, bell(hz('A5'), gain=0.03, decay=0.9))

    # 04 — láminas de vidrio, escaneo, detección, corrección, confirmación
    for i, at in enumerate(c['sheets']):
        fx.add(at + 0.12, noise_sweep(0.35, 3000, 1200, gain=0.035, p0=0.8, p1=0.1, q=0.6))
        fx.add(at + 0.4, bell(1350 + 140 * i, gain=0.06, decay=0.45, p=0.25, partials=((1, 1), (2.76, 0.4), (5.4, 0.2), (8.93, 0.08))))
    a, b = c['scan']
    fx.add(a, noise_sweep(b - a, 1200, 3000, gain=0.045, p0=-0.8, p1=0.8, q=0.4))
    detect = a + (b - a) * 0.66
    fx.add(detect, pluck(hz('E5'), gain=0.12, decay=0.12, p=0.25))
    fx.add(detect + 0.11, pluck(hz('A5'), gain=0.12, decay=0.16, p=0.25))
    fx.add(c['correct'][0], glide(560, 400, 0.45, gain=0.06, p=0.25))
    fx.add(c['check'], bell(hz('E5'), gain=0.08, decay=1.0))
    fx.add(c['check'] + 0.08, bell(hz('B5'), gain=0.06, decay=1.2))

    # 05 — agentes
    a, b = c['deploy']
    fx.add(a, noise_sweep(b - a, 400, 2400, gain=0.06, shape='swell', q=0.8))
    fx.add(c['signal'], glide(300, 900, 0.3, gain=0.04))
    notes = ['D5', 'E5', 'F#5', 'A5', 'B5', 'D6']
    for i, at in enumerate(c['signalNodes']):
        ang = i / 6 * 2 * np.pi
        fx.add(at, pluck(hz(notes[i]), gain=0.16, decay=0.22, p=np.sin(ang) * 0.7, bright=6000))
    fx.add(c['signalDone'], bell(hz('D5'), gain=0.07, decay=1.4))
    fx.add(c['signalDone'] + 0.04, bell(hz('A5'), gain=0.05, decay=1.4))
    fx.add(c['signalDone'], thud(gain=0.25, f=110))

    # 06 — tarjetas, foco, prioridad
    fx.add(s6, noise_sweep(0.7, 2200, 500, gain=0.05, shape='swell', q=0.7))
    for k in range(3):
        fx.add(s6 + 1.2 + 0.08 * k, thud(gain=0.3, f=170 - 15 * k, p=0))
    fx.add(c['highlight'], bell(hz('F#5'), gain=0.04, decay=0.9))
    fx.add(c['highlight'] + 0.05, bell(hz('A5'), gain=0.03, decay=0.9))
    fx.add(c['priority'], bell(hz('A5'), gain=0.09, decay=1.8, p=-0.2))

    # 07 — tres figuras, conexión, convergencia
    start = s7 + 0.3
    for k, (n, p) in enumerate((('D5', -0.5), ('F#5', 0.0), ('A5', 0.5))):
        at = start + (0.95 if k == 2 else 0.4 + (0.2 if k == 1 else 0) + 0.3)
        fx.add(at, pluck(hz(n), gain=0.12, decay=0.4, p=p, bright=5000))
    a, b = c['connect']
    fx.add(a, noise_sweep(b - a, 1200, 3800, gain=0.05, p0=-0.7, p1=0.7, q=0.35))
    a, b = c['converge']
    fx.add(a, noise_sweep(b - a + 0.3, 500, 3000, gain=0.05, shape='swell', q=1.0))

    # 08 — cierre: subgrave y cola limpia
    fx.add(c['line1'], noise_sweep(0.6, 3000, 900, gain=0.025, shape='swell', q=0.6))

    out = reverb(fx.x, wet=0.18, ir=IR_SHORT)
    return out[: int(dur * SR)]


def load_vo(path, dur):
    x, sr = sf.read(path, always_2d=True)
    x = x.mean(axis=1)
    if sr != SR:
        x = resample_poly(x, SR, sr)
    x = hp(x, 85, 2)
    out = np.zeros(int(dur * SR))
    out[: min(len(x), len(out))] = x[: len(out)]
    return pan(out, 0) * np.sqrt(2)  # centro a nivel unidad


def compress(x, thr_db=-20.0, ratio=3.0, att=0.005, rel=0.09):
    """Compresor de voz suave (feed-forward, detección de pico)."""
    mono = np.abs(x).max(axis=1)
    thr = 10 ** (thr_db / 20)
    a_c = np.exp(-1 / (att * SR))
    r_c = np.exp(-1 / (rel * SR))
    env = np.zeros_like(mono)
    v = 0.0
    for i in range(0, len(mono), 16):
        m = mono[i: i + 16].max()
        v = a_c * v + (1 - a_c) * m if m > v else r_c * v + (1 - r_c) * m
        env[i: i + 16] = v
    over = np.maximum(env / thr, 1.0)
    gain = over ** (1 / ratio - 1)
    return x * gain[:, None]


def envelope(x, att=0.03, rel=0.35):
    mono = np.abs(x).max(axis=1)
    win = int(0.02 * SR)
    rms = np.sqrt(np.convolve(mono ** 2, np.ones(win) / win, mode='same'))
    out = np.zeros_like(rms)
    a_c = np.exp(-1 / (att * SR))
    r_c = np.exp(-1 / (rel * SR))
    v = 0.0
    for i in range(0, len(rms), 32):  # resolución de 32 muestras (rápido)
        r = rms[i]
        v = a_c * v + (1 - a_c) * r if r > v else r_c * v + (1 - r_c) * r
        out[i: i + 32] = v
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--vo', default=os.path.join(ROOT, 'public/assets/audio/vo_guide.wav'))
    args = ap.parse_args()
    T = json.load(open(os.path.join(ROOT, 'build/cues.json')))
    dur = T['END']

    music = compose(T, dur)
    fx = sound_design(T, dur)
    vo = load_vo(args.vo, dur)

    # niveles base (RMS objetivo relativo)
    def rms(x):
        return np.sqrt(np.mean(x ** 2) + 1e-12)

    vo *= 0.20 / rms(vo[vo.any(axis=1)])
    vo = compress(vo, thr_db=-19, ratio=3.5)
    vo *= 0.20 / rms(vo[vo.any(axis=1)])
    music *= 0.27 / rms(music)
    fx *= 2.4

    # ducking: la música (y en menor medida los efectos) se apartan bajo la voz
    env = envelope(vo)
    act = np.clip(env / (env.max() * 0.25), 0, 1)
    duck_m = 1 - 0.55 * act  # ≈ -7 dB
    duck_f = 1 - 0.3 * act
    music *= duck_m[:, None]
    fx *= duck_f[:, None]

    mix = vo + music + fx
    peak = np.max(np.abs(mix))
    g = 0.7 / peak if peak > 0.7 else 1.0
    out = os.path.join(ROOT, 'public/assets/audio')
    stems = os.path.join(ROOT, 'deliverables/stems')
    os.makedirs(stems, exist_ok=True)
    for name, x in (('music', music), ('sfx', fx), ('vo', vo), ('mix_premaster', mix)):
        sf.write(os.path.join(out, f'{name}.wav'), (x * g).astype(np.float32), SR, subtype='PCM_24')
    for name, x in (('STEM_MUSICA', music), ('STEM_SFX', fx), ('STEM_VOZ', vo)):
        sf.write(os.path.join(stems, f'{name}.wav'), (x * g).astype(np.float32), SR, subtype='PCM_24')
    print(f'ok · peak {peak:.3f} · gain {g:.3f} · dur {dur}s')


if __name__ == '__main__':
    main()
