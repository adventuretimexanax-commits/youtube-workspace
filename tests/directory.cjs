const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
scripts.forEach(script => new vm.Script(script));
const data = new Map([['uploadtracker:v1', JSON.stringify({channels:[],marks:{'test':'preserve'}})]]);
let fail = false;
const elements = new Map();
function element() {
  return {style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},getAttribute(){return 'dark';},
    addEventListener(){},querySelectorAll(){return [];},focus(){},innerHTML:'',textContent:''};
}
const context = vm.createContext({URL,Promise,console,setTimeout(){return 1;},clearTimeout(){},
  window:{addEventListener(){}},localStorage:{getItem(k){return data.get(k)||null;},setItem(k,v){if(fail)throw Error('quota');data.set(k,v);},removeItem(k){data.delete(k);}},
  document:{documentElement:element(),getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},addEventListener(){}}
});
vm.runInContext(scripts.at(-1).replace(/\}\)\(\);\s*$/, 'globalThis.api = { directoryRows, openDirectory }; })();'), context);
const normalize = rows => JSON.parse(JSON.stringify(context.api.directoryRows(rows)));
const original = data.get('uploadtracker:v1');
const row = {email:'test@gmail.com',linkedEmail:'linked@gmail.com',name:'Канал',subscription:'Plus',proxy:'socks5://127.0.0.1:1080',password:'discard',twofa:'discard'};
assert.deepEqual(normalize([row]), [{email:row.email,linkedEmail:row.linkedEmail,name:row.name,subscription:row.subscription,proxy:row.proxy}]);
assert.equal(normalize([{email:'old@gmail.com'}])[0].linkedEmail,'','old rows stay compatible');
assert.throws(()=>normalize([{linkedEmail:'linked@example.com'}]));
for (const proxy of ['user:pass@host:80','https://user:pass@host:80','host:80/token','host:80?key=x','host:0','host:65536','host:80\npassword']) {
  assert.throws(()=>normalize([{proxy}]), undefined, proxy);
}
assert.equal(normalize([{proxy:'[::1]:80'}])[0].proxy,'[::1]:80');
assert.throws(()=>normalize([{email:'test@example.com'}]));
assert.throws(()=>normalize(Array(1001).fill({})));
assert.throws(()=>normalize([{name:'x'.repeat(301)}]));
context.api.openDirectory();
assert.match(elements.get('veil').innerHTML,/role="dialog"/);
elements.get('dbSave').onclick();
assert.equal(data.get('uploadtracker:directory:v1'),'[]');
assert.equal(data.get('uploadtracker:v1'),original,'calendar data untouched');
data.set('uploadtracker:directory:v1',JSON.stringify([row]));
context.api.openDirectory();
assert.match(elements.get('dbRows').innerHTML,/type="password" data-db-field="email"/);
assert.match(elements.get('dbRows').innerHTML,/type="password" data-db-field="linkedEmail"/);
assert.match(elements.get('dbRows').innerHTML,/type="password" data-db-field="proxy"/);
assert.doesNotMatch(elements.get('dbRows').innerHTML,/value="discard"/);
elements.get('dbSave').onclick();
assert.deepEqual(JSON.parse(data.get('uploadtracker:directory:v1')),normalize([row]));
elements.get('dbRows').oninput({target:{getAttribute(a){return a==='data-db-field'?'name':'0';},value:'Changed'}});
fail=true;
elements.get('dbSave').onclick();
assert.match(elements.get('dbStatus').textContent,/Не сохранено/);
assert.equal(JSON.parse(data.get('uploadtracker:directory:v1'))[0].name,'Канал');
fail=false;
elements.get('dbSave').onclick();
assert.equal(JSON.parse(data.get('uploadtracker:directory:v1'))[0].name,'Changed');
context.api.openDirectory();
assert.match(elements.get('dbRows').innerHTML,/type="password" data-db-field="email"/);
assert.equal(data.get('uploadtracker:v1'),original);
console.log('PASS: syntax, directory save/reopen, masking, allowlisted fields, proxy credential rejection, quota failure, calendar isolation');
