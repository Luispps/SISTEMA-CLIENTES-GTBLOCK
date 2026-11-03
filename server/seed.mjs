import { db,passwordHash } from './db.mjs';
if(process.env.NODE_ENV==='production') throw new Error('Seed fictício bloqueado em produção.');
db.exec('BEGIN');
try {
 for (const [id,name,email] of [['demo-ana','Ana Oliveira','ana@demo.gtblock.local'],['demo-bruno','Bruno Santos','bruno@demo.gtblock.local']]) {
  db.prepare('INSERT OR IGNORE INTO customers(id,name,email,phone) VALUES(?,?,?,?)').run(id,name,email,'Não informado');
  db.prepare('INSERT OR IGNORE INTO users(id,email,name,password,role,customer_id) VALUES(?,?,?,?,?,?)').run(id,email,name,passwordHash('Demo!GTBlock2026'),'client',id);
 }
 for(const [id,name,role] of [['demo-support','Equipe Atendimento','support'],['demo-admin','Administração','admin']]) db.prepare('INSERT OR IGNORE INTO users VALUES(?,?,?,?,?,NULL)').run(id,id==='demo-admin'?'admin@demo.gtblock.local':'equipe@demo.gtblock.local',name,passwordHash('Demo!GTBlock2026'),role);
 const at='2026-11-01T14:30:00.000Z';
 db.prepare('INSERT OR IGNORE INTO tickets VALUES(?,?,?,?,?,?,?,?,?,?)').run('GT-DEMO-0001','demo-ana','Atendimento','Atualização de telefone','Gostaria de atualizar meu telefone de contato.','Em análise',at,at,'demo-support','seed-ticket-ana');
 if(!db.prepare('SELECT id FROM actions WHERE ticket_id=?').get('GT-DEMO-0001')) db.prepare('INSERT INTO actions(ticket_id,actor,at,status,message) VALUES(?,?,?,?,?)').run('GT-DEMO-0001','demo-support',at,'Em análise','Solicitação recebida. Aguardamos a confirmação dos novos dados.');
 db.exec('COMMIT');console.log('Dados fictícios preparados. Contas e senha de demonstração: consulte README.md.');
} catch(e) { db.exec('ROLLBACK');throw e; }
