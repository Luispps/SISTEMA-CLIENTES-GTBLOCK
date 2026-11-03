import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,readdirSync} from 'node:fs';
import {createDemoApi,DEMO_KEY} from '../demo/demo-api.mjs';
import {customerData} from '../server/integrations.mjs';
const fixtures={'demo-ana':customerData('demo-ana'),'demo-bruno':customerData('demo-bruno')};
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};};
const login=(api,email='ana@demo.gtblock.local')=>api('/auth/login',{method:'POST',body:JSON.stringify({email,password:'Demo!GTBlock2026'})});
const post=(api,path,data,headers)=>api(path,{method:'POST',body:JSON.stringify(data),headers});
before(()=>{const previous=readFileSync('public/app.js','utf8');const result=spawnSync(process.execPath,['scripts/build-demo.mjs'],{encoding:'utf8',env:{...process.env,INTEGRATION_MODE:'live'}});assert.equal(result.status,0,result.stderr);assert.equal(readFileSync('public/app.js','utf8'),previous);});
test('Vercel artifact is static, allowlisted, without database/server/env or API fetch',()=>{
 const files=readdirSync('dist',{recursive:true}).map(p=>p.replaceAll('\\','/')).filter(p=>!['brand'].includes(p)).sort();
 assert.deepEqual(files,['app.js','brand/gtblock-horizontal.webp','brand/gtblock-symbol.webp','demo-api.js','demo-fixtures.js','index.html','robots.txt','style.css'].sort());
 const app=readFileSync('dist/app.js','utf8');assert.equal(app.includes("fetch('/api'"),false);assert.match(app,/Acesso simulado/);assert.match(app,/Não use dados reais/);assert.equal(app.includes('Acesso protegido'),false);assert.match(readFileSync('dist/index.html','utf8'),/noindex,nofollow/);
 const config=JSON.parse(readFileSync('vercel.json','utf8'));assert.equal(config.outputDirectory,'dist');assert.equal(config.framework,null);assert.match(config.headers[0].headers.find(h=>h.key==='Content-Security-Policy').value,/connect-src 'none'/);
});
test('demo survives reload in same tab, but another visitor has separate state',async()=>{
 const a=storage(),b=storage(),api=createDemoApi({fixtures,storage:a});await login(api);
 const created=await post(api,'/tickets',{type:'Mudança de plano',subject:'Conhecer outro plano',body:'Exemplo fictício de pedido comercial.'},{'Idempotency-Key':'unique-test-demo-1'});
 const duplicate=await post(api,'/tickets',{type:'Mudança de plano',subject:'Conhecer outro plano',body:'Exemplo fictício de pedido comercial.'},{'Idempotency-Key':'unique-test-demo-1'});assert.equal(duplicate.ticket.id,created.ticket.id);
 const reload=createDemoApi({fixtures,storage:a});assert.equal((await reload('/auth/session')).user.id,'demo-ana');
 assert.ok((await reload('/tickets')).tickets.some(t=>t.id===created.ticket.id));
 const other=createDemoApi({fixtures,storage:b});await login(other);assert.equal((await other('/tickets')).tickets.length,1);
 assert.equal(a.getItem(DEMO_KEY).includes('Demo!GTBlock2026'),false);
});
test('demo models client/staff views, reply history and audit without changing plan',async()=>{
 const api=createDemoApi({fixtures,storage:storage()});await login(api);await assert.rejects(api('/staff/customers'),e=>e.status===403);
 const id=(await post(api,'/tickets',{type:'Mudança de plano',subject:'Contato comercial',body:'Demonstração do protocolo de mudança.'},{'Idempotency-Key':'unique-test-demo-2'})).ticket.id;
 await login(api,'bruno@demo.gtblock.local');await assert.rejects(api('/tickets/'+id),e=>e.status===404);await assert.rejects(api('/contracts/demo-ana-contract/preview'),e=>e.status===404);
 await login(api,'equipe@demo.gtblock.local');assert.ok((await api('/tickets')).tickets.some(t=>t.id===id));
 await api('/tickets/'+id,{method:'PATCH',body:JSON.stringify({status:'Em análise',message:'Exemplo de resposta da equipe.'})});await assert.rejects(api('/staff/audit'),e=>e.status===403);
 await login(api);assert.equal((await api('/tickets/'+id)).history.length,2);assert.equal((await api('/portal')).subscription.name,'PLUS');
 await login(api,'admin@demo.gtblock.local');assert.ok((await api('/staff/audit')).events.length>0);
});
test('demo empty/unavailable, recovery, reset and unavailable storage remain explicit',async()=>{
 const api=createDemoApi({fixtures,storage:{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}}});await login(api);
 assert.equal((await api('/portal?scenario=empty')).invoices.length,0);await assert.rejects(api('/portal?scenario=unavailable'),e=>e.status===503);
 const result=await post(api,'/auth/recover',{email:'example@example.invalid'});assert.match(result.message,/nenhum email foi enviado/);
 await assert.rejects(post(api,'/auth/activate',{token:'not-a-real-token'}),e=>e.status===400);
 api.reset();await assert.rejects(api('/auth/session'),e=>e.status===401);
});
