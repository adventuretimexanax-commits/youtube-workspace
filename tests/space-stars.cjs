const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync(require('node:path').join(__dirname,'../space-stars.js'),'utf8');
function boot(reduce=false){
 const events={},media={},frames=new Map(),timers=new Map();let seq=0,draws=0;
 const gradient={addColorStop(){}};
 const ctx=new Proxy({drawImage(){draws++},createRadialGradient(){return gradient}}, {get(t,k){return k in t?t[k]:()=>{}}});
 const canvas={getContext(){return ctx}};
 const reduced={matches:reduce,addEventListener(n,f){media[n]=f}};
 const document={hidden:false,getElementById(){return canvas},createElement(){return {getContext(){return ctx}}},addEventListener(n,f){events[n]=f}};
 vm.runInNewContext(code,{document,matchMedia:()=>reduced,innerWidth:3840,innerHeight:2160,devicePixelRatio:3,performance:{now:()=>0},addEventListener(n,f){events[n]=f},requestAnimationFrame(f){frames.set(++seq,f);return seq},cancelAnimationFrame(id){frames.delete(id)},setTimeout(f){timers.set(++seq,f);return seq},clearTimeout(id){timers.delete(id)}});
 return {document,canvas,reduced,events,media,frames,timers,get draws(){return draws},step(now){const p=[...frames.values()];frames.clear();p.forEach(f=>f(now));}};
}
const a=boot();assert.ok(a.canvas.width*a.canvas.height<=3010000,'4K canvas capped to 3MP');
assert.equal(a.frames.size,1);let before=a.draws;a.step(10);assert.equal(a.draws,before,'20 fps cap');a.step(60);assert.equal(a.draws,before+42);
a.events.scroll();assert.equal(a.frames.size,0,'scroll pauses animation');[...a.timers.values()].forEach(f=>f());assert.equal(a.frames.size,1);
a.document.hidden=true;a.events.visibilitychange();assert.equal(a.frames.size,0,'hidden tab cancels animation');
a.document.hidden=false;a.events.visibilitychange();assert.equal(a.frames.size,1);
a.reduced.matches=true;a.media.change();assert.equal(a.frames.size,0,'reduced motion is static');
assert.equal(boot(true).frames.size,0);
assert.doesNotMatch(code,/fetch\(|localStorage|XMLHttpRequest|getContext\(['"]webgl/);
console.log('PASS: star sprite rendering, 20fps/3MP caps, scroll/hidden pause, reduced motion, no data access');
