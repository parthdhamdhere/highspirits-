import { randomUUID } from 'node:crypto';
import type {Database} from './db';
import {passwordHash} from './security';
export async function seed(db:Database,demo:boolean){
 await db.query('INSERT INTO settings(id,value) VALUES(1,$1) ON CONFLICT DO NOTHING',[JSON.stringify({tableCoverPaise:10000,platformFeePaise:0,gstBasisPoints:0,gstConfirmed:false,businessGstin:'',tablePaymentMode:'cover'})]);
 if(!demo)return;
 for(const role of ['admin','manager','promoter'])await db.query('INSERT INTO staff(id,name,email,password_hash,role,status) VALUES($1,$2,$3,$4,$5,\'active\') ON CONFLICT DO NOTHING',[`demo-${role}`,`${role[0].toUpperCase()+role.slice(1)} · Demo`,`${role}@highspirits.local`,passwordHash('HighSpirits!2026'),role]);
 if((await db.query('SELECT id FROM events LIMIT 1')).rows.length)return;
 await db.transaction(async q=>{for(const [i,title]of ['After Hours','Velvet Sessions','The Saturday Social'].entries()){
 const date=new Date();date.setUTCDate(date.getUTCDate()+3+i*7);date.setUTCHours(15,30,0,0);const end=new Date(date.valueOf()+3*3600000);const start=new Date(date.valueOf()-30*86400000);const eventId=`demo-event-${i+1}`;
 await q.query('INSERT INTO events(id,title,description,lineup,starts_at,doors_at,capacity,status,created_by) VALUES($1,$2,$3,$4,$5,$5,700,\'published\',\'demo-admin\')',[eventId,title,'A night for the music, the dance floor, and the people you bring. Explore the lineup and choose your entry. This is an illustrative event for local development.',['House · Disco · Late-night grooves','Soulful house · Live selectors','Disco · House · All night'][i],date.toISOString()]);
 for(const [j,t] of [{name:'Early bird',kind:'ticket',party:'female',seats:1,price:79900,qty:100},{name:'Phase 1',kind:'ticket',party:'couple',seats:2,price:149900,qty:150},{name:'VIP',kind:'ticket',party:'couple',seats:2,price:249900,qty:40},{name:'Table for 2',kind:'table',party:'table',seats:2,price:0,qty:10},{name:'Table for 4',kind:'table',party:'table',seats:4,price:0,qty:10},{name:'Table for 6',kind:'table',party:'table',seats:6,price:0,qty:10}].entries())await q.query('INSERT INTO ticket_tiers(id,event_id,name,kind,party_type,seats,price_paise,quantity,remaining,max_per_order,sale_starts_at,sale_ends_at,perks,sort_order) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$8,4,$9,$10,$11,$12)',[`${eventId}-tier-${j}`,eventId,t.name,t.kind,t.party,t.seats,t.price,t.qty,start.toISOString(),end.toISOString(),j===2?'Priority entry · Dedicated lounge':'',j]);
 }});
}
