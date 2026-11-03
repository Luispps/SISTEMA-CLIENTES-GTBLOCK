import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../dist');
const config=JSON.parse(await readFile(resolve(root,'../vercel.json'),'utf8'));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.txt':'text/plain; charset=utf-8'};
http.createServer(async(req,res)=>{
 for(const h of config.headers[0].headers)res.setHeader(h.key,h.value);
 try{const url=new URL(req.url,'http://127.0.0.1');const file=resolve(root,decodeURIComponent(url.pathname==='/'?'index.html':url.pathname.slice(1)));if(!file.startsWith(root+sep)||!types[extname(file)]||!['GET','HEAD'].includes(req.method)){res.writeHead(404);res.end('Não encontrado');return;}const bytes=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]});res.end(req.method==='HEAD'?undefined:bytes);}catch{res.writeHead(404);res.end('Não encontrado');}
}).listen(4320,'127.0.0.1',()=>console.log('Prévia da demonstração Vercel: http://127.0.0.1:4320'));
