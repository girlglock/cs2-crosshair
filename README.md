# cs2-crosshair-viewer
this silly app allows you to preview CS2 crosshairs of players by their steamid64, vanity url or crosshair code and make edits to them.

> [!NOTE]  
> this is my first ever web app, i did my best to make it secure and easy to use, but i'm not a full stack developer so if you find anything critical to improve, please let me know or feel free to contribute :3

# usage

You can view crosshairs directly using these URL patterns:

- **crosshair code**: `https://c.girlglock.com/{code}`
- **steamID64**: `https://c.girlglock.com/{steamid64}`
- **steam Profile**: `https://c.girlglock.com/profiles/{steamid64}`
- **steam vanity**: `https://c.girlglock.com/id/{steamvanity}`
- **leetify vanity**: `https://c.girlglock.com/{leetifyvanity}`

# examples

- `https://c.girlglock.com/CSGO-AJswe-2jNcK-nMpEQ-rHV5J-5JWAB`
- `https://c.girlglock.com/76561198123456789`
- `https://c.girlglock.com/profiles/76561198123456789`
- `https://c.girlglock.com/id/somecoolsteamuser123`
- `https://c.girlglock.com/ropz`

## requirements

- nodejs >=22.11
- git
- (optional) an [Upstash](https://upstash.com) Redis database (free tier), used for caching player lookups and rate limiting

## deploying
### 1. clone and install deps

```bash
git clone https://github.com/girlglock/cs2-crosshair.git
cd cs2-crosshair
npm install
```

### 2. set your env vars

```bash
cp .env.example .env
```

### 3. start

```bash
npm start
```

> run it under PM2, systemd, or whatever process manager you like

## credits

- app by [girlglock](https://github.com/girlglock/)
- crosshair code decoding by [SyberiaK](https://github.com/SyberiaK/csxhair) ported to js
- crosshair rendering reconstructed from csgo
