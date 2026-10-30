"""Browser regression with synthetic channels only; never loads a real browser profile.
Run: python tests/layout_browser.py (requires playwright and Chrome).
"""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from datetime import date
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_): pass
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
today = date.today(); start = today.replace(day=1).isoformat()
state = {'channels': [{'id': str(i), 'name': 'Тестовый канал ' + str(i), 'start': start,
    'accent': '#ffd84d,#f2cb3f', 'workspace': {'model': 'gpt'},
    **({'freezePeriods': [{'start': start, 'end': None}]} if i in [3, 4] else {})} for i in range(9)],
    'marks': {str(i): {start: 'done'} for i in range(9)}}
try:
 with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1080})
    errors = []; page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('http://127.0.0.1:' + str(server.server_port))
    page.evaluate('(s)=>localStorage.setItem("uploadtracker:v1",JSON.stringify(s))', state)
    page.reload()
    assert page.locator('.overview-grid').first.locator('[data-card]').count() == 7
    assert not page.locator('.paused-group').evaluate('(e)=>e.open')
    assert page.evaluate('JSON.parse(localStorage.getItem("uploadtracker:v1"))') == state
    page.evaluate('window.keptCard=document.querySelector("[data-card=\\"1\\"]")')
    page.locator('[data-ch="0"][data-d="' + start + '"]').click()
    page.locator('[data-set="rest"]').click()
    assert page.evaluate('window.keptCard===document.querySelector("[data-card=\\"1\\"]")')
    page.wait_for_timeout(500)
    updated = page.evaluate('JSON.parse(localStorage.getItem("uploadtracker:v1"))')
    expected = json.loads(json.dumps(state)); expected['marks']['0'][start] = 'rest'
    assert updated == expected
    page.locator('[data-open-channel="8"]').click()
    assert page.locator('[data-card]').count() == 1
    assert page.locator('.channel-nav').count() == 9
    page.locator('[data-workspace] summary').click()
    page.locator('[data-own-url]').fill('https://youtube.com/@draft')
    page.locator('[data-layout="overview"]').click()
    page.locator('[data-open-channel="8"]').click()
    assert page.locator('[data-own-url]').input_value() == 'https://youtube.com/@draft'
    page.locator('[data-workspace-save]').click()
    page.wait_for_function('JSON.parse(localStorage.getItem("uploadtracker:v1")).channels[8].workspace.channelURL === "https://youtube.com/@draft"')
    page.reload()
    assert page.locator('[data-card="8"]').count() == 1
    page.locator('[data-open-channel="8"]').focus()
    page.keyboard.press('Home'); assert page.locator('[data-card="0"]').count() == 1
    page.locator('[data-open-channel="3"]').click()
    assert page.locator('[data-card="3"] .day:not(.pad):not([disabled])').count() == 0
    page.locator('[data-freeze="3"]').click()
    assert page.locator('[data-freeze="3"]').get_attribute('aria-pressed') == 'false'
    page.locator('#privacyBtn').click()
    assert 'Тестовый канал' not in page.locator('#grid').inner_text()
    page.locator('#privacyBtn').click()
    for width in [1440, 1024, 390]:
        page.set_viewport_size({'width': width, 'height': 900})
        for mode in ['overview', 'focus']:
            page.locator('[data-layout="' + mode + '"]').click()
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), (width, mode)
    assert not errors, errors
    browser.close()
    print('PASS: nine channels, isolated day update, data preservation, drafts/save, reload, keyboard, pause/resume, privacy, desktop/tablet/mobile')
finally:
 server.shutdown()
