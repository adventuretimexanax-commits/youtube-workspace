const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const html = fs.readFileSync(path.join(__dirname, '../index.html'),'utf8');
const css = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n');
assert.match(css,/--pulse: #ffd84d/);
assert.match(css,/--pulse-deep: #f2cb3f/);
assert.match(css,/#app-root \.btn-primary\s*\{/,'primary fill overrides base button reset');
assert.match(css,/#app-root \.b-save\s*\{/,'save fill overrides base button reset');
assert.ok(!css.includes('#ffe600') && !css.includes('#fff34d'),'no neon success fills');
assert.match(css,/0 0 20px rgba\(255,216,77,0\.2\)/,'restored calendar glow');
assert.match(css,/backdrop-filter: blur\(12px\) saturate\(150%\)/,'glass blur');
assert.match(css,/rgba\(255,216,77,0\.09\) 55%/,'transparent gold glass');
assert.match(css,/color: #ffe390/,'readable light label on transparent gold');
assert.match(css,/\.btn-primary::after/,'lower glass reflection');
assert.match(css,/\.btn-primary::before/,'glass reflections');
assert.match(css,/border-radius: inherit; pointer-events: none/,'reflections cannot block clicks');
assert.match(css,/--page: #090b10/);
assert.match(css,/#app-root \.day\.st-done\s*\{\s*color: #171600/);
assert.match(css,/#app-root \.opt-yes\s*\{\s*color: #171600/);
assert.match(css,/accent-color: var\(--pulse\)/);
for (const green of ['#00d76f','#00b25b','#1ceb85','#2ae893','#00bd6d','0,215,111','0,178,91','0, 190, 130']) {
  assert.ok(!css.includes(green),`old green remains: ${green}`);
}
assert.match(html,/t = 'dark'/);
assert.match(html,/<html lang="ru" data-theme="dark">/);
assert.ok(!html.includes('id="themeBtn"'),'no light/dark switch');
assert.ok(!html.includes("localStorage.getItem('uploadtracker:theme')"),'old light preference ignored');
assert.ok(!html.includes('store.get(THEME_KEY)'),'cloud light preference cannot override dark');
assert.match(html,/var KEY = 'uploadtracker:v1'/);
assert.match(html,/var DB_KEY = 'uploadtracker:directory:v1'/);
assert.match(html,/indexOf\(ch.accent\) !== -1 \? '#ffd84d,#f2cb3f'/);
const vm = require('node:vm');
const groups = JSON.parse(html.match(/var COLOR_GROUPS = (\[[\s\S]*?\n\]);/)[1]);
const accents = groups.flatMap(group=>group.colors);
assert.equal(groups.length,12);
assert.ok(groups.every(group=>group.colors.length===8));
assert.equal(accents.length,96);
assert.equal(new Set(accents).size,96);
assert.ok(accents.every(a=>/^#[0-9a-f]{6},#[0-9a-f]{6}$/.test(a)));
function lightness(hex){let c=hex.slice(1).match(/../g).map(n=>parseInt(n,16));return (Math.min(...c)+Math.max(...c))/2;}
for(const group of groups) for(let i=1;i<8;i++)assert.ok(lightness(group.colors[i].split(',')[0])>lightness(group.colors[i-1].split(',')[0]),'ordered shades: '+group.name);
assert.match(html,/aria-pressed="' \+ \(a === draft.accent\)/);
assert.match(css,/\.swatches\s*\{[^}]*flex-wrap: wrap/);
const yellow = [242,203,63], ink = [23,22,0];
function luminance(rgb) { return rgb.map(c=>c/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0); }
assert.ok((luminance(yellow)+.05)/(luminance(ink)+.05)>7,'yellow cell contrast');
console.log('PASS: yellow palette, dark default, dark text contrast, legacy avatar display, stable storage keys');
