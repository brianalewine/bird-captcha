"""Rebuild the audio catalog from Xeno-canto's public A-rated search results.

Usage: python3 scripts/curate-audio.py /path/to/original-calls.json
Only streams returning audio bytes are included. Results are cached in /tmp.
"""
import concurrent.futures
import html
import json
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import quote, urlencode

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path('/tmp/birdcha-rated-audio-exact')
CACHE.mkdir(exist_ok=True)


def fetch(url, byte_range=None):
    args = ['curl', '--fail', '--location', '--silent', '--show-error',
            '--max-time', '35', '--retry', '2']
    if byte_range:
        args += ['--range', byte_range]
    return subprocess.check_output(args + [url])


def clean(text):
    return html.unescape(re.sub('<[^>]+>', '', text)).strip()


def select(call):
    cache = CACHE / (re.sub(r'[^a-zA-Z0-9]', '-', call['species']) + '.json')
    if cache.exists():
        return json.loads(cache.read_text())
    queries = [f'sp:"{call["aliases"][0]}" q:A len:5-40',
               f'"{call["species"]}" q:A len:5-40']
    for query in queries:
        page = fetch('https://xeno-canto.org/explore?' + urlencode({'query': query})).decode()
        for row in re.findall(r'<tr\b[^>]*>(.*?)</tr>', page, re.S):
            audio = re.search(r'<audio[^>]+src=[\'"]([^\'"]+)', row)
            rating = re.search(r"id='rating-(\d+)-1' class='selected'", row)
            author = re.search(r"href='https://xeno-canto.org/contributor/[^']+'>(.*?)</a>", row)
            license_url = re.search(r'https://creativecommons.org/licenses/[^\'"<>]+', row)
            if not all([audio, rating, author, license_url]):
                continue
            # Common-name fallback supports taxa whose scientific genus changed.
            if not query.startswith('sp:'):
                common = re.search(r'<span class="common-name">(.*?)</span>', row)
                normalize = lambda value: re.sub(r'[^a-z]', '', value.lower())
                accepted = [normalize(name) for name in [call['species'], *call['aliases']]]
                if not common or normalize(clean(common[1])) not in accepted:
                    continue
            src = quote(html.unescape(audio[1]), safe=':/?=&%+-_.~')
            try:
                sample = fetch(src, '0-1023')
                if len(sample) < 100 or sample.lstrip().startswith(b'<'):
                    continue
            except subprocess.CalledProcessError:
                continue
            result = {**call, 'src': src, 'quality': 'A',
                      'source': 'https://xeno-canto.org/' + rating[1],
                      'recordist': clean(author[1]), 'license': license_url[0]}
            cache.write_text(json.dumps(result, ensure_ascii=False))
            print(call['species'] + ': A / XC' + rating[1], flush=True)
            return result
    print(call['species'] + ': no eligible A-rated recording', flush=True)
    return None


if __name__ == '__main__':
    original = json.loads(Path(sys.argv[1]).read_text())
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        selected = list(pool.map(select, original))
    catalog = [call for call in selected if call]
    if not catalog:
        raise SystemExit('No eligible recordings; existing catalog left intact.')
    (ROOT / 'audio.js').write_text(
        '// Only verified Xeno-canto quality A recordings; see AUDIO-CREDITS.md.\n'
        + 'export const calls = ' + json.dumps(catalog, ensure_ascii=False, indent=2) + ';\n')
    credits = ['# Bird recording credits', '',
               'All playable recordings are rated **A**, Xeno-canto’s highest sound-quality grade. '
               'Selected clips are 5–40 seconds long. Their stream URLs were checked when the catalog was built. '
               'Ratings help select clear recordings but cannot guarantee identical listening conditions on every device.', '',
               '| Species | Recordist | Recording | Quality | License |',
               '| --- | --- | --- | --- | --- |']
    for call in catalog:
        license_name = call['license'].split('/licenses/')[1].strip('/').upper()
        credits.append(f"| {call['species']} | {call['recordist']} | [Xeno-canto]({call['source']}) | A | [{license_name}]({call['license']}) |")
    omitted = [call['species'] for call, chosen in zip(original, selected) if not chosen]
    if omitted:
        credits += ['', 'Species omitted from audio because no eligible A-rated recording was found: '
                    + ', '.join(omitted) + '.']
    (ROOT / 'AUDIO-CREDITS.md').write_text('\n'.join(credits) + '\n')
    print(f'Wrote {len(catalog)} A-rated recordings; omitted {len(omitted)} species.')
