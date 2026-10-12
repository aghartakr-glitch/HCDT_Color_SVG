"""색 계산 도구 (sRGB ↔ OKLab/OKLCH, 명암비, 감마 처리) — 의존성 없음"""
import math

WHITE = "#FFFFFF"


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def rgb_to_hex(rgb):
    return "#%02X%02X%02X" % tuple(max(0, min(255, round(c * 255))) for c in rgb)


def lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def delin(c):
    return 12.92 * c if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055


def rel_lum(h):
    r, g, b = map(lin, hex_to_rgb(h))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = sorted([rel_lum(a), rel_lum(b)], reverse=True)
    return (la + 0.05) / (lb + 0.05)


def srgb_to_oklab(h):
    r, g, b = map(lin, hex_to_rgb(h))
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l, m, s = l ** (1 / 3), m ** (1 / 3), s ** (1 / 3)
    return (0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s)


def oklab_to_rgb_raw(L, a, b):
    l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    return r, g, bl


def in_gamut(rgb_lin, eps=1e-4):
    return all(-eps <= c <= 1 + eps for c in rgb_lin)


def oklch_to_hex(L, C, h):
    a, b = C * math.cos(math.radians(h)), C * math.sin(math.radians(h))
    rl = oklab_to_rgb_raw(L, a, b)
    return rgb_to_hex(tuple(delin(max(0, min(1, c))) for c in rl)), in_gamut(rl)


def max_chroma(L, h, lo=0.0, hi=0.4):
    for _ in range(24):
        mid = (lo + hi) / 2
        _, ok = oklch_to_hex(L, mid, h)
        if ok:
            lo = mid
        else:
            hi = mid
    return lo


def hex_to_oklch(h):
    L, a, b = srgb_to_oklab(h)
    return L, math.hypot(a, b), math.degrees(math.atan2(b, a)) % 360


def delta_e(h1, h2):
    a, b = srgb_to_oklab(h1), srgb_to_oklab(h2)
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def hue_dist(a, b):
    d = abs(a - b) % 360
    return min(d, 360 - d)


# ── 색각 이상 시뮬레이션: Machado, Oliveira, Fernandes (2009) 완전 이상(severity 1.0), 선형 RGB에 적용 ──
CVD_MATRICES = {
    "protan": ((0.152286, 1.052583, -0.204868), (0.114503, 0.786281, 0.099216), (-0.003882, -0.048116, 1.051998)),
    "deutan": ((0.367322, 0.860646, -0.227968), (0.280085, 0.672501, 0.047413), (-0.011820, 0.042940, 0.968881)),
    "tritan": ((1.255528, -0.076749, -0.178779), (-0.078411, 0.930809, 0.147602), (0.004733, 0.691367, 0.303900)),
}


def simulate_cvd(h, kind):
    m = CVD_MATRICES[kind]
    rgb = [lin(c) for c in hex_to_rgb(h)]
    out = [max(0.0, min(1.0, sum(m[i][j] * rgb[j] for j in range(3)))) for i in range(3)]
    return rgb_to_hex(tuple(delin(c) for c in out))
