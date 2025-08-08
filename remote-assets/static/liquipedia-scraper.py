import time
import json
import os
import asyncio
from playwright.async_api import async_playwright
from liquipediapy import counterstrike
import threading
import sys
from datetime import datetime, timedelta

counterstrike_obj = counterstrike("c.girlglock.com")

SAVE_PATH = "pro-players.json"
REQUESTS_PER_HOUR = 58
REQUEST_INTERVAL = 3600 / REQUESTS_PER_HOUR

def extract_steamid(steam_url):
    return steam_url.rstrip('/').split('/')[-1]

def format_time_remaining(seconds):
    if seconds <= 0:
        return "0s"
    
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    
    if hours > 0:
        return f"{hours}h {minutes}m {secs}s"
    elif minutes > 0:
        return f"{minutes}m {secs}s"
    else:
        return f"{secs}s"

def calculate_eta(completed, total, start_time, current_time):
    if completed == 0 or total == 0:
        return "calculating..."
    
    elapsed = current_time - start_time
    rate = completed / elapsed
    remaining = total - completed
    eta_seconds = remaining / rate if rate > 0 else 0
    
    eta_time = datetime.now() + timedelta(seconds=eta_seconds)
    return eta_time.strftime("%H:%M:%S")

def cooldown_timer(duration, completed=0, total=0, start_time=None):
    print("[RL] enter to skip cooldown")

    skip_flag = {"skip": False}

    def wait_for_enter():
        input()
        skip_flag["skip"] = True

    input_thread = threading.Thread(target=wait_for_enter, daemon=True)
    input_thread.start()

    timer_start = time.time()
    while True:
        elapsed = int(time.time() - timer_start)
        remaining = duration - elapsed
        if remaining <= 0 or skip_flag["skip"]:
            break
        
        if start_time and total > 0:
            current_eta = calculate_eta(completed, total, start_time, time.time() + remaining)
            sys.stdout.write(f"\r[RL] resuming in {format_time_remaining(remaining)} | eta: {current_eta}")
        else:
            sys.stdout.write(f"\r[RL] resuming in {format_time_remaining(remaining)}")
        sys.stdout.flush()
        time.sleep(1)

    print("\n[RL] resuming...")

async def check_rate_limited(page):
    try:
        content = await page.content()
        return "Rate Limited" in content
    except:
        return False

async def scrape_player_page(browser, player_id):
    page = None
    try:
        page = await browser.new_page()
        
        url = f"https://liquipedia.net/counterstrike/{player_id}"
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        
        if await check_rate_limited(page):
            await page.close()
            return {"rate_limited": True}

        steam_id = None
        try:
            steam_link = await page.query_selector('div.infobox-center.infobox-icons a[href*="steamcommunity.com"]')
            if steam_link:
                steam_url = await steam_link.get_attribute('href')
                if steam_url:
                    steam_id = extract_steamid(steam_url)
        except:
            pass

        image_url = None
        try:
            image_element = await page.query_selector('div.infobox-image.darkmode img')
            if not image_element:
                image_element = await page.query_selector('div.infobox-image.lightmode img')
            
            if image_element:
                src = await image_element.get_attribute('src')
                if src and src.startswith('/'):
                    image_url = f"https://liquipedia.net{src}"
                elif src:
                    image_url = src
        except:
            pass
        
        await page.close()
        
        return {
            'player_id': player_id,
            'steam_id': steam_id,
            'image_url': image_url
        }
        
    except Exception as e:
        if page:
            await page.close()
        return {'error': str(e)}

def load_skipped_players():
    if os.path.isfile(SAVE_PATH):
        with open(SAVE_PATH, 'r') as f:
            data = json.load(f)
            return set(data.get("skipped_players", []))
    return set()

def save_skipped_player(player_id, skipped_set):
    skipped_set.add(player_id)
    
    if os.path.isfile(SAVE_PATH):
        with open(SAVE_PATH, 'r') as f:
            data = json.load(f)
    else:
        data = {"players": {}}
    
    data["skipped_players"] = list(skipped_set)
    
    with open(SAVE_PATH, 'w') as f:
        json.dump(data, f, indent=2)

def save_player_to_json(result):
    if os.path.isfile(SAVE_PATH):
        with open(SAVE_PATH, 'r') as f:
            data = json.load(f)
    else:
        data = {"players": {}}
    
    if "players" not in data:
        data["players"] = {}
    
    if result.get('steam_id'):
        data["players"][result['player_id']] = {
            "steamid": result['steam_id'],
            "type": "pro",
            "image": result.get('image_url')
        }
    
    with open(SAVE_PATH, 'w') as f:
        json.dump(data, f, indent=2)

