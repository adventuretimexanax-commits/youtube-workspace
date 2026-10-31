"""Schedule UI regression, deterministic Moscow clock and isolated synthetic data."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*_): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
state={'channels':[{'id':i,'name':n,'start':'2026-01-01','accent':'#ffd84d,#f2cb3f',**({'freezePeriods':[{'start':'2026-10-30','end':None}]} if i=='pause' else {})} for i,n in [('a','Техника'),('b','Религия'),('c','Без планов'),('d','Старый план'),('pause','На паузе')]],'marks':{'a':{'2026-11-01':'done','2026-11-02':'plan','2026-11-15':'plan','2027-01-01':'plan'},'b':{'2026-10-30':'plan','2026-10-31':'plan','2026-11-15':'plan'},'c':{'2026-10-30':'miss','2026-11-01':'rest'},'d':{'2026-10-29':'plan'},'pause':{'2026-11-01':'plan'}}}
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='chrome',headless=True)
  ctx=browser.new_context(timezone_id='Europe/Moscow',viewport={'width':1440,'height':1000})
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.add_init_script("""window.__testNow=Date.parse('2026-10-31T12:00:00+03:00');const NativeDate=Date;window.Date=class extends NativeDate{constructor(...a){super(...(a.length?a:[window.__testNow]));}static now(){return window.__testNow;}};""")
  page.goto('http://127.0.0.1:'+str(server.server_port))
  page.evaluate('(s)=>localStorage.setItem("uploadtracker:v1",JSON.stringify(s))',state);page.reload()
  page.locator('[data-open-channel="a"]').click()
  def row(id):return page.locator('[data-order-row="'+id+'"]')
  assert row('a').locator('.channel-schedule').inner_text()=='Следующее: 2 ноября'
  assert row('b').locator('.schedule-today').inner_text()=='Сегодня: 31 октября'
  assert row('b').locator('.schedule-overdue').inner_text()=='Просрочено: 30 октября'
  assert row('c').locator('.channel-schedule').inner_text()=='Не запланировано'
  assert row('d').locator('.channel-schedule').inner_text()=='Просрочено: 29 октября'
  assert 'На паузе' in row('pause').locator('.channel-schedule').inner_text()
  assert 'выложено' not in page.locator('.channel-rail').inner_text()
  assert 'пропусков' not in page.locator('.channel-rail').inner_text()
  assert page.locator('.card-foot').count()==1
  assert page.evaluate('JSON.parse(localStorage.getItem("uploadtracker:v1"))')==state
  page.locator('#nextM').click()
  assert row('a').locator('.channel-schedule').inner_text()=='Следующее: 2 ноября'
  page.locator('[data-ch="a"][data-d="2026-11-02"]').click();page.locator('[data-set="clear"]').click()
  assert row('a').locator('.channel-schedule').inner_text()=='Следующее: 15 ноября'
  page.locator('[data-ch="a"][data-d="2026-11-15"]').click();page.locator('[data-set="done"]').click()
  assert row('a').locator('.channel-schedule').inner_text()=='Следующее: 1 января 2027'
  page.wait_for_timeout(300);page.reload()
  assert row('a').locator('.channel-schedule').inner_text()=='Следующее: 1 января 2027'
  before=page.evaluate('localStorage.getItem("uploadtracker:v1")')
  page.evaluate("window.__testNow=Date.parse('2026-11-01T12:00:00+03:00');window.dispatchEvent(new Event('focus'))")
  assert row('b').locator('.schedule-today').count()==0
  assert row('b').locator('.schedule-next').inner_text()=='Следующее: 15 ноября'
  assert row('b').locator('.schedule-overdue').count()==1
  assert page.evaluate('localStorage.getItem("uploadtracker:v1")')==before
  for width in [1440,1024,390]:
   page.set_viewport_size({'width':width,'height':900})
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not errors,errors
  browser.close()
  print('PASS: live schedule labels, next-month/year, today/overdue, paused/empty, immediate edit update, reload, midnight, untouched data, responsive layout')
finally:server.shutdown()
