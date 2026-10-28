import type {Database} from './db';
import type {Config} from './config';
import {expireHolds,provider} from './booking';
export async function runJobs(db:Database,c:Config){
 await expireHolds(db);
 // SKIP LOCKED lets multiple workers safely share the outbox. Provider idempotency protects ambiguous retries.
 await db.transaction(async q=>{const jobs=(await q.query("SELECT * FROM outbox WHERE status='pending' AND attempts<10 ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 10")).rows;for(const job of jobs){if(!c.emailKey)continue;try{const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${c.emailKey}`,'Content-Type':'application/json','Idempotency-Key':job.id},body:JSON.stringify({from:c.emailFrom,to:job.recipient,subject:job.subject,html:job.html,attachments:job.attachments}),signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error('Email provider rejected request');await q.query("UPDATE outbox SET status='sent' WHERE id=$1",[job.id]);}catch{await q.query('UPDATE outbox SET attempts=attempts+1 WHERE id=$1',[job.id]);}}});
 await db.transaction(async q=>{const refunds=(await q.query("SELECT * FROM refunds WHERE status IN ('pending','submitted') AND attempts<10 FOR UPDATE SKIP LOCKED LIMIT 10")).rows;for(const r of refunds){try{let remote:any={id:'refund_demo_'+r.id,status:'processed'};if(c.payments!=='demo'){// Recover an ambiguous previous attempt before creating another refund.
 const existing=await provider(c,`payments/${r.payment_id}/refunds`);remote=existing.items?.find((x:any)=>x.notes?.refund_id===r.id);if(!remote&&r.status==='submitted')throw new Error('Submitted refund is not visible yet');if(!remote)remote=await provider(c,`payments/${r.payment_id}/refund`,{amount:r.amount_paise,notes:{refund_id:r.id,reason:r.reason}});}
 await q.query('UPDATE refunds SET status=$1,provider_id=$2 WHERE id=$3',[remote.status==='processed'?'processed':'submitted',remote.id,r.id]);if(remote.status==='processed')await q.query("UPDATE orders SET status='refunded' WHERE id=$1 AND status='refund_pending'",[r.order_id]);}catch{await q.query('UPDATE refunds SET attempts=attempts+1 WHERE id=$1',[r.id]);}}});
 await db.query('DELETE FROM rate_limits WHERE resets_at<now()-interval \'1 day\'');
 await db.query('DELETE FROM sessions WHERE expires_at<now()');
 await db.query('DELETE FROM login_tokens WHERE expires_at<now()');
}
