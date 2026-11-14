#!/bin/sh
# Сборка на Netlify (netlify.toml → command): правки из админки (Decap CMS сохраняет их в ricca/data, ricca/img/uploads
# и ricca/admin) переносятся в готовую папку сайта dist/RICCA-site. Остальное в dist уже собрано и лежит в репозитории.
set -e
D=dist/RICCA-site
mkdir -p "$D/data" "$D/img/uploads" "$D/admin"
cp ricca/data/*.json "$D/data/"
cp ricca/admin/index.html ricca/admin/config.yml "$D/admin/"
for f in ricca/img/uploads/*; do [ -f "$f" ] && cp "$f" "$D/img/uploads/"; done
echo "админка: данные перенесены в $D"
