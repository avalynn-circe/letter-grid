#!/usr/bin/env bash
# Regenerate assets/fonts/ from the upstream packages. See assets/fonts/README.md.
set -euo pipefail

RANGE="U+0020-007E,U+00A0-00FF,U+200B-200F,U+2010-2027,U+2030-205E,U+2070-209F,U+20A0-20BF,U+2100-214F,U+2190-21FF,U+2200-22FF,U+2300-23FF,U+25A0-25FF,U+2600-27BF"
SRC="node_modules/@expo-google-fonts"
OUT="assets/fonts"
mkdir -p "$OUT"

subset() {  # subset <package> <weight-dir> <FaceName>
  pyftsubset "$SRC/$1/$2/$3.ttf" \
    --unicodes="$RANGE" \
    --layout-features='*' \
    --output-file="$OUT/$3.ttf"
  printf "  %-28s %s\n" "$3" "$(du -h "$OUT/$3.ttf" | cut -f1)"
}

subset baloo-2 600SemiBold Baloo2_600SemiBold
subset libre-franklin 400Regular LibreFranklin_400Regular
subset libre-franklin 600SemiBold LibreFranklin_600SemiBold
subset libre-franklin 700Bold LibreFranklin_700Bold
subset jetbrains-mono 400Regular JetBrainsMono_400Regular
subset jetbrains-mono 600SemiBold JetBrainsMono_600SemiBold

# The OFL requires the licence to travel with the fonts.
cp "$SRC/baloo-2/LICENSE_FONT" "$OUT/LICENSE_FONT-baloo-2.txt"
cp "$SRC/jetbrains-mono/LICENSE_FONT" "$OUT/LICENSE_FONT-jetbrains-mono.txt"
cp "$SRC/libre-franklin/LICENSE_FONT" "$OUT/LICENSE_FONT-libre-franklin.txt"
