"""
edit get_player_info in import counterstrike.py

	def get_player_info(self,playerName,results=False):
		player_object = cs_player()
		playerName = player_object.process_playerName(playerName)		
		soup,redirect_value = self.liquipedia.parse(playerName)
		if redirect_value is not None:
			playerName = redirect_value
		player = {}
		player['links'] = player_object.get_player_links(soup)
		if results:
			parse_value = playerName + "/Results"
			try:
				soup,__ = self.liquipedia.parse(parse_value)
			except ex.RequestsException:
				player['results'] = []
			else:	
				player['results'] = player_object.get_player_achivements(soup)

		return player
"""

import time
import json
import os
import asyncio
from playwright.async_api import async_playwright
from liquipediapy import counterstrike
import threading
import sys

counterstrike_obj = counterstrike("c.girlglock.com")

SAVE_PATH = "pro-players.json"
REQUESTS_PER_HOUR = 58 # just under 1h rate limit
REQUEST_INTERVAL = 3600 / REQUESTS_PER_HOUR

def extract_steamid(steam_url):
    return steam_url.rstrip('/').split('/')[-1]

def cooldown_timer(duration):
    print("[RL] enter to skip cooldown")

    skip_flag = {"skip": False}

    def wait_for_enter():
        input()
        skip_flag["skip"] = True

    input_thread = threading.Thread(target=wait_for_enter, daemon=True)
    input_thread.start()

    start_time = time.time()
    while True:
        elapsed = int(time.time() - start_time)
        remaining = duration - elapsed
        if remaining <= 0 or skip_flag["skip"]:
            break
        mins, secs = divmod(remaining, 60)
        print(f"[RL] resuming in {mins:02}:{secs:02}", end="\r")
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

async def scrape_players(players_to_scrape):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        results = []
        last_request_time = 0
        
        for i, player in enumerate(players_to_scrape):
            player_id = player['id']
            time_since_last = time.time() - last_request_time
            if time_since_last < REQUEST_INTERVAL:
                wait_time = REQUEST_INTERVAL - time_since_last
                print(f"[INFO] waiting {wait_time:.0f}s before next request...")
                await asyncio.sleep(wait_time)
            
            print(f"[INFO] fetching [{i+1}/{len(players_to_scrape)}]: {player_id} ...")
            
            last_request_time = time.time()
            result = await scrape_player_page(browser, player_id)
            
            if result.get('rate_limited'):
                print(f"[RL] rate limit hit on {player_id}")
                print("[RL] saving progress and waiting.")
                save_current_progress(results)
                cooldown_timer(3600)

                last_request_time = time.time()
                result = await scrape_player_page(browser, player_id)
            
            if result.get('error'):
                print(f"[ERROR] unexpected error for {player_id}: {result['error']}. skipped.")
                continue
            
            if not result.get('steam_id'):
                print(f"[SKIP] skipped {player_id}: no steamcommunity.")
                continue
            
            results.append(result)
            print(f"[INFO] added {player_id} (steamid64: {result['steam_id']})")
        
        await browser.close()
        return results

def save_current_progress(results):
    if os.path.isfile(SAVE_PATH):
        with open(SAVE_PATH, 'r') as f:
            player_json = json.load(f)
    else:
        player_json = {}
    
    for result in results:
        if result.get('steam_id'):
            player_json[result['player_id']] = {
                "steamid": result['steam_id'],
                "type": "pro",
                "image": result.get('image_url')
            }
    
    with open(SAVE_PATH, 'w') as f:
        json.dump(player_json, f, indent=2)

if os.path.isfile(SAVE_PATH):
    with open(SAVE_PATH, 'r') as f:
        player_json = json.load(f)
    print(f"[INFO] loaded {len(player_json)} players from existing json :p")
else:
    player_json = {}

players = counterstrike_obj.get_players()
print("[INFO] total players fetched:", len(players))

players_to_scrape = []
for player in players:
    player_id = player.get('id')
    if not player_id:
        continue
    if player_id not in player_json:
        players_to_scrape.append(player)

print(f"[INFO] players to scrape: {len(players_to_scrape)}")

if players_to_scrape:
    results = asyncio.run(scrape_players(players_to_scrape))

    for result in results:
        if result.get('steam_id'):
            player_json[result['player_id']] = {
                "steamid": result['steam_id'],
                "type": "pro",
                "image": result.get('image_url')
            }
    
    with open(SAVE_PATH, 'w') as f:
        json.dump(player_json, f, indent=2)