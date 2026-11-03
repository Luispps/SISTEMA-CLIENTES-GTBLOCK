// APENAS APRESENTAÇÃO. Executa no navegador, sem autenticação ou segurança real.
// Nunca importar no servidor de produção nem carregar cadastros/credenciais reais.
export const DEMO_KEY='gtblock.presentation.v1';
export const accounts=[
 {id:'demo-ana',name:'Ana Oliveira',email:'ana@demo.gtblock.local',role:'client',customerId:'demo-ana'},
 {id:'demo-bruno',name:'Bruno Santos',email:'bruno@demo.gtblock.local',role:'client',customerId:'demo-bruno'},
 {id:'demo-support',name:'Equipe Atendimento',email:'equipe@demo.gtblock.local',role:'support',customerId:null},
 {id:'demo-admin',name:'Administração',email:'admin@demo.gtblock.local',role:'admin',customerId:null}
];
const copy=x=>structuredClone(x);
const error=(status,message)=>{throw Object.assign(new Error(message),{status});};
const field=(v,min,max)=>{if(typeof v!=='string'||v.trim().length<min||v.length>max)error(400,'Confira os campos informados.');return v.trim();};
const types=['Atendimento','Mudança de plano','Cancelamento','Atualização cadastral'];
const states=['Aberto','Em análise','Aguardando cliente','Concluído'];
export function createDemoApi({fixtures,storage,now=()=>new Date().toISOString(),uuid=()=>crypto.randomUUID()}){
 function initial(){const at='2026-11-01T14:30:00.000Z';return {version:1,userId:null,tickets:[{id:'GT-DEMO-0001',customer_id:'demo-ana',type:'Atendimento',subject:'Atualização de telefone',body:'Gostaria de atualizar meu telefone de contato.',status:'Em análise',created:at,updated:at,responsible:'demo-support',idem:'seed-ticket-ana'}],actions:[{id:1,ticket_id:'GT-DEMO-0001',actor:'demo-support',at,status:'Em análise',message:'Solicitação recebida. Aguardamos a confirmação dos novos dados.'}],audit:[]};}
 let state=initial();
 try{const saved=JSON.parse(storage?.getItem(DEMO_KEY)||'null');if(saved?.version===1&&Array.isArray(saved.tickets)&&Array.isArray(saved.actions)&&Array.isArray(saved.audit)&&saved.tickets.length<=100&&JSON.stringify(saved).length<400000)state=saved;}catch{/* armazenamento bloqueado/corrompido: demonstração em memória */}
 function persist(){try{storage?.setItem(DEMO_KEY,JSON.stringify(state));}catch{/* continua em memória se não houver quota/permissão */}}
 function audit(user,event,resource=''){state.audit.push({id:state.audit.length+1,actor:user?.id||null,event,resource,at:now()});state.audit=state.audit.slice(-100);}
 const account=()=>accounts.find(a=>a.id===state.userId);
 const staff=u=>{if(u.role==='client')error(403,'Área demonstrativa da equipe.');};
 const client=u=>{if(u.role!=='client')error(403,'Área demonstrativa do cliente.');};
 const tickets=u=>state.tickets.filter(t=>u.role!=='client'||t.customer_id===u.customerId).map(t=>({...t,customer_name:accounts.find(a=>a.customerId===t.customer_id)?.name,responsible_name:accounts.find(a=>a.id===t.responsible)?.name})).sort((a,b)=>b.updated.localeCompare(a.updated));
 function ownedTicket(u,id){const t=state.tickets.find(t=>t.id===id);if(!t||(u.role==='client'&&t.customer_id!==u.customerId))error(404,'Protocolo fictício não encontrado.');return t;}
 async function api(path,options={}){
  const url=new URL(path,'https://demo.invalid'),route=url.pathname,method=options.method||'GET';let b={};
  if(options.body){try{b=JSON.parse(options.body);}catch{error(400,'Dados inválidos.');}}
  if(route==='/config')return {mode:'browser-demo',emergencyPhones:['08004000190','08004000911'],supportWhatsapp:null,trackingUrl:'https://sis.getrak.com/gtblock/'};
  if(route==='/auth/login'&&method==='POST'){
   const email=field(b.email,3,254).toLowerCase();const u=accounts.find(a=>a.email===email);
   if(!u||b.password!=='Demo!GTBlock2026')error(401,'Use uma conta fictícia e a senha de demonstração informadas nesta tela.');
   state.userId=u.id;audit(u,'demo.login');persist();return {user:copy(u),csrf:'presentation-only'};
  }
  if(route==='/auth/recover'&&method==='POST')return {message:'Simulação: nenhum email foi enviado e nenhuma senha foi alterada. Para explorar, use as contas fictícias e a senha Demo!GTBlock2026.'};
  if(route==='/auth/activate')error(400,'Ativação de contas reais indisponível na apresentação. Use os acessos fictícios.');
  const u=account();if(!u)error(401,'Entre com uma conta de demonstração.');
  if(route==='/auth/session')return {user:copy(u),csrf:'presentation-only'};
  if(route==='/auth/logout'&&method==='POST'){audit(u,'demo.logout');state.userId=null;persist();return {ok:true};}
  if(route==='/portal'&&method==='GET'){
   client(u);const scenario=url.searchParams.get('scenario')||'normal';
   if(scenario==='unavailable')error(503,'Indisponibilidade simulada. Nenhum fornecedor real foi consultado.');
   if(!['normal','empty'].includes(scenario))error(400,'Cenário inválido.');
   const values=scenario==='empty'?{source:'mock',subscription:null,vehicles:[],invoices:[],contracts:[]}:copy(fixtures[u.customerId]);
   return {...values,customer:{id:u.customerId,name:u.name,email:u.email,phone:'Não informado'},tickets:tickets(u)};
  }
  const resource=route.match(/^\/(invoices|contracts)\/([^/]+)\/preview$/);
  if(resource&&method==='GET'){
   client(u);const item=fixtures[u.customerId]?.[resource[1]].find(x=>x.id===resource[2]);if(!item)error(404,'Exemplo não encontrado.');
   return {demo:true,title:item.name||item.label,item:copy(item),message:resource[1]==='invoices'?'Exemplo fictício, sem validade. Não é boleto e não pode ser pago. Integração SIPROV ainda não conectada.':'Documento fictício sem validade. Consulta e assinatura reais dependem da integração ZapSign.'};
  }
  if(route==='/tickets'&&method==='GET')return {tickets:tickets(u)};
  if(route==='/tickets'&&method==='POST'){
   client(u);const type=field(b.type,1,60),subject=field(b.subject,4,120),message=field(b.body,10,2000),idem=field(options.headers?.['Idempotency-Key'],10,100);
   if(!types.includes(type))error(400,'Tipo inválido.');
   const existing=state.tickets.find(t=>t.customer_id===u.customerId&&t.idem===idem);if(existing)return {ticket:copy(existing)};
   if(state.tickets.length>=100)error(429,'Limite desta demonstração atingido. Reinicie a demonstração para continuar.');
   const at=now(),id='GT-DEMO-'+uuid().slice(0,8).toUpperCase();
   const t={id,customer_id:u.customerId,type,subject,body:message,status:'Aberto',created:at,updated:at,responsible:null,idem};
   state.tickets.push(t);state.actions.push({id:state.actions.length+1,ticket_id:id,actor:u.id,at,status:t.status,message});audit(u,'demo.ticket.created',id);persist();return {ticket:copy(t)};
  }
  const match=route.match(/^\/tickets\/([^/]+)$/);
  if(match&&method==='GET'){const t=ownedTicket(u,match[1]);return {ticket:copy(t),history:state.actions.filter(a=>a.ticket_id===t.id).map(a=>({...a,actor_name:accounts.find(u=>u.id===a.actor)?.name||'Demonstração'}))};}
  if(match&&method==='PATCH'){
   staff(u);const t=ownedTicket(u,match[1]),message=field(b.message,3,2000);if(!states.includes(b.status))error(400,'Situação inválida.');
   if(state.actions.length>=500)error(429,'Limite desta demonstração atingido. Reinicie para continuar.');
   Object.assign(t,{status:b.status,responsible:u.id,updated:now()});state.actions.push({id:state.actions.length+1,ticket_id:t.id,actor:u.id,at:t.updated,status:t.status,message});audit(u,'demo.ticket.updated',t.id);persist();return {ticket:copy(t)};
  }
  if(route==='/staff/customers'&&method==='GET'){staff(u);return {customers:accounts.filter(a=>a.role==='client').map(a=>({id:a.customerId,name:a.name,email:a.email}))};}
  if(route==='/staff/audit'&&method==='GET'){if(u.role!=='admin')error(403,'Exclusivo do perfil demonstrativo de administrador.');return {events:copy(state.audit).reverse()};}
  error(404,'Ação não disponível nesta demonstração.');
 }
 api.reset=()=>{state=initial();persist();};return api;
}
