import type {Database} from './db';
import type {Config} from './config';
import {expireHolds,provider,capture} from './booking';
export async function runJobs(db:Database,c:Config){
 await expireHolds(db);
 await reconcilePayments(db,c);
 // SKIP LOCKED lets multiple workers safely share the outbox. Provider idempotency protects ambiguous retries.
 await db.transaction(async q=>{const jobs=(await q.query("SELECT * FROM outbox WHERE status='pending' AND attempts<10 ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 10")).rows;for(const job of jobs){if(!c.emailKey)continue;try{const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${c.emailKey}`,'Content-Type':'application/json','Idempotency-Key':job.id},body:JSON.stringify({from:c.emailFrom,to:job.recipient,subject:job.subject,html:job.html,attachments:job.attachments}),signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error('Email provider rejected request');await q.query("UPDATE outbox SET status='sent' WHERE id=$1",[job.id]);}catch{await q.query('UPDATE outbox SET attempts=attempts+1 WHERE id=$1',[job.id]);}}});
 await db.transaction(async q=>{const refunds=(await q.query("SELECT * FROM refunds WHERE status IN ('pending','submitted') AND attempts<10 FOR UPDATE SKIP LOCKED LIMIT 10")).rows;for(const r of refunds){try{let remote:any={id:'refund_demo_'+r.id,status:'processed'};if(c.payments!=='demo'){// Recover an ambiguous previous attempt before creating another refund.
 const existing=await provider(c,`payments/${r.payment_id}/refunds`);remote=existing.items?.find((x:any)=>x.notes?.refund_id===r.id);if(!remote&&r.status==='submitted')throw new Error('Submitted refund is not visible yet');if(!remote)remote=await provider(c,`payments/${r.payment_id}/refund`,{amount:r.amount_paise,notes:{refund_id:r.id,reason:r.reason}});}
 await q.query('UPDATE refunds SET status=$1,provider_id=$2 WHERE id=$3',[remote.status==='processed'?'processed':'submitted',remote.id,r.id]);if(remote.status==='processed')await q.query("UPDATE orders SET status='refunded' WHERE id=$1 AND status='refund_pending'",[r.order_id]);}catch{await q.query('UPDATE refunds SET attempts=attempts+1 WHERE id=$1',[r.id]);}}});
 await db.query('DELETE FROM rate_limits WHERE resets_at<now()-interval \'1 day\'');
 await db.query('DELETE FROM sessions WHERE expires_at<now()');
 await db.query('DELETE FROM login_tokens WHERE expires_at<now()');
}

// Authenticate with the provider to recover missed webhooks and ambiguous order creation.
export async function reconcilePayments(db:Database,c:Config){
 if(c.payments==='demo')return;
 const candidates=(await db.query("SELECT * FROM orders WHERE hold_id IS NOT NULL AND (status IN ('creating','provider_unknown','pending','expired') OR (status='paid' AND created_at>now()-interval '2 days')) AND created_at<now()-interval '2 minutes' AND (reconciled_at IS NULL OR reconciled_at<now()-interval '5 minutes') ORDER BY reconciled_at NULLS FIRST,created_at LIMIT 10")).rows;
 for(const o of candidates){
  await db.query('UPDATE orders SET reconciled_at=now() WHERE id=$1',[o.id]);
  try{
   let remoteId=o.razorpay_order_id;
   if(!remoteId){
    const remote=await provider(c,'orders?'+new URLSearchParams({receipt:o.id,count:'100'}));
    const matches=remote.items?.filter((r:any)=>r.receipt===o.id&&r.amount===o.total_paise&&r.currency==='INR')||[];
    if(matches.length!==1)throw new Error('Payment order could not be uniquely reconciled; venue review required');
    remoteId=matches[0].id;
    await db.query("UPDATE orders SET razorpay_order_id=$1,status=CASE WHEN status IN ('creating','provider_unknown') THEN 'pending' ELSE status END WHERE id=$2 AND razorpay_order_id IS NULL",[remoteId,o.id]);
   }
   for(let skip=0;;skip+=100){
    const payments=await provider(c,`orders/${encodeURIComponent(remoteId)}/payments?count=100&skip=${skip}`);
    if(!Array.isArray(payments.items))throw new Error('Payment provider returned an invalid collection');
    for(const p of payments.items){if(p.status==='captured'){if(p.order_id!==remoteId)throw new Error('Payment provider returned a mismatched order');await capture(db,'reconcile:'+p.id,{id:p.id,order_id:p.order_id,amount:p.amount,currency:p.currency});}}
    if(payments.items.length<100)break;
   }
   await db.query('UPDATE orders SET reconciliation_error=NULL WHERE id=$1',[o.id]);
  }catch(error){await db.query('UPDATE orders SET reconciliation_error=$1 WHERE id=$2',[(error as Error).message,o.id]);}
 }
}