def save_current_progress(results):
    data = {"players": {}}
    if os.path.isfile(SAVE_PATH):
        with open(SAVE_PATH, 'r') as f:
            data = json.load(f)
    
    if "players" not in data:
        data["players"] = {}
    
    for result in results:
        if result.get('steam_id'):
            data["players"][result['player_id']] = {
                "steamid": result['steam_id'],
                "type": "pro",
                "image": result.get('image_url')
            }
    
    with open(SAVE_PATH, 'w') as f:
        json.dump(data, f, indent=2)

async def scrape_players(players_to_scrape, skipped_players):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        results = []
        last_request_time = 0
        start_time = time.time()
        total_players = len(players_to_scrape)
        
        for i, player in enumerate(players_to_scrape):
            player_id = player['id']
            
            eta = calculate_eta(i, total_players, start_time, time.time())
            progress_percent = (i / total_players) * 100 if total_players > 0 else 0
            print(f"[ETA] {i}/{total_players} ({progress_percent:.1f}%)")
            
            time_since_last = time.time() - last_request_time
            if time_since_last < REQUEST_INTERVAL:
                wait_time = REQUEST_INTERVAL - time_since_last
                print(f"[INFO] waiting {wait_time:.0f}s before next request...")
                
                wait_start = time.time()
                while True:
                    elapsed = time.time() - wait_start
                    remaining = wait_time - elapsed
                    if remaining <= 0:
                        break
                    current_eta = calculate_eta(i, total_players, start_time, time.time() + remaining)
                    sys.stdout.write('\r' + ' ' * 64 + '\r')
                    sys.stdout.write(f"\r[ETA] resuming in {format_time_remaining(remaining)} | eta: {current_eta}")
                    sys.stdout.flush()
                    await asyncio.sleep(1)
                print()
            
            print(f"[INFO] fetching [{i+1}/{len(players_to_scrape)}]: {player_id} ...")
            
            last_request_time = time.time()
            result = await scrape_player_page(browser, player_id)
            
            if result.get('rate_limited'):
                print(f"[RL] rate limit hit on {player_id}")
                print("[RL] saving progress and waiting.")
                save_current_progress(results)
                cooldown_timer(3600, i, total_players, start_time)
                last_request_time = time.time()
                result = await scrape_player_page(browser, player_id)
            
            if result.get('error'):
                print(f"[ERROR] unexpected error for {player_id}: {result['error']}. skipped.")
                save_skipped_player(player_id, skipped_players)
                continue
            
            if not result.get('steam_id'):
                print(f"[SKIP] skipped {player_id}: no steamcommunity.")
                save_skipped_player(player_id, skipped_players)
                continue
            
            results.append(result)
            print(f"[INFO] added {player_id} (steamid64: {result['steam_id']})")
            save_player_to_json(result)
        
        await browser.close()
        return results

if os.path.isfile(SAVE_PATH):
    with open(SAVE_PATH, 'r') as f:
        data = json.load(f)
        player_json = data.get("players", {})
    print(f"[INFO] loaded {len(player_json)} players from existing json :p")
else:
    player_json = {}

skipped_players = load_skipped_players()
print(f"[INFO] loaded {len(skipped_players)} skipped players")

try:
    players = counterstrike_obj.get_players()
    print("[INFO] total players fetched:", len(players))
except Exception as e:
    print(f"[ERROR] failed to fetch players from liquipedia: {e}")
    print("[ERROR] liquipedia API is rate limited. waiting 1 hour...")
    cooldown_timer(3600)
    try:
        players = counterstrike_obj.get_players()
        print("[INFO] total players fetched:", len(players))
    except Exception as e:
        print(f"[FATAL] still failed after cooldown: {e}")
        sys.exit(1)

players_to_scrape = []
for player in players:
    player_id = player.get('id')
    if player_id and player_id not in player_json and player_id not in skipped_players:
        players_to_scrape.append(player)

print(f"[INFO] players to scrape: {len(players_to_scrape)}")

if players_to_scrape:
    results = asyncio.run(scrape_players(players_to_scrape, skipped_players))
    
    data = {"players": {}}
    if os.path.isfile(SAVE_PATH):
        with open(SAVE_PATH, 'r') as f:
            data = json.load(f)
    
    if "players" not in data:
        data["players"] = {}

    for result in results:
        if result.get('steam_id'):
            data["players"][result['player_id']] = {
                "steamid": result['steam_id'],
                "type": "pro",
                "image": result.get('image_url')
            }
    
    with open(SAVE_PATH, 'w') as f:
        json.dump(data, f, indent=2)