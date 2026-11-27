#!/usr/bin/env python3
"""IndexNow — сообщить Яндексу и Bing (и другим участникам протокола) о страницах ricca.design.
27 ноября, владелец: «наш сайт по-любому не выходит» (не находится в поиске). Google IndexNow не поддерживает —
для него карта сайта в Search Console.

  python3 tools/indexnow.py            — все адреса из карты сайта dist/RICCA-site/sitemap.xml (её дописывают model-pages.mjs и project-pages.mjs)
  python3 tools/indexnow.py <адрес> …  — только эти (после правки страницы)

Ключ — файл tools/ricca-extra/<ключ>.txt, он же лежит в корне сайта (копирует tools/build-ricca-dist.sh).
Запускать после выкладки на ricca.design: поисковик сначала проверяет, что ключ открывается на сайте."""
import glob, json, os, re, sys, urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
HOST = 'ricca.design'
keys = [os.path.basename(f)[:-4] for f in glob.glob(os.path.join(ROOT, 'tools', 'ricca-extra', '*.txt')) if re.fullmatch(r'[0-9a-f]{32}\.txt', os.path.basename(f))]
assert len(keys) == 1, keys
KEY = keys[0]
urls = sys.argv[1:] or re.findall(r'<loc>([^<]+)</loc>', open(os.path.join(ROOT, 'dist', 'RICCA-site', 'sitemap.xml'), encoding='utf-8').read())
urls = [u for u in urls if u.startswith(f'https://{HOST}/')]
body = json.dumps({'host': HOST, 'key': KEY, 'keyLocation': f'https://{HOST}/{KEY}.txt', 'urlList': urls}).encode()
for ep in ('https://api.indexnow.org/indexnow', 'https://yandex.com/indexnow'):
    req = urllib.request.Request(ep, data=body, headers={'Content-Type': 'application/json; charset=utf-8'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print(ep, r.status, '— принято', len(urls), 'адресов')
    except urllib.error.HTTPError as e:
        print(ep, e.code, e.read()[:200].decode('utf-8', 'replace'))
    except Exception as e:  # noqa: BLE001
        print(ep, 'ошибка:', e)
