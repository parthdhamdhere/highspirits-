import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
export type Row = Record<string,any>;
export interface Query {query<T extends Row=Row>(sql:string,params?:any[]):Promise<{rows:T[];rowCount?:number|null}>}
export interface Database extends Query {transaction<T>(fn:(q:Query)=>Promise<T>):Promise<T>;close():Promise<void>}
export async function database(url?:string,localPath?:string):Promise<Database>{
 if(url){const pool=new pg.Pool({connectionString:url,max:15,connectionTimeoutMillis:5000,idleTimeoutMillis:30000});return {query:(s,p)=>pool.query(s,p),async transaction(fn){const c=await pool.connect();try{await c.query('BEGIN');const r=await fn(c);await c.query('COMMIT');return r;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}},close:()=>pool.end()};}
 const db=new PGlite(localPath);await db.waitReady;
 // PGlite is a single-connection local development database. Serialize transactions, never use it for production.
 let tail=Promise.resolve();
 const serial=<T>(fn:()=>Promise<T>):Promise<T>=>{const run=tail.then(fn);tail=run.then(()=>{},()=>{});return run;};
 return {query:(s,p)=>serial(()=>db.query(s,p)),transaction:fn=>serial(()=>db.transaction(t=>fn({query:(s,p)=>t.query(s,p)}))),close:()=>db.close()};
}
export async function migrate(db:Database){const sql=await readFile(new URL('./schema.sql',import.meta.url),'utf8');await db.transaction(async q=>{for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await q.query(statement);});}
