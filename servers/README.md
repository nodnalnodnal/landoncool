# servers

backends for the landon.cool pages that need one. they run on the home server in docker, behind caddy, same as the link shortener.

all commands assume the caddy container is called `caddy` and its caddyfile lives at `/srv/server/caddy/Caddyfile`.

## draw (landon.cool/draw)

shared drawing board. websocket server, keeps the last 150k strokes in `/srv/server/draw/data/strokes.json`.

```bash
mkdir -p /srv/server/draw/data && cd /srv/server/draw
for f in Dockerfile package.json server.js; do curl -fsSLO https://raw.githubusercontent.com/nodnalnodnal/landoncool/main/servers/draw/$f; done
docker build -t landon-draw .
NET=$(docker inspect caddy -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' | awk '{print $1}')
docker run -d --name landon-draw --restart unless-stopped --network "$NET" -v /srv/server/draw/data:/data landon-draw
printf '\ndraw.landon.cool {\n\treverse_proxy landon-draw:8080\n}\n' >> /srv/server/caddy/Caddyfile
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

then add an A record `draw` in namecheap pointing at the home ip.

wipe the board if someone draws something cursed:

```bash
docker kill -s USR2 landon-draw
```

## radio (landon.cool/radio)

synced radio. every listener hears the same song at the same spot, no streaming server needed, just files.

```bash
mkdir -p /srv/server/radio/music && cd /srv/server/radio
curl -fsSLO https://raw.githubusercontent.com/nodnalnodnal/landoncool/main/servers/radio/gen.py
NET=$(docker inspect caddy -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' | awk '{print $1}')
docker run -d --name landon-radio --restart unless-stopped --network "$NET" -v /srv/server/radio/music:/music:ro caddy:2-alpine caddy file-server --root /music --listen :80
printf '\nradio.landon.cool {\n\theader Access-Control-Allow-Origin *\n\treverse_proxy landon-radio:80\n}\n' >> /srv/server/caddy/Caddyfile
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

then add an A record `radio` in namecheap.

adding songs: drop mp3/ogg/m4a/flac files in `/srv/server/radio/music` (name them `artist - title.mp3` if they have no tags), then rebuild the playlist:

```bash
docker run --rm -v /srv/server/radio/music:/music -v /srv/server/radio:/app python:3-alpine sh -c "pip install -q mutagen && python /app/gen.py"
```

only put in music you're allowed to stream publicly (your own, or royalty-free/creative commons lofi).
