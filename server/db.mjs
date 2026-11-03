import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
export const dataDir = resolve(process.env.DATA_DIR || './data');
mkdirSync(dataDir, { recursive: true });
export const db = new DatabaseSync(resolve(dataDir, 'portal.sqlite'));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS customers(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL,phone TEXT NOT NULL DEFAULT '',siprov_id TEXT UNIQUE);
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,password TEXT,role TEXT NOT NULL CHECK(role IN ('client','support','admin')),customer_id TEXT REFERENCES customers(id));
CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),csrf TEXT NOT NULL,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS tokens(hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),purpose TEXT NOT NULL,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS tickets(id TEXT PRIMARY KEY,customer_id TEXT NOT NULL REFERENCES customers(id),type TEXT NOT NULL,subject TEXT NOT NULL,body TEXT NOT NULL,status TEXT NOT NULL,created TEXT NOT NULL,updated TEXT NOT NULL,responsible TEXT REFERENCES users(id),idem TEXT NOT NULL,UNIQUE(customer_id,idem));
CREATE TABLE IF NOT EXISTS actions(id INTEGER PRIMARY KEY, ticket_id TEXT NOT NULL REFERENCES tickets(id),actor TEXT NOT NULL REFERENCES users(id),at TEXT NOT NULL,status TEXT NOT NULL,message TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,actor TEXT,event TEXT NOT NULL,resource TEXT,at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS attempts(key TEXT PRIMARY KEY,count INTEGER NOT NULL,until INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS document_links(id TEXT PRIMARY KEY,customer_id TEXT NOT NULL REFERENCES customers(id),provider_token TEXT NOT NULL UNIQUE,signer_token TEXT,verified_by TEXT REFERENCES users(id),verified_at TEXT);
CREATE TABLE IF NOT EXISTS webhook_events(digest TEXT PRIMARY KEY,provider TEXT NOT NULL,received TEXT NOT NULL,status TEXT NOT NULL);
`);
export const hash = value => createHash('sha256').update(value).digest('hex');
export const secret = () => randomBytes(32).toString('base64url');
export function passwordHash(password) { const salt = randomBytes(16).toString('hex'); return `${salt}:${scryptSync(password,salt,64).toString('hex')}`; }
export function passwordValid(password, stored) { const [salt,key] = stored.split(':'); return timingSafeEqual(scryptSync(password,salt,64),Buffer.from(key,'hex')); }
export const dummyPassword = passwordHash(secret());
export function audit(actor,event,resource='') { db.prepare('INSERT INTO audit(actor,event,resource,at) VALUES(?,?,?,?)').run(actor,event,resource,new Date().toISOString()); }
export function limited(key, max=6, duration=900000) {
 const now=Date.now(); const item=db.prepare('SELECT * FROM attempts WHERE key=?').get(key);
 if (!item || item.until<now) {db.prepare('INSERT OR REPLACE INTO attempts VALUES(?,1,?)').run(key,now+duration);return false;}
 db.prepare('UPDATE attempts SET count=count+1 WHERE key=?').run(key); return item.count>=max;
}
