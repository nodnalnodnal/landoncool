# builds playlist.json for landon.cool/radio from every audio file in /music
# run: docker run --rm -v /srv/server/radio/music:/music -v /srv/server/radio:/app python:3-alpine sh -c "pip install -q mutagen && python /app/gen.py"
import json, os, sys
from mutagen import File

root = sys.argv[1] if len(sys.argv) > 1 else '/music'
tracks = []
for name in sorted(os.listdir(root)):
    if not name.lower().endswith(('.mp3', '.ogg', '.opus', '.m4a', '.flac', '.wav')):
        continue
    try:
        a = File(os.path.join(root, name), easy=True)
        dur = round(a.info.length, 2)
    except Exception as e:
        print('skip', name, e)
        continue
    tags = a.tags or {}
    get = lambda k: (tags.get(k) or [''])[0] if hasattr(tags, 'get') else ''
    stem = os.path.splitext(name)[0]
    artist, _, title = stem.partition(' - ') if ' - ' in stem else ('', '', stem)
    tracks.append({'f': name, 'title': get('title') or title, 'artist': get('artist') or artist, 'd': dur})

with open(os.path.join(root, 'playlist.json'), 'w') as f:
    json.dump(tracks, f)
total = sum(t['d'] for t in tracks)
print(f'{len(tracks)} tracks, {total / 60:.0f} minutes')
