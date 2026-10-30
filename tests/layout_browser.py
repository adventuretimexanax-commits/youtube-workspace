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
    # New palette: cancel is nonmutating; choosing a shade survives reload.
    page.set_viewport_size({'width': 1440, 'height': 1080})
    page.locator('[data-open-channel="0"]').click()
    before = page.evaluate('localStorage.getItem("uploadtracker:v1")')
    page.locator('[data-edit="0"]').click()
    assert page.locator('[data-acc]').count() == 96
    assert page.locator('.color-family').count() == 12
    assert page.locator('[data-acc][aria-label]').count() == 96
    page.locator('#bCancel').click()
    assert page.evaluate('localStorage.getItem("uploadtracker:v1")') == before
    page.locator('[data-edit="0"]').click()
    choice = page.locator('[data-acc]').nth(55)
    chosen = choice.get_attribute('data-acc'); choice.click()
    assert page.locator('[data-acc][aria-pressed="true"]').count() == 1
    page.locator('#bSave').click()
    page.wait_for_function('(chosen)=>JSON.parse(localStorage.getItem("uploadtracker:v1")).channels[0].accent===chosen', arg=chosen)
    after = page.evaluate('JSON.parse(localStorage.getItem("uploadtracker:v1"))')
    original = json.loads(before); original['channels'][0]['accent'] = chosen
    assert after == original
    page.reload(); page.locator('[data-edit="0"]').click()
    assert page.locator('[data-acc][aria-pressed="true"]').get_attribute('data-acc') == chosen
    page.locator('#bCancel').click()
    assert page.locator('#space-stars').evaluate('(e)=>e.width*e.height') <= 3010000
    assert page.locator('.space-photo').evaluate('(e)=>getComputedStyle(e).backgroundImage').find('moon-background.png') >= 0
    assert page.locator('[data-card]').first.evaluate('(e)=>getComputedStyle(e).backdropFilter') == 'none'
    # Order is persisted in the existing channel array; all fields/marks remain exact.
    page.locator('[data-open-channel="0"]').click()
    before_order = page.evaluate('JSON.parse(localStorage.getItem("uploadtracker:v1"))')
    page.locator('[data-move-channel="0"][data-direction="1"]').click()
    page.wait_for_function('JSON.parse(localStorage.getItem("uploadtracker:v1")).channels[0].id === "1"')
    reordered = page.evaluate('JSON.parse(localStorage.getItem("uploadtracker:v1"))')
    assert reordered['marks'] == before_order['marks']
    assert {c['id']:c for c in reordered['channels']} == {c['id']:c for c in before_order['channels']}
    page.reload()
    assert page.locator('.channel-nav').first.get_attribute('data-open-channel') == '1'
    assert page.locator('[data-move-channel="1"][data-direction="-1"]').is_disabled()
    page.locator('[data-drag-channel="8"]').drag_to(page.locator('[data-order-row="1"]'), target_position={'x':60, 'y':2})
    page.wait_for_function('JSON.parse(localStorage.getItem("uploadtracker:v1")).channels[0].id === "8"')
    page.locator('[data-open-channel="8"]').focus(); page.keyboard.press('Alt+ArrowDown')
    page.wait_for_function('JSON.parse(localStorage.getItem("uploadtracker:v1")).channels[0].id === "1"')
    # Force a real storage failure. UI reverts order; no calendar changes are discarded.
    stable = page.evaluate('localStorage.getItem("uploadtracker:v1")')
    page.evaluate("""() => { window.originalStorageSet=Storage.prototype.setItem;
        Storage.prototype.setItem=function(k,v){if(k==='uploadtracker:v1')throw new Error('quota test');return window.originalStorageSet.call(this,k,v);}; }""")
    page.locator('[data-move-channel="0"][data-direction="1"]').click()
    page.wait_for_function('document.getElementById("toast").textContent.includes("Перемещение отменено")')
    assert page.evaluate('localStorage.getItem("uploadtracker:v1")') == stable
    assert page.locator('.channel-nav').first.get_attribute('data-open-channel') == '1'
    page.evaluate('() => { Storage.prototype.setItem=window.originalStorageSet; }')
    page.locator('[data-layout="overview"]').click()
    assert page.locator('[data-card]').first.get_attribute('data-card') == '1'
    # Neutral panels and an unblurred owner-provided background.
    assert page.locator('.space-photo').evaluate('(e)=>getComputedStyle(e).filter') == 'none'
    assert '#222222' in page.locator('[data-card]').first.evaluate('(e)=>getComputedStyle(e).backgroundImage') or '34, 34, 34' in page.locator('[data-card]').first.evaluate('(e)=>getComputedStyle(e).backgroundImage')
    assert not errors, errors
    browser.close()
    print('PASS: nine channels, isolated day update, data preservation, drafts/save, reload, keyboard, pause/resume, privacy, 96 colors/save/cancel, reorder/drag/keyboard/reload/rollback, desktop/tablet/mobile')
finally:
 server.shutdown()
