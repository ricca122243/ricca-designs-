#!/usr/bin/env bash
# Видео входа: мастер (kb.py, CRF 6) → mp4 (H.264 CRF 26, preset veryslow — вдвое меньше файла при той же CRF, +faststart) + webm (VP9, 2 прохода) + постеры (кадр 0: webp + jpg).
# Запуск: bash tools/media-v3/hero-encode.sh desktop|mobile [workDir]   (REUSE_MASTER=1 — не пересчитывать мастер; VP9CRF=N)
# 10 октября (вечер): только оставленные кадры (MANIFEST.md, «Снято с сайта 10 октября»); конфиги — desk.json / mob.json.
set -euo pipefail
cd "$(dirname "$0")"
kind=$1; work=${2:-/tmp/ricca-hero}; mkdir -p "$work"
case "$kind" in
  desktop) cfg=desk.json; vp9crf=${VP9CRF:-40} ;;
  mobile)  cfg=mob.json;  vp9crf=${VP9CRF:-42} ;;
  *) echo "desktop|mobile"; exit 1 ;;
esac
out=../../ricca/video/hero-$kind
master="$work/hero-$kind-master.mp4"
[ -n "${REUSE_MASTER:-}" ] && [ -f "$master" ] || python3 kb.py "$cfg" "$master"
tags=(-colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv)
ffmpeg -v error -y -i "$master" -an -c:v libx264 -preset veryslow -crf 26 -profile:v high -pix_fmt yuv420p "${tags[@]}" -movflags +faststart "$out.mp4"
ffmpeg -v error -y -i "$master" -an -c:v libvpx-vp9 -b:v 0 -crf "$vp9crf" -row-mt 1 -tile-columns 2 -pass 1 -passlogfile "$work/vp9-$kind" "${tags[@]}" -f webm /dev/null
ffmpeg -v error -y -i "$master" -an -c:v libvpx-vp9 -b:v 0 -crf "$vp9crf" -row-mt 1 -tile-columns 2 -pass 2 -passlogfile "$work/vp9-$kind" "${tags[@]}" "$out.webm"
ffmpeg -v error -y -i "$master" -frames:v 1 "$work/hero-$kind-f0.png"
python3 - "$work/hero-$kind-f0.png" "$out-poster" <<'PY'
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
im.save(sys.argv[2] + '.webp', quality=74, method=6)
im.save(sys.argv[2] + '.jpg', quality=84, optimize=True, progressive=True)
print(sys.argv[2], im.size)
PY
ls -la "$out".mp4 "$out".webm "$out"-poster.*
