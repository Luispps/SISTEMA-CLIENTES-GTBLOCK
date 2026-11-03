import http from 'node:http';
import {readFile,appendFile} from 'node:fs/promises';
import {resolve,extname,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID,timingSafeEqual} from 'node:crypto';
import {db,hash,secret,passwordValid,passwordHash,dummyPassword,audit,limited,dataDir} from './db.mjs';
import {customerData,ownedResource,IntegrationUnavailable} from './integrations.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../public');
const production=process.env.NODE_ENV==='production';
const origin=process.env.APP_ORIGIN||'http://127.0.0.1:4310';
if(production) throw new Error('Publicação bloqueada: etapa local. Homologar integrações, email, MFA da equipe, infraestrutura e políticas antes de habilitar produção.');
const cookieName='gtblock_session';
const safeUser=u=>({id:u.id,name:u.name,email:u.email,role:u.role,customerId:u.customer_id});
const equal=(a,b)=>{const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&timingSafeEqual(x,y);};
function fail(status,message){throw Object.assign(new Error(message),{status});}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
async function body(req){if(!req.headers['content-type']?.startsWith('application/json'))fail(415,'Envie JSON.');let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>16384)fail(413,'Dados muito extensos.');}try{return JSON.parse(raw||'{}');}catch{fail(400,'JSON inválido.');}}
const text=(v,min=1,max=200)=>{if(typeof v!=='string'||v.trim().length<min||v.length>max)fail(400,'Confira os campos informados.');return v.trim();};
function session(req){const token=req.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1);if(!token)return null;return db.prepare('SELECT u.*,s.csrf,s.hash AS session_hash FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.hash=? AND s.expires>?').get(hash(token),Date.now());}
const staff=u=>{if(!['support','admin'].includes(u.role))fail(403,'Acesso exclusivo da equipe.');};
const client=u=>{if(u.role!=='client'||!u.customer_id)fail(403,'Área exclusiva do cliente.');};
function ticketFor(u,id){const t=db.prepare('SELECT * FROM tickets WHERE id=?').get(id);if(!t||(u.role==='client'&&t.customer_id!==u.customer_id))fail(404,'Protocolo não encontrado.');return t;}
function ticketList(u){return db.prepare(`SELECT t.*,c.name AS customer_name,u.name AS responsible_name FROM tickets t JOIN customers c ON c.id=t.customer_id LEFT JOIN users u ON u.id=t.responsible ${u.role==='client'?'WHERE t.customer_id=?':''} ORDER BY t.updated DESC`).all(...(u.role==='client'?[u.customer_id]:[]));}
export const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('Cache-Control','no-store');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
 try{
 const url=new URL(req.url,origin),path=url.pathname;
 if(path==='/api/health'&&req.method==='GET')return json(res,200,{status:'ok',mode:'local-demo'});
 if(path.startsWith('/api/')){
  if(limited('global:'+req.socket.remoteAddress,600,60000))fail(429,'Muitas requisições. Aguarde um minuto.');
  if(!['GET','HEAD'].includes(req.method)&&path!=='/api/webhooks/zapsign'){
   if(req.headers.origin!==origin)fail(403,'Origem não autorizada.');
  }
  if(path==='/api/config'&&req.method==='GET')return json(res,200,{mode:'mock',emergencyPhones:['08004000190','08004000911'],supportWhatsapp:/^\d{10,15}$/.test(process.env.SUPPORT_WHATSAPP||'')?process.env.SUPPORT_WHATSAPP:null,trackingUrl:'https://sis.getrak.com/gtblock/'});
  if(path==='/api/auth/login'&&req.method==='POST'){
   const b=await body(req);const email=text(b.email,3,254).toLowerCase(),password=text(b.password,1,256);
   if(limited('login-ip:'+req.socket.remoteAddress,30)||limited('login:'+hash(email),6))fail(429,'Tentativas excedidas. Tente novamente em 15 minutos.');
   const u=db.prepare('SELECT * FROM users WHERE email=?').get(email);
   const valid=passwordValid(password,u?.password||dummyPassword);
   if(!u||!u.password||!valid){audit(null,'login.failed');fail(401,'Email ou senha inválidos.');}
   const previous=session(req);if(previous)db.prepare('DELETE FROM sessions WHERE hash=?').run(previous.session_hash);
   const token=secret(),csrf=secret();db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(hash(token),u.id,csrf,Date.now()+3600000);
   res.setHeader('Set-Cookie',`${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600${production?'; Secure':''}`);
   audit(u.id,'login.success');return json(res,200,{user:safeUser(u),csrf});
  }
  if(path==='/api/auth/recover'&&req.method==='POST'){
   const b=await body(req),email=text(b.email,3,254).toLowerCase();
   if(limited('recover-ip:'+req.socket.remoteAddress,10)||limited('recover:'+hash(email),3))fail(429,'Aguarde antes de solicitar um novo link.');
   const u=db.prepare('SELECT * FROM users WHERE email=?').get(email);
   if(u){const token=secret();db.prepare('DELETE FROM tokens WHERE user_id=?').run(u.id);db.prepare('INSERT INTO tokens VALUES(?,?,?,?)').run(hash(token),u.id,'reset',Date.now()+1800000);await appendFile(resolve(dataDir,'dev-mailbox.jsonl'),JSON.stringify({to:email,url:`${origin}/#ativar?token=${token}`,expiresIn:'30 minutos'})+'\n',{mode:0o600});audit(u.id,'recovery.requested');}
   return json(res,200,{message:'Se houver um cadastro autorizado, o link será enviado ao contato verificado. Nesta demonstração, o envio é simulado em caixa local.'});
  }
  if(path==='/api/auth/activate'&&req.method==='POST'){
   if(limited('activate:'+req.socket.remoteAddress,10))fail(429,'Muitas tentativas. Aguarde 15 minutos.');
   const b=await body(req),token=text(b.token,20,256),password=text(b.password,12,128);
   const t=db.prepare('SELECT * FROM tokens WHERE hash=? AND expires>?').get(hash(token),Date.now());if(!t)fail(400,'Link inválido ou expirado. Solicite outro.');
   db.exec('BEGIN IMMEDIATE');try{db.prepare('UPDATE users SET password=? WHERE id=?').run(passwordHash(password),t.user_id);db.prepare('DELETE FROM tokens WHERE user_id=?').run(t.user_id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(t.user_id);audit(t.user_id,'password.changed');db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
   return json(res,200,{message:'Senha definida. Entre com seu email e a nova senha.'});
  }
  if(path==='/api/webhooks/zapsign'&&req.method==='POST'){
   const key=process.env.ZAPSIGN_WEBHOOK_SECRET;if(!key)fail(503,'Webhook não configurado.');
   if(!equal(req.headers.authorization,`Bearer ${key}`))fail(401,'Não autorizado.');
   const event=await body(req);const digest=hash(JSON.stringify(event));
   // Registra apenas digest. Não altera contratos a partir de payload não reconciliado.
   db.prepare('INSERT OR IGNORE INTO webhook_events VALUES(?,?,?,?)').run(digest,'zapsign',new Date().toISOString(),'pending_reconciliation');
   return json(res,200,{received:true,reconciliation:'pending',demo:true});
  }
  const u=session(req);if(!u)fail(401,'Sua sessão expirou. Entre novamente.');
  if(!['GET','HEAD'].includes(req.method)&&!equal(req.headers['x-csrf-token'],u.csrf))fail(403,'Atualize a página e tente novamente.');
  if(path==='/api/auth/session'&&req.method==='GET')return json(res,200,{user:safeUser(u),csrf:u.csrf});
  if(path==='/api/auth/logout'&&req.method==='POST'){db.prepare('DELETE FROM sessions WHERE hash=?').run(u.session_hash);res.setHeader('Set-Cookie',`${cookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);audit(u.id,'logout');return json(res,200,{ok:true});}
  if(path==='/api/portal'&&req.method==='GET'){client(u);const scenario=url.searchParams.get('scenario')||'normal';if(!['normal','empty','unavailable'].includes(scenario))fail(400,'Cenário inválido.');const customer=db.prepare('SELECT id,name,email,phone FROM customers WHERE id=?').get(u.customer_id);return json(res,200,{customer,...customerData(u.customer_id,scenario),tickets:ticketList(u)});}
  const resource=path.match(/^\/api\/(invoices|contracts)\/([^/]+)\/preview$/);
  if(resource&&req.method==='GET'){client(u);const item=ownedResource(u.customer_id,resource[1],resource[2]);if(!item)fail(404,'Recurso não encontrado.');audit(u.id,'mock_resource.viewed',item.id);return json(res,200,{demo:true,title:item.name||item.label,message:resource[1]==='invoices'?'Exemplo visual. Este não é um boleto, não contém código de pagamento e não pode ser pago. O arquivo oficial dependerá da integração SIPROV.':'Documento fictício para validar navegação. Não possui conteúdo contratual nem validade. Consulta, download e assinatura oficiais dependem da integração ZapSign.',item});}
  if(path==='/api/tickets'&&req.method==='GET')return json(res,200,{tickets:ticketList(u)});
  if(path==='/api/tickets'&&req.method==='POST'){
   client(u);const b=await body(req),type=text(b.type),subject=text(b.subject,4,120),message=text(b.body,10,2000),idem=text(req.headers['idempotency-key'],10,100);
   if(!['Atendimento','Mudança de plano','Cancelamento','Atualização cadastral'].includes(type))fail(400,'Tipo inválido.');
   const existing=db.prepare('SELECT * FROM tickets WHERE customer_id=? AND idem=?').get(u.customer_id,idem);if(existing)return json(res,200,{ticket:existing});
   if(limited('ticket:'+u.id,20,3600000))fail(429,'Limite de solicitações atingido. Aguarde.');
   const id='GT-'+new Date().getUTCFullYear()+'-'+randomUUID().slice(0,8).toUpperCase(),at=new Date().toISOString();
   db.exec('BEGIN IMMEDIATE');try{
    db.prepare('INSERT INTO tickets VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,u.customer_id,type,subject,message,'Aberto',at,at,null,idem);
    db.prepare('INSERT INTO actions(ticket_id,actor,at,status,message) VALUES(?,?,?,?,?)').run(id,u.id,at,'Aberto',message);audit(u.id,'ticket.created',id);db.exec('COMMIT');
   }catch(e){db.exec('ROLLBACK');throw e;}
   return json(res,201,{ticket:ticketFor(u,id)});
  }
  const ticket=path.match(/^\/api\/tickets\/([^/]+)$/);
  if(ticket&&req.method==='GET'){const t=ticketFor(u,ticket[1]);return json(res,200,{ticket:t,history:db.prepare('SELECT a.*,u.name AS actor_name FROM actions a JOIN users u ON u.id=a.actor WHERE ticket_id=? ORDER BY a.id').all(t.id)});}
  if(ticket&&req.method==='PATCH'){
   staff(u);const t=ticketFor(u,ticket[1]),b=await body(req),status=text(b.status),message=text(b.message,3,2000);if(!['Aberto','Em análise','Aguardando cliente','Concluído'].includes(status))fail(400,'Situação inválida.');
   const at=new Date().toISOString();db.exec('BEGIN IMMEDIATE');try{db.prepare('UPDATE tickets SET status=?,updated=?,responsible=? WHERE id=?').run(status,at,u.id,t.id);db.prepare('INSERT INTO actions(ticket_id,actor,at,status,message) VALUES(?,?,?,?,?)').run(t.id,u.id,at,status,message);audit(u.id,'ticket.updated',t.id);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return json(res,200,{ticket:ticketFor(u,t.id)});
  }
  if(path==='/api/staff/customers'&&req.method==='GET'){staff(u);return json(res,200,{customers:db.prepare('SELECT id,name,email FROM customers ORDER BY name').all()});}
  if(path==='/api/staff/audit'&&req.method==='GET'){if(u.role!=='admin')fail(403,'Acesso exclusivo de administradores.');return json(res,200,{events:db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 100').all()});}
  fail(404,'Rota não encontrada.');
 }
 if(req.method!=='GET'&&req.method!=='HEAD')fail(405,'Método não permitido.');
 const name=path==='/'?'index.html':decodeURIComponent(path.slice(1));const file=resolve(root,name);if(!file.startsWith(root+ '/'.replace('/',process.platform==='win32'?'\\':'/')))fail(404,'Arquivo não encontrado.');
 const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.svg':'image/svg+xml'};
 if(!types[extname(file)])fail(404,'Arquivo não encontrado.');
 let bytes;try{bytes=await readFile(file);}catch{fail(404,'Arquivo não encontrado.');}res.writeHead(200,{'Content-Type':types[extname(file)]});res.end(req.method==='HEAD'?undefined:bytes);
 }catch(e){const status=e instanceof IntegrationUnavailable?503:e.status||500;json(res,status,{error:status===500?'Não foi possível concluir. Tente novamente.':e.message,code:status===503?'INTEGRATION_UNAVAILABLE':undefined});}
});
server.listen(Number(process.env.PORT||4310),process.env.HOST||'127.0.0.1',()=>console.log(`GTBLOCK local: ${origin} — dados fictícios; nenhuma integração real ativa.`));
