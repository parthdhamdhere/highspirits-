import QRCode from 'qrcode';
import { randomUUID } from 'node:crypto';
import { priceBreakdown, type Settings } from '@highspirits/contracts';
import type { Database, Query, Row } from './db';
import type { Config } from './config';
import { fail, escapeHtml } from './security';

export async function settings(db:Query):Promise<Settings>{return (await db.query('SELECT value FROM settings WHERE id=1')).rows[0].value;}
export async function audit(q:Query,staffId:string,action:string,entity:string,entityId:string,diff:unknown={}){await q.query('INSERT INTO audit_log(id,staff_id,action,entity,entity_id,diff) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),staffId,action,entity,entityId,JSON.stringify(diff)]);}
export async function expireTier(q:Query,tierId:string){
 const released=await q.query("UPDATE holds SET status='expired' WHERE tier_id=$1 AND status='active' AND expires_at<=now() RETURNING id,qty",[tierId]);
 const qty=released.rows.reduce((n,h)=>n+h.qty,0);if(qty)await q.query('UPDATE ticket_tiers SET remaining=remaining+$1 WHERE id=$2',[qty,tierId]);
 for(const h of released.rows)await q.query("UPDATE orders SET status='expired' WHERE hold_id=$1 AND status IN ('pending','creating','provider_unknown')",[h.id]);
}
export async function expireHolds(db:Database){const tiers=(await db.query("SELECT DISTINCT tier_id FROM holds WHERE status='active' AND expires_at<=now()")).rows;for(const t of tiers)await db.transaction(async q=>{await q.query('SELECT id FROM ticket_tiers WHERE id=$1 FOR UPDATE',[t.tier_id]);await expireTier(q,t.tier_id);});}
export async function createHold(db:Database,userId:string,tierId:string,qty:number,key:string){return db.transaction(async q=>{
 await q.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[userId]);
 const existing=(await q.query('SELECT * FROM holds WHERE user_id=$1 AND request_key=$2',[userId,key])).rows[0];if(existing){if(existing.tier_id!==tierId||existing.qty!==qty)fail(409,'IDEMPOTENCY_CONFLICT','This request key was already used for another selection');return holdView(existing);}
 const t=(await q.query('SELECT t.*,e.status AS event_status,e.starts_at FROM ticket_tiers t JOIN events e ON e.id=t.event_id WHERE t.id=$1 FOR UPDATE OF t',[tierId])).rows[0];
 if(!t)fail(404,'NOT_FOUND','Ticket option not found');await expireTier(q,tierId);
 const now=Date.now();if(t.event_status!=='published'||!t.active||new Date(t.sale_starts_at).valueOf()>now||new Date(t.sale_ends_at).valueOf()<=now||new Date(t.starts_at).valueOf()<=now)fail(409,'SALES_CLOSED','This option is not on sale');
 if(qty>t.max_per_order)fail(400,'LIMIT','Quantity exceeds the order limit');
 const used=(await q.query("SELECT COALESCE(SUM(qty),0)::int AS qty FROM holds WHERE user_id=$1 AND tier_id=$2 AND status IN ('active','converted')",[userId,tierId])).rows[0].qty;
 if(used+qty>4)fail(409,'ACCOUNT_LIMIT','Maximum four bookings per account for this tier');
 const changed=await q.query('UPDATE ticket_tiers SET remaining=remaining-$1 WHERE id=$2 AND remaining >= $1 RETURNING id',[qty,tierId]);if(!changed.rows.length)fail(409,'SOLD_OUT','This option has sold out. Please choose another.');
 const h=(await q.query("INSERT INTO holds(id,user_id,tier_id,qty,expires_at,status,request_key) VALUES($1,$2,$3,$4,now()+interval '10 minutes','active',$5) RETURNING *",[randomUUID(),userId,tierId,qty,key])).rows[0];return holdView(h);
 });}
export const holdView=(h:Row)=>({id:h.id,tierId:h.tier_id,qty:h.qty,expiresAt:new Date(h.expires_at).toISOString(),status:h.status});
export async function provider(c:Config,path:string,body?:unknown){const r=await fetch('https://api.razorpay.com/v1/'+path,{method:body?'POST':'GET',headers:{Authorization:'Basic '+Buffer.from(c.razorpayKey+':'+c.razorpaySecret).toString('base64'),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});const data=await r.json() as any;if(!r.ok)throw new Error('Payment provider could not process the request');return data;}
export async function checkout(db:Database,c:Config,userId:string,input:{holdId:string;holderNames:string[];phone:string;notes:string}){
 const result=await db.transaction(async q=>{
 const h0=(await q.query('SELECT tier_id FROM holds WHERE id=$1 AND user_id=$2',[input.holdId,userId])).rows[0];if(!h0)fail(404,'NOT_FOUND','Hold not found');
 const t=(await q.query('SELECT * FROM ticket_tiers WHERE id=$1 FOR UPDATE',[h0.tier_id])).rows[0];await expireTier(q,t.id);
 const h=(await q.query('SELECT * FROM holds WHERE id=$1 FOR UPDATE',[input.holdId])).rows[0];if(h.status!=='active')fail(409,'HOLD_EXPIRED','Your hold expired. Please select tickets again.');
 const old=(await q.query('SELECT * FROM orders WHERE hold_id=$1',[h.id])).rows[0];if(old)return {order:old,created:false};
 const required=t.kind==='table'?1:t.seats*h.qty;if(input.holderNames.length!==required)fail(400,'NAMES_REQUIRED',`Enter ${required} ticket holder name${required===1?'':'s'}`);
 const s=await settings(q);if(c.production&&!s.gstConfirmed)fail(503,'TAX_CONFIGURATION','Checkout is unavailable until the venue confirms its tax settings');
 const price=priceBreakdown(t.price_paise,h.qty,t.kind,s);if(price.totalPaise<100)fail(400,'INVALID_AMOUNT','This booking must have a payable amount of at least ₹1');
 const o=(await q.query("INSERT INTO orders(id,user_id,event_id,tier_id,hold_id,qty,status,subtotal_paise,cover_paise,fee_paise,gst_paise,total_paise,holder_names,phone,notes,policy_accepted_at) VALUES($1,$2,$3,$4,$5,$6,'creating',$7,$8,$9,$10,$11,$12,$13,$14,now()) RETURNING *",[randomUUID(),userId,t.event_id,t.id,h.id,h.qty,price.subtotalPaise,price.coverPaise,price.feePaise,price.gstPaise,price.totalPaise,JSON.stringify(input.holderNames),input.phone,input.notes])).rows[0];return {order:o,created:true};
 });
 let o=result.order;if(result.created){try{const remote=c.payments==='demo'?{id:'order_demo_'+o.id}:await provider(c,'orders',{amount:o.total_paise,currency:'INR',receipt:o.id,notes:{order_id:o.id}});o=(await db.query("UPDATE orders SET razorpay_order_id=$1,status=CASE WHEN status='creating' THEN 'pending' ELSE status END WHERE id=$2 RETURNING *",[remote.id,o.id])).rows[0];}catch{await db.query("UPDATE orders SET status='provider_unknown' WHERE id=$1 AND status='creating'",[o.id]);fail(502,'PROVIDER_UNAVAILABLE','Payment setup could not be confirmed. Do not retry payment; contact the venue with your order reference.');}}
 if(!o.razorpay_order_id)fail(409,'ORDER_PROCESSING','Your payment order is still being prepared. Refresh your bookings shortly.');
 return {orderId:o.id,razorpayOrderId:o.razorpay_order_id,keyId:c.razorpayKey,amount:o.total_paise,currency:'INR',mode:c.payments,expiresAt:(await db.query('SELECT expires_at FROM holds WHERE id=$1',[o.hold_id])).rows[0].expires_at};
}
export async function capture(db:Database,eventId:string,payment:{id:string;order_id:string;amount:number;currency:string}){
 return db.transaction(async q=>{
 const first=(await q.query('SELECT * FROM orders WHERE razorpay_order_id=$1',[payment.order_id])).rows[0];if(!first)fail(409,'ORDER_UNKNOWN','Payment order not yet available; retry webhook');
 const t=(await q.query('SELECT t.*,e.status AS event_status FROM ticket_tiers t JOIN events e ON e.id=t.event_id WHERE t.id=$1 FOR UPDATE OF t',[first.tier_id])).rows[0];await expireTier(q,t.id);
 const o=(await q.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE',[first.id])).rows[0];
 if(payment.currency!=='INR'||payment.amount!==o.total_paise)fail(400,'PAYMENT_MISMATCH','Payment amount or currency does not match');
 const mark=await q.query("INSERT INTO webhook_events(event_id,type) VALUES($1,'payment.captured') ON CONFLICT DO NOTHING RETURNING event_id",[eventId]);if(!mark.rows.length)return {duplicate:true};
 if(o.razorpay_payment_id===payment.id)return {duplicate:true};
 if(o.razorpay_payment_id&&o.razorpay_payment_id!==payment.id){await q.query('INSERT INTO refunds(id,order_id,payment_id,amount_paise,reason) VALUES($1,$2,$3,$4,$5) ON CONFLICT(payment_id) DO NOTHING',[randomUUID(),o.id,payment.id,payment.amount,'Duplicate payment']);return {refundPending:true};}
 const h=(await q.query('SELECT * FROM holds WHERE id=$1 FOR UPDATE',[o.hold_id])).rows[0];let available=t.event_status!=='cancelled';
 if(h.status==='expired'&&available)available=(await q.query('UPDATE ticket_tiers SET remaining=remaining-$1 WHERE id=$2 AND remaining >= $1 RETURNING id',[h.qty,t.id])).rows.length>0;
 if(!available){if(h.status==='active'){await q.query('UPDATE ticket_tiers SET remaining=remaining+$1 WHERE id=$2',[h.qty,t.id]);await q.query("UPDATE holds SET status='expired' WHERE id=$1",[h.id]);}await q.query("UPDATE orders SET status='refund_pending',razorpay_payment_id=$1 WHERE id=$2",[payment.id,o.id]);await q.query('INSERT INTO refunds(id,order_id,payment_id,amount_paise,reason) VALUES($1,$2,$3,$4,$5) ON CONFLICT(payment_id) DO NOTHING',[randomUUID(),o.id,payment.id,payment.amount,'Payment received without available inventory']);return {refundPending:true};}
 await q.query("UPDATE holds SET status='converted' WHERE id=$1",[h.id]);await q.query("UPDATE orders SET status='paid',razorpay_payment_id=$1 WHERE id=$2",[payment.id,o.id]);
 // One QR per purchased entry unit; a couple ticket represents both named guests.
 const attachments:{filename:string;content:string}[]=[];const names=o.holder_names as string[];for(let i=0;i<o.qty;i++){const label=t.kind==='table'?names[0]:names.slice(i*t.seats,(i+1)*t.seats).join(' & ');const ticketId=randomUUID(),payload='hs:'+randomUUID();await q.query('INSERT INTO tickets(id,order_id,holder_name,qr_payload) VALUES($1,$2,$3,$4)',[ticketId,o.id,label,payload]);attachments.push({filename:'highspirts-ticket-'+ticketId+'.png',content:(await QRCode.toBuffer(payload,{width:500,margin:3})).toString('base64')});}
 const u=(await q.query('SELECT email FROM users WHERE id=$1',[o.user_id])).rows[0];if(u)await q.query('INSERT INTO outbox(id,recipient,subject,html,attachments) VALUES($1,$2,$3,$4,$5)',[randomUUID(),u.email,'Your highspirts cafe booking is confirmed',`<h1>You’re on the list.</h1><p>Booking ${escapeHtml(o.id)} is confirmed. Your QR ticket is attached. Open your profile to view the named booking. Bring matching photo ID; couple guests enter together.</p>`,JSON.stringify(attachments)]);
 return {paid:true};
 });
}
