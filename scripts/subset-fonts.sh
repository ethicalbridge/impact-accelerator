#!/bin/sh
# Trims the self-hosted fonts to what Handova shows (EN/ES/PT/FR plus Latin names). Needs: pip install fonttools brotli
# Run from the repo root on the ORIGINAL font files (upstream Google Fonts releases); re-running on a trimmed file is harmless.
# - Instrument Sans: the width axis is pinned to normal (the site never uses font-stretch), then trimmed. 85 KB -> 35 KB.
# - Newsreader: left as it is. It is already a Latin subset; what remains is its weight and optical-size axes, which the design uses.
set -e
U="U+0000-017F,U+0192,U+02C6,U+02DA,U+02DC,U+0300-0308,U+0327,U+2000-206F,U+20AC,U+2122,U+2190-2193,U+2212,U+2713,U+2715,U+2717,U+FEFF"
tmp=$(mktemp -d)
fonttools varLib.instancer fonts/instrument-sans.woff2 wdth=drop -o "$tmp/is.ttf"
pyftsubset "$tmp/is.ttf" --unicodes="$U" --flavor=woff2 --layout-features='case,liga,locl,ccmp,pnum,tnum,kern,mark,mkmk' --output-file=fonts/instrument-sans.woff2
rm -rf "$tmp"
ls -l fonts/*.woff2
