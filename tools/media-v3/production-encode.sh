#!/usr/bin/env bash
# Ролик ателье (#atelier): петля из src/production-story.mp4 → video/production.(mp4|webm) 478 × 850, 30 к/с
# и video/production-phone.(mp4|webm) 432 × 768, 24 к/с. Звук не берём. Постер (production-poster.webp) не меняется.
# Склейки исходника (кадры, 30 к/с): 0 стол дизайнера · 55 пошив · 109 разметка лекал · 166 шлифовка · 226 лак · 293 ткани ·
# 328 раскрой · 372 обивка · 425 сборка в шоуруме · 494 готовый диван (–608).
# Берём: пошив, шлифовка…обивка, готовый диван. НЕ берём (вырезаны целиком, не размыты): стол дизайнера, разметку лекал
# (лицо женщины в профиль) и сборку в шоуруме (лицо мужчины в кепке) — люди узнаваемы, согласия на съёмку нет.
# Конец растворяется в начало (0,5 с) — стыка при loop не видно.
# Запуск из корня репозитория: bash tools/media-v3/production-encode.sh [workDir]
set -euo pipefail
cd "$(dirname "$0")/../.."
src=ricca/src/production-story.mp4
work=${1:-/tmp/ricca-production}; mkdir -p "$work"
out=ricca/video/production
XF=15   # кадров наплыва (0,5 с)
master="$work/production-master.mp4"
ffmpeg -v error -y -i "$src" -filter_complex "
  [0:v]split=3[s1][s2][s3];
  [s1]trim=start_frame=55:end_frame=109,setpts=PTS-STARTPTS[a];
  [s2]trim=start_frame=166:end_frame=425,setpts=PTS-STARTPTS[b];
  [s3]trim=start_frame=494:end_frame=608,setpts=PTS-STARTPTS[c];
  [a][b][c]concat=n=3:v=1:a=0,format=yuv420p,split=3[x1][x2][x3];
  [x1]trim=end_frame=$XF,setpts=PTS-STARTPTS[head];
  [x2]trim=start_frame=$XF:end_frame=412,setpts=PTS-STARTPTS[body];
  [x3]trim=start_frame=412,setpts=PTS-STARTPTS[tail];
  [tail][head]xfade=transition=fade:duration=0.5:offset=0[seam];
  [body][seam]concat=n=2:v=1:a=0[v]" \
  -map "[v]" -an -c:v libx264 -preset veryslow -crf 8 -pix_fmt yuv420p "$master"
tags=(-colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv)
enc() {  # $1 = выход без расширения, $2 = фильтр, $3 = CRF x264, $4 = CRF VP9
  ffmpeg -v error -y -i "$master" -an -vf "$2" -c:v libx264 -preset veryslow -crf "$3" -profile:v high -pix_fmt yuv420p "${tags[@]}" -movflags +faststart "$1.mp4"
  ffmpeg -v error -y -i "$master" -an -vf "$2" -c:v libvpx-vp9 -b:v 0 -crf "$4" -row-mt 1 -pass 1 -passlogfile "$work/vp9" "${tags[@]}" -f webm /dev/null
  ffmpeg -v error -y -i "$master" -an -vf "$2" -c:v libvpx-vp9 -b:v 0 -crf "$4" -row-mt 1 -pass 2 -passlogfile "$work/vp9" "${tags[@]}" "$1.webm"
}
enc "$out" "null" 24 36
enc "$out-phone" "fps=24,scale=432:768:flags=lanczos" 27 40
ls -la "$out".mp4 "$out".webm "$out"-phone.mp4 "$out"-phone.webm
for f in "$out".mp4 "$out"-phone.mp4; do ffprobe -v error -show_entries format=duration:stream=width,height,r_frame_rate -of compact "$f"; done
