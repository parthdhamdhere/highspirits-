#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
ffmpeg -y -framerate 24 -i assets/sangria/renders-hd/%04d.png -c:v libx264 -crf 16 -preset slow -pix_fmt yuv420p -g 6 -keyint_min 6 -sc_threshold 0 -movflags +faststart -an frontend/public/sangria/pour.mp4
ffmpeg -y -i assets/sangria/renders-hd/0001.png -frames:v 1 -q:v 2 frontend/public/sangria/opening.jpg
ffmpeg -y -i assets/sangria/renders-hd/0240.png -frames:v 1 -q:v 2 frontend/public/sangria/poster.jpg
