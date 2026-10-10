const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const html = fs.readFileSync(path.join(__dirname, '../index.html'),'utf8');
const css = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n');
assert.match(css,/--pulse: #ffe600/);
assert.match(css,/--page: #090b10/);
assert.match(css,/#app-root \.day\.st-done\s*\{\s*color: #171600/);
assert.match(css,/#app-root \.opt-yes\s*\{\s*color: #171600/);
assert.match(css,/accent-color: var\(--pulse\)/);
for (const green of ['#00d76f','#00b25b','#1ceb85','#2ae893','#00bd6d','0,215,111','0,178,91','0, 190, 130']) {
  assert.ok(!css.includes(green),`old green remains: ${green}`);
}
assert.match(html,/t = 'dark'/);
assert.match(html,/var KEY = 'uploadtracker:v1'/);
assert.match(html,/var DB_KEY = 'uploadtracker:directory:v1'/);
assert.match(html,/ch.accent === '#00dd76,#0aa9a0' \? '#fff34d,#e8bd00'/);
const accents = html.match(/var ACCENTS = \[([\s\S]*?)\];/)[1].match(/'#[^']+'/g);
assert.equal(accents.length,24);
assert.equal(new Set(accents).size,24);
assert.match(css,/\.swatches\s*\{[^}]*flex-wrap: wrap/);
const yellow = [255,230,0], ink = [23,22,0];
function luminance(rgb) { return rgb.map(c=>c/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0); }
assert.ok((luminance(yellow)+.05)/(luminance(ink)+.05)>7,'yellow cell contrast');
console.log('PASS: yellow palette, dark default, dark text contrast, legacy avatar display, stable storage keys');
