import {readFile,writeFile,mkdir,copyFile,rm} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=join(root,'dist');
// O build tem allowlist. Nunca copia data/, .env, backend, sessões ou segredos.
if(dirname(out)!==root||!out.endsWith('dist'))throw new Error('Diretório de saída inválido.');
await rm(out,{recursive:true,force:true});await mkdir(join(out,'brand'),{recursive:true});
for(const file of ['style.css','brand/gtblock-horizontal.webp','brand/gtblock-symbol.webp'])await copyFile(join(root,'public',file),join(out,file));
let html=await readFile(join(root,'public/index.html'),'utf8');
html=html.replace('<title>Área do cliente · GTBLOCK</title>','<title>Demonstração · Portal GTBLOCK</title><meta name="robots" content="noindex,nofollow,noarchive">');
await writeFile(join(out,'index.html'),html);
let app=await readFile(join(root,'public/app.js'),'utf8');
const apiLines=app.match(/^async function api\(path,options=\{\}\).*$/gm);if(apiLines?.length!==1)throw new Error('Entrada da API mudou; revisar adaptação da demonstração.');
app=app.replace(apiLines[0],`import {createDemoApi} from './demo-api.js';
import {fixtures} from './demo-fixtures.js';
let demoStorage;try{demoStorage=window.sessionStorage;}catch{}
const demoApi=createDemoApi({fixtures,storage:demoStorage});
async function api(path,options={}){try{return await demoApi(path,options);}catch(error){if(error.status===401&&user){user=null;data=null;renderLogin();}throw error;}}
document.addEventListener('click',e=>{if(e.target.closest('[data-reset-demo]')){showModal('Reiniciar demonstração','<p>Isso restaura somente os exemplos desta aba. Os dados fictícios de solicitações e respostas serão reiniciados.</p><button class="button primary full" data-confirm-reset>Reiniciar exemplos</button>');}else if(e.target.closest('[data-confirm-reset]')){demoApi.reset();location.hash='login';location.reload();}});`);
const replacements=[
 ['<span class="demo-label">AMBIENTE DE DEMONSTRAÇÃO</span>','<span class="demo-label">DEMONSTRAÇÃO NAVEGÁVEL</span><p class="notice demo-disclosure">Use somente as contas e os dados fictícios. Login e solicitações são simulados no navegador; nada é enviado à GTBLOCK.</p>'],
 ['Acesso protegido · Dados fictícios nesta versão','Acesso simulado · Sem contas reais'],
 ['Ambiente protegido','Demonstração sem dados reais'],
 ['Dados fictícios. SIPROV e ZapSign ainda não conectados.','Acesso e solicitações simulados. Use somente dados fictícios.'],
 ['Operação local de teste','Simulação nesta aba'],
 ['Ambiente local <span class="footer-dot">','Demonstração <button class="text-button demo-reset" data-reset-demo>Reiniciar exemplos</button> <span class="footer-dot">'],
 ['Seu pedido será registrado neste ambiente local. Não é um canal de emergência. Pedidos de mudança de plano serão encaminhados para contato do setor comercial.','Use apenas dados fictícios. Este pedido ficará somente nesta aba e não será enviado à GTBLOCK ou ao comercial. Não é um canal de emergência.'],
 ['Painel local com clientes fictícios. Alterar o estado de uma solicitação não altera contratos, planos ou cobranças.','Apresentação com contas fictícias. Respostas ficam somente nesta aba e não são enviadas à GTBLOCK.'],
 ['Solicitação registrada · Protocolo ','Simulação salva nesta aba · Protocolo '],
 ['Resposta registrada e histórico atualizado.','Resposta simulada salva somente nesta aba.'],
 ['A equipe revisará seu pedido. Para mudança de plano, o setor comercial entrará em contato. Prazo de atendimento a confirmar.','Exemplo de acompanhamento: na operação real, a equipe revisará o pedido. Nenhum funcionário ou setor comercial foi notificado nesta demonstração.'],
 ['Dúvidas sobre cobranças, cadastro e assinatura podem ser registradas por protocolo. Horário de atendimento a confirmar.','Nesta demonstração, protocolos servem apenas para explorar as telas e não chegam à equipe. Horário e canal administrativo a confirmar.'],
];
for(const [from,to]of replacements)app=app.split(from).join(to);
app=app.replace('O envio real de convites ainda não está habilitado.','Convites e recuperação reais não estão habilitados nesta apresentação.');
app=app.replace('placeholder="Conte o que você precisa. Não inclua senhas ou dados bancários."','placeholder="Exemplo fictício: gostaria de conhecer outros planos."');
app=app.replace('<details class="demo-access">','<details class="demo-access" open>');
// Marcação visível em todas as telas, inclusive no mobile onde o detalhe da barra é oculto.
app=app.replace('<main id="content" class="content" tabindex="-1"></main>','<div class="presentation-notice" role="note">Demonstração: acesso e solicitações simulados somente nesta aba. Não use dados reais.</div><main id="content" class="content" tabindex="-1"></main>');
await writeFile(join(out,'app.js'),app);
await copyFile(join(root,'demo/demo-api.mjs'),join(out,'demo-api.js'));
// Importa exclusivamente a fixture mock; não carrega db.mjs nem ambiente local.
const previous=process.env.INTEGRATION_MODE;process.env.INTEGRATION_MODE='mock';
const {customerData}=await import('../server/integrations.mjs');
const fixtures={};for(const id of ['demo-ana','demo-bruno']){fixtures[id]=customerData(id);delete fixtures[id].updatedAt;}
if(previous===undefined)delete process.env.INTEGRATION_MODE;else process.env.INTEGRATION_MODE=previous;
await writeFile(join(out,'demo-fixtures.js'),'export const fixtures='+JSON.stringify(fixtures)+';\n');
await writeFile(join(out,'robots.txt'),'User-agent: *\nDisallow: /\n');
await writeFile(join(out,'style.css'),(await readFile(join(out,'style.css'),'utf8'))+'\n.presentation-notice{padding:10px 24px;background:#dfc07b10;border-bottom:1px solid #dfc07b25;color:#dfcfac;font-size:11px;line-height:1.8}.demo-disclosure{margin-top:16px}.demo-reset{font-size:10px;min-height:44px;padding:0 9px}@media(max-width:700px){.presentation-notice{padding:10px 18px;font-size:11px}.portal-footer>span:last-child{flex-wrap:wrap}}\n');
console.log('Demonstração estática preparada em dist/. Nenhum backend, banco ou segredo incluído.');
