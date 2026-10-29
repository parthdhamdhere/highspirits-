import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHmac} from 'node:crypto';
import {database,migrate,type Database} from '../src/db';
import {buildApp} from '../src/app';
import {seed} from '../src/seed';
import {config,validateConfig} from '../src/config';
import {passwordHash,passwordValid,hash,token,escapeHtml,csv,signatureValid} from '../src/security';
import {createHold,checkout,capture} from '../src/booking';
import {runJobs} from '../src/jobs';
import {eventInput,tierInput,isAdult,priceBreakdown} from '@highspirits/contracts';
let db:Database,app:Awaited<ReturnType<typeof buildApp>>;
const c={...config,production:false,payments:'demo',seed:true,turnstileSecret:'',emailKey:''};
before(async()=>{db=await database();await migrate(db);await seed(db,true);app=await buildApp(db,c);});
beforeEach(async()=>{await db.query('DELETE FROM rate_limits');});
after(async()=>{await app.close();await db.close();});
async function agent(role='customer'){
 const initial=await app.inject('/api/v1/session');const cookies=new Map(initial.cookies.map(x=>[x.name,x.value]));let csrf=initial.json().csrfToken;
 const request=async(method:string,url:string,payload?:any,extra:Record<string,string>={})=>{const r=await app.inject({method:method as any,url,headers:{origin:c.origin,cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; '),'x-csrf-token':csrf,...extra},...(payload===undefined?{}:{payload})});for(const x of r.cookies){if(x.value)cookies.set(x.name,x.value);else cookies.delete(x.name);}if(r.headers['content-type']?.includes('json')&&r.json().csrfToken)csrf=r.json().csrfToken;return r;};
 const email=role==='customer'?`${randomUUID()}@example.com`:`${role}@highspirits.local`;
 const login=await request('POST',role==='customer'?'/api/v1/auth/customer/password':'/api/v1/auth/staff/login',{email,password:role==='customer'?'AuditPassword2026!':'HighSpirits!2026',...(role==='customer'?{register:true,consent:true}:{})});assert.equal(login.statusCode,200,login.body);
 const session=(await request('GET','/api/v1/session')).json();
 return {request,email,id:session.user.id,cookies,csrf};
}
async function event(kind:'ticket'|'table'='ticket',partyType:'female'|'couple'|'table'=kind==='table'?'table':'female'){
 const admin=await agent('admin');const startsAt=new Date(Date.now()+7*86400000).toISOString();const input={title:'Audit event',description:'An isolated test event.',lineup:'Test lineup',posterUrl:'',startsAt,doorsAt:startsAt,capacity:100,status:'published',tiers:[{name:'Audit tier',kind,partyType,seats:partyType==='female'?1:partyType==='couple'?2:4,pricePaise:10000,quantity:10,maxPerOrder:4,saleStartsAt:new Date(Date.now()-86400000).toISOString(),saleEndsAt:startsAt,perks:'',sortOrder:0,active:true}]};
 const r=await admin.request('POST','/api/v1/manage/events',input);assert.equal(r.statusCode,200,r.body);const id=r.json().id;const t=(await db.query('SELECT id FROM ticket_tiers WHERE event_id=$1',[id])).rows[0].id;return {id,t,input,admin};
}
async function order(){const e=await event();const u=await agent();const h=await createHold(db,u.id,e.t,1,randomUUID());const o=await checkout(db,c,u.id,{holdId:h.id,holderNames:['Audit Guest'],phone:'+919876543210',notes:'Private request'});return {...e,u,h,o};}

test('security primitives: salted passwords, malformed hashes, signatures, escaping and tokens',()=>{
 const p=passwordHash('valid password');assert.ok(passwordValid('valid password',p));assert.ok(!passwordValid('wrong',p));for(const v of [null,'bad','salt:aa'])assert.ok(!passwordValid('x',v));assert.notEqual(p,passwordHash('valid password'));assert.equal(token().length,64);assert.equal(hash('x').length,64);assert.equal(escapeHtml('<script>"&\''),'&lt;script&gt;&quot;&amp;&#39;');assert.ok(!signatureValid('body','0'.repeat(64),'secret'));assert.ok(csv([['\t=1','-1','a"b']]).includes("'\t=1"));
});
test('contract boundaries: age dates, ticket party sizes and price arithmetic',()=>{
 assert.ok(isAdult('2005-10-30',new Date('2026-10-29T18:30:00Z')));for(const d of ['2005-10-31','2030-01-01','2001-02-29','invalid'])assert.ok(!isAdult(d,new Date('2026-10-29T18:30:00Z')));
 const t={name:'Couple',kind:'ticket',partyType:'couple',seats:1,pricePaise:10000,quantity:10,saleStartsAt:'2026-01-01T00:00:00Z',saleEndsAt:'2027-01-01T00:00:00Z'};assert.ok(!tierInput.safeParse(t).success);assert.ok(!tierInput.safeParse({...t,partyType:'female',seats:2}).success);
 assert.equal(priceBreakdown(10000,2,'table',{tableCoverPaise:10000,platformFeePaise:100,gstBasisPoints:1800,gstConfirmed:true,businessGstin:'',tablePaymentMode:'cover'}).totalPaise,47318);
});
test('signup, logout, replay, repeat logout and login again',async()=>{
 const u=await agent();const raw=u.cookies.get('hs_session')!;assert.equal((await u.request('POST','/api/v1/logout',{})).statusCode,200);assert.equal((await u.request('GET','/api/v1/session')).json().user,null);assert.equal((await u.request('GET','/api/v1/profile',undefined,{cookie:`hs_session=${raw}`})).statusCode,401);assert.equal((await u.request('POST','/api/v1/logout',{})).statusCode,200);assert.equal((await u.request('POST','/api/v1/auth/customer/password',{email:u.email,password:'AuditPassword2026!'})).statusCode,200);
});
test('expired session cannot read profile; mutations still require origin and CSRF',async()=>{
 const u=await agent();await db.query("UPDATE sessions SET expires_at=now()-interval '1 second' WHERE principal_id=$1",[u.id]);assert.equal((await u.request('GET','/api/v1/profile')).statusCode,401);
 for(const headers of ([{origin:'https://evil.example'},{'x-csrf-token':'invalid'}] as Record<string,string>[]))assert.equal((await u.request('POST','/api/v1/logout',{},headers)).statusCode,403);
});
test('malformed login and brute force are rejected',async()=>{
 const initial=await app.inject('/api/v1/session');const headers={origin:c.origin,cookie:initial.cookies.map(x=>`${x.name}=${x.value}`).join('; '),'x-csrf-token':initial.json().csrfToken};
 for(const payload of [{email:'bad',password:'short'},{email:'x@example.com',password:'12345678',register:true},{email:'x@example.com',password:'12345678',register:true,consent:false}])assert.equal((await app.inject({method:'POST',url:'/api/v1/auth/customer/password',headers,payload})).statusCode,400);
 await db.query('DELETE FROM rate_limits');for(let i=0;i<10;i++)assert.equal((await app.inject({method:'POST',url:'/api/v1/auth/customer/password',headers,payload:{email:'missing@example.com',password:'WrongPassword'}})).statusCode,401);assert.equal((await app.inject({method:'POST',url:'/api/v1/auth/customer/password',headers,payload:{email:'missing@example.com',password:'WrongPassword'}})).statusCode,429);
});
test('all staff reads enforce the role matrix',async()=>{
 const urls=['/manage/events','/manage/reservations','/manage/users','/manage/settings','/manage/audit','/manage/content/gallery','/manage/export/events'];
 for(const role of ['customer','promoter','manager','admin']){const u=await agent(role);for(const url of urls){const allowed=role==='admin'||(role==='manager'&&!['/manage/users','/manage/audit'].includes(url));assert.equal((await u.request('GET','/api/v1'+url)).statusCode,allowed?200:403,`${role} ${url}`);}}
});
test('suspended staff cannot log in or reuse a session',async()=>{
 const admin=await agent('admin'),manager=await agent('manager');assert.equal((await admin.request('PATCH','/api/v1/manage/users/'+manager.id,{role:'manager',status:'suspended'})).statusCode,200);assert.equal((await manager.request('GET','/api/v1/manage/events')).statusCode,403);await manager.request('GET','/api/v1/session');assert.equal((await manager.request('POST','/api/v1/auth/staff/login',{email:manager.email,password:'HighSpirits!2026'})).statusCode,401);await db.query("UPDATE staff SET status='active' WHERE id=$1",[manager.id]);
});
test('suspended invitation cannot reactivate staff',async()=>{
 const admin=await agent('admin');const invited=await admin.request('POST','/api/v1/manage/users',{name:'Invited User',email:`${randomUUID()}@example.com`,role:'promoter'});const {id,developmentLink}=invited.json();const invite=new URL(developmentLink).searchParams.get('invite');await admin.request('PATCH','/api/v1/manage/users/'+id,{role:'promoter',status:'suspended'});const guest=await agent();assert.equal((await guest.request('POST','/api/v1/auth/staff/accept',{token:invite,password:'NewPassword2026!'})).statusCode,400);assert.equal((await db.query('SELECT status FROM staff WHERE id=$1',[id])).rows[0].status,'suspended');
});
test('invitation succeeds once; self-edit and nonexistent staff fail',async()=>{
 const admin=await agent('admin');const r=await admin.request('POST','/api/v1/manage/users',{name:'Test Promoter',email:`${randomUUID()}@example.com`,role:'promoter'});const invite=new URL(r.json().developmentLink).searchParams.get('invite');const u=await agent();assert.equal((await u.request('POST','/api/v1/auth/staff/accept',{token:invite,password:'NewPassword2026!'})).statusCode,200);assert.equal((await u.request('POST','/api/v1/auth/staff/accept',{token:invite,password:'NewPassword2026!'})).statusCode,400);assert.equal((await admin.request('PATCH','/api/v1/manage/users/'+admin.id,{role:'promoter',status:'suspended'})).statusCode,400);assert.equal((await admin.request('PATCH','/api/v1/manage/users/missing',{role:'promoter',status:'active'})).statusCode,404);
});
test('managers cannot alter tax configuration',async()=>{
 const manager=await agent('manager');const old=(await manager.request('GET','/api/v1/manage/settings')).json().settings;assert.equal((await manager.request('PATCH','/api/v1/manage/settings',{...old,gstConfirmed:!old.gstConfirmed})).statusCode,403);assert.equal((await manager.request('PATCH','/api/v1/manage/settings',{...old,tableCoverPaise:12345})).statusCode,200);await db.query('UPDATE settings SET value=$1 WHERE id=1',[JSON.stringify(old)]);
});
test('event CRUD hides drafts and validates capacity, tier size and dates',async()=>{
 const e=await event();assert.ok((await app.inject('/api/v1/events/'+e.id)).json().event);assert.equal((await e.admin.request('PATCH','/api/v1/manage/events/'+e.id,{...e.input,status:'draft'})).statusCode,200);assert.equal((await app.inject('/api/v1/events/'+e.id)).statusCode,404);
 for(const input of [{...e.input,capacity:1},{...e.input,doorsAt:'invalid'},{...e.input,tiers:[{...e.input.tiers[0],saleEndsAt:e.input.tiers[0].saleStartsAt}]}])assert.equal((await e.admin.request('POST','/api/v1/manage/events',input)).statusCode,400);
});
test('manual reservation locks tiers; editing details remains possible',async()=>{
 const e=await event('table');assert.equal((await e.admin.request('POST','/api/v1/manage/reservations',{tierId:e.t,name:'Manual Guest',phone:'+919876543210'})).statusCode,200);const r=await e.admin.request('PATCH','/api/v1/manage/events/'+e.id,{...e.input,title:'Edited title'});assert.equal(r.statusCode,200,r.body);assert.equal((await e.admin.request('PATCH','/api/v1/manage/events/'+e.id,{...e.input,tiers:[{...e.input.tiers[0],quantity:11}]})).statusCode,409);
});
test('manual reservations reject cancelled events and malformed phones',async()=>{
 const e=await event('table');assert.equal((await e.admin.request('POST','/api/v1/manage/reservations',{tierId:e.t,name:'Manual Guest',phone:'abcdefghij'})).statusCode,400);await db.query("UPDATE events SET status='cancelled' WHERE id=$1",[e.id]);assert.equal((await e.admin.request('POST','/api/v1/manage/reservations',{tierId:e.t,name:'Manual Guest',phone:'+919876543210'})).statusCode,409);
});
test('checkout rejects cancelled events after a hold',async()=>{
 const e=await event(),u=await agent();const h=await createHold(db,u.id,e.t,1,randomUUID());await db.query("UPDATE events SET status='cancelled' WHERE id=$1",[e.id]);await assert.rejects(checkout(db,c,u.id,{holdId:h.id,holderNames:['Guest Name'],phone:'+919876543210',notes:''}),/not on sale/);
});
test('public availability closes once the event starts',async()=>{
 const e=await event();await db.query("UPDATE events SET starts_at=now()-interval '1 minute' WHERE id=$1",[e.id]);assert.equal((await app.inject('/api/v1/events/'+e.id)).json().event.tiers[0].availability,'closed');
});
test('booking APIs reject bad quantities, missing policy, cross-account data and wrong guest count',async()=>{
 const e=await event(),u=await agent(),other=await agent();for(const qty of [0,-1,5,1.5])assert.equal((await u.request('POST','/api/v1/holds',{tierId:e.t,qty},{'idempotency-key':randomUUID()})).statusCode,400);
 const h=await u.request('POST','/api/v1/holds',{tierId:e.t,qty:2},{'idempotency-key':randomUUID()});assert.equal(h.statusCode,200,h.body);const input={holdId:h.json().hold.id,holderNames:['One Guest','Two Guest'],phone:'+919876543210',policyAccepted:true};assert.equal((await other.request('POST','/api/v1/orders',input)).statusCode,404);assert.equal((await u.request('POST','/api/v1/orders',{...input,policyAccepted:false})).statusCode,400);assert.equal((await u.request('POST','/api/v1/orders',{...input,holderNames:['One Guest']})).statusCode,400);assert.equal((await u.request('GET','/api/v1/profile')).json().orders.length,0);
});
test('ticket checkout through signed webhook, profile, duplicate payment and exports',async()=>{
 const x=await order();const payment={id:'pay_'+randomUUID(),order_id:x.o.razorpayOrderId,amount:x.o.amount,currency:'INR'};const payload=JSON.stringify({event:'payment.captured',payload:{payment:{entity:payment}}});const headers={'x-razorpay-event-id':randomUUID(),'x-razorpay-signature':createHmac('sha256',c.webhookSecret).update(payload).digest('hex'),'content-type':'application/json'};const r=await app.inject({method:'POST',url:'/api/v1/payments/webhook',headers,payload});assert.equal(r.statusCode,200,r.body);assert.equal((await app.inject({method:'POST',url:'/api/v1/payments/webhook',headers,payload})).json().duplicate,true);
 const profile=(await x.u.request('GET','/api/v1/profile')).json();assert.equal(profile.orders[0].status,'paid');assert.equal(profile.orders[0].tickets.length,1);const other=await agent();assert.equal((await other.request('GET','/api/v1/profile')).json().orders.length,0);
 await capture(db,randomUUID(),{...payment,id:'pay_duplicate_'+randomUUID()});await runJobs(db,c);assert.equal((await db.query('SELECT status FROM orders WHERE id=$1',[x.o.orderId])).rows[0].status,'paid');assert.equal((await db.query('SELECT status FROM refunds WHERE order_id=$1',[x.o.orderId])).rows[0].status,'processed');
 for(const kind of ['events','guestlist','attendees','reservations']){const csv=await x.admin.request('GET',`/api/v1/manage/export/${kind}?eventId=${x.id}`);assert.equal(csv.statusCode,200,csv.body);assert.ok(csv.headers['content-type']?.includes('text/csv'));}assert.equal((await x.admin.request('PATCH','/api/v1/manage/events/'+x.id,{...x.input,status:'cancelled'})).statusCode,409);
});
test('table checkout charges cover and issues a lead guest QR',async()=>{
 const e=await event('table'),u=await agent();const h=await createHold(db,u.id,e.t,2,randomUUID());const o=await checkout(db,c,u.id,{holdId:h.id,holderNames:['Table Guest'],phone:'+919876543210',notes:'A request'});assert.equal(o.amount,40000);await capture(db,randomUUID(),{id:randomUUID(),order_id:o.razorpayOrderId,amount:o.amount,currency:'INR'});const rows=(await u.request('GET','/api/v1/profile')).json().orders;assert.equal(rows[0].tickets.length,2);assert.equal(rows[0].holderNames[0],'Table Guest');
});
test('deletion clears personal data, credentials and sessions',async()=>{
 const u=await agent();await db.query("UPDATE users SET dob='1990-01-01' WHERE id=$1",[u.id]);assert.equal((await u.request('DELETE','/api/v1/profile')).statusCode,200);const stored=(await db.query('SELECT * FROM users WHERE id=$1',[u.id])).rows[0];assert.equal(stored.password_hash,null);assert.equal(stored.dob,null);assert.equal(stored.phone,'');assert.equal((await u.request('GET','/api/v1/profile')).statusCode,401);
});
test('late payment after deletion is reversed without recreating personal data',async()=>{
 const x=await order();assert.equal((await x.u.request('DELETE','/api/v1/profile')).statusCode,200);await capture(db,randomUUID(),{id:randomUUID(),order_id:x.o.razorpayOrderId,amount:x.o.amount,currency:'INR'});assert.equal((await db.query('SELECT status FROM orders WHERE id=$1',[x.o.orderId])).rows[0].status,'refund_pending');assert.equal((await db.query('SELECT * FROM tickets WHERE order_id=$1',[x.o.orderId])).rows.length,0);assert.equal((await db.query('SELECT * FROM outbox WHERE recipient=$1',[`deleted-${x.u.id}@invalid.local`])).rows.length,0);
});
test('image uploads reject spoofed types and traversal; content CRUD handles missing records',async()=>{
 const u=await agent('manager');const boundary='audit-boundary';const payload=`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="fake.jpg"\r\nContent-Type: image/jpeg\r\n\r\n<script>alert(1)</script>\r\n--${boundary}--\r\n`;assert.equal((await u.request('POST','/api/v1/manage/media',payload,{'content-type':`multipart/form-data; boundary=${boundary}`})).statusCode,400);assert.equal((await app.inject('/media/not-an-image.svg')).statusCode,400);assert.equal((await u.request('DELETE','/api/v1/manage/content/missing')).statusCode,404);assert.equal((await app.inject('/api/v1/content/unknown')).statusCode,400);
});
test('production configuration rejects unsafe deployments and demo payment route is absent',async()=>{
 assert.throws(()=>validateConfig({...c,production:true}));const prod=await buildApp(db,{...c,production:true});try{assert.equal((await prod.inject('/api/v1/dev/pay/missing')).statusCode,404);}finally{await prod.close();}
});

test('late payment cannot bypass the cumulative four-booking account limit',async()=>{
 const x=await order();await db.query("UPDATE holds SET expires_at=now()-interval '1 second' WHERE id=$1",[x.h.id]);const {expireHolds}=await import('../src/booking');await expireHolds(db);await createHold(db,x.u.id,x.t,4,randomUUID());assert.equal((await capture(db,randomUUID(),{id:randomUUID(),order_id:x.o.razorpayOrderId,amount:x.o.amount,currency:'INR'})).refundPending,true);
});
test('payment after event start is reversed and no ticket is issued',async()=>{
 const x=await order();await db.query("UPDATE events SET starts_at=now()-interval '1 second' WHERE id=$1",[x.id]);assert.equal((await capture(db,randomUUID(),{id:randomUUID(),order_id:x.o.razorpayOrderId,amount:x.o.amount,currency:'INR'})).refundPending,true);assert.equal((await db.query('SELECT * FROM tickets WHERE order_id=$1',[x.o.orderId])).rows.length,0);
});
test('configured staff authenticator secrets require a valid code',async()=>{
 const {authenticator}=await import('otplib');const s=await agent('manager'),secret=authenticator.generateSecret();await db.query('UPDATE staff SET totp_secret=$1 WHERE id=$2',[secret,s.id]);try{assert.equal((await s.request('POST','/api/v1/auth/staff/login',{email:s.email,password:'HighSpirits!2026'})).statusCode,401);assert.equal((await s.request('POST','/api/v1/auth/staff/login',{email:s.email,password:'HighSpirits!2026',totp:authenticator.generate(secret)})).statusCode,200);}finally{await db.query('UPDATE staff SET totp_secret=NULL WHERE id=$1',[s.id]);}
});
test('password authentication calls the bot check when configured',async()=>{
 const guarded=await buildApp(db,{...c,turnstileSecret:'test-secret'});const initial=await guarded.inject('/api/v1/session');try{assert.equal((await guarded.inject({method:'POST',url:'/api/v1/auth/customer/password',headers:{origin:c.origin,cookie:initial.cookies.map(x=>`${x.name}=${x.value}`).join('; '),'x-csrf-token':initial.json().csrfToken},payload:{email:'guest@example.com',password:'Password2026!'}})).json().error.code,'BOT_CHECK');}finally{await guarded.close();}
});
test('live checkout stays disabled until tax is confirmed',async()=>{
 const e=await event(),u=await agent();const h=await createHold(db,u.id,e.t,1,randomUUID());await assert.rejects(checkout(db,{...c,production:true},u.id,{holdId:h.id,holderNames:['Tax Guest'],phone:'+919876543210',notes:''}),/confirms its tax/);
});
test('other users cannot verify or simulate payment for an order',async()=>{
 const x=await order(),other=await agent();assert.equal((await other.request('POST','/api/v1/dev/pay/'+x.o.orderId,{})).statusCode,404);assert.equal((await other.request('POST','/api/v1/payments/verify',{orderId:x.o.orderId,razorpay_payment_id:'p',razorpay_signature:'0'.repeat(64)})).statusCode,404);
});
test('magic links are single-use and deleted account tokens are revoked',async()=>{
 const u=await agent();const input={email:u.email,name:'Magic Guest',phone:'+919876543210',dob:'1990-01-01',consent:true};const r=await u.request('POST','/api/v1/auth/customer/request',input);assert.equal(r.statusCode,200,r.body);const token=new URL(r.json().developmentLink).searchParams.get('token');assert.equal((await u.request('POST','/api/v1/auth/customer/verify',{token})).statusCode,200);assert.equal((await u.request('POST','/api/v1/auth/customer/verify',{token})).statusCode,400);await u.request('DELETE','/api/v1/profile');assert.equal((await db.query('SELECT * FROM login_tokens WHERE principal_id=$1',[u.id])).rows.length,0);
});
test('anonymous and customer mutations cannot manage content, staff or bookings',async()=>{
 const u=await agent();for(const [method,url,payload] of [['POST','/manage/events',{}],['POST','/manage/users',{}],['PATCH','/manage/settings',{}],['POST','/manage/reservations',{}],['POST','/manage/guestlist',{}],['POST','/manage/content',{}],['DELETE','/manage/content/missing',undefined]] as const)assert.equal((await u.request(method,'/api/v1'+url,payload)).statusCode,403,url);
});
test('signup uniqueness, private cache headers and SQL-like text remain safe',async()=>{
 const u=await agent();assert.equal((await u.request('POST','/api/v1/auth/customer/password',{email:u.email.toUpperCase(),password:'AuditPassword2026!',register:true,consent:true})).statusCode,409);for(const url of ['/api/v1/session','/api/v1/profile','/api/v1/manage/users'])assert.equal((await u.request('GET',url)).headers['cache-control'],'no-store');assert.equal((await app.inject('/api/v1/events/%27%20OR%201%3D1--')).statusCode,404);
});
test('changing the role of invited staff preserves their acceptance link',async()=>{
 const admin=await agent('admin');const r=await admin.request('POST','/api/v1/manage/users',{name:'Role Update',email:`${randomUUID()}@example.com`,role:'promoter'});const {id,developmentLink}=r.json();assert.equal((await admin.request('PATCH','/api/v1/manage/users/'+id,{role:'manager',status:'invited'})).statusCode,200);const u=await agent();assert.equal((await u.request('POST','/api/v1/auth/staff/accept',{token:new URL(developmentLink).searchParams.get('invite'),password:'RolePassword2026!'})).statusCode,200);assert.equal((await u.request('GET','/api/v1/session')).json().user.role,'manager');
});
test('production validates mandatory bot site key and nonempty webhook secret',()=>{
 const safe={...c,production:true,databaseUrl:'postgres://test',payments:'razorpay',razorpayKey:'key',razorpaySecret:'secret',webhookSecret:'webhook-secret',emailKey:'email-key',emailFrom:'club@example.com',turnstileSecret:'bot-secret',turnstileSite:'bot-site',origin:'https://club.example.com',seed:false};assert.doesNotThrow(()=>validateConfig(safe));for(const overrides of [{webhookSecret:''},{turnstileSite:''},{seed:true},{payments:'demo'},{origin:'http://club.example.com'}])assert.throws(()=>validateConfig({...safe,...overrides}));
});

test('reconciliation recovers an ambiguous provider order and a missed capture exactly once',async()=>{
 const {reconcilePayments}=await import('../src/jobs');const x=await order();await db.query("UPDATE orders SET razorpay_order_id=NULL,status='provider_unknown',created_at=now()-interval '3 minutes' WHERE id=$1",[x.o.orderId]);const original=globalThis.fetch;const remote='order_recovered_'+randomUUID();const paymentId='pay_recovered_'+randomUUID();
 globalThis.fetch=async url=>{const u=new URL(String(url));if(u.pathname==='/v1/orders'){const receipt=u.searchParams.get('receipt');return new Response(JSON.stringify({items:receipt===x.o.orderId?[{id:remote,receipt,amount:x.o.amount,currency:'INR'}]:[]}));}if(u.pathname===`/v1/orders/${remote}/payments`)return new Response(JSON.stringify({items:[{id:paymentId,order_id:remote,amount:x.o.amount,currency:'INR',status:'captured'}]}));return new Response(JSON.stringify({items:[]}));};
 try{await reconcilePayments(db,{...c,payments:'razorpay'});await db.query('UPDATE orders SET reconciled_at=NULL WHERE id=$1',[x.o.orderId]);await reconcilePayments(db,{...c,payments:'razorpay'});const stored=(await db.query('SELECT * FROM orders WHERE id=$1',[x.o.orderId])).rows[0];assert.equal(stored.status,'paid');assert.equal(stored.razorpay_order_id,remote);assert.equal(stored.reconciliation_error,null);assert.equal((await db.query('SELECT * FROM tickets WHERE order_id=$1',[x.o.orderId])).rows.length,1);}finally{globalThis.fetch=original;}
});
test('reconciliation records provider failures for review and never recreates an order',async()=>{
 const {reconcilePayments}=await import('../src/jobs');const x=await order();await db.query("UPDATE orders SET razorpay_order_id=NULL,status='provider_unknown',created_at=now()-interval '3 minutes' WHERE id=$1",[x.o.orderId]);const original=globalThis.fetch;globalThis.fetch=async(_url,init)=>{assert.notEqual(init?.method,'POST');return new Response(JSON.stringify({items:[]}));};try{await reconcilePayments(db,{...c,payments:'razorpay'});const stored=(await db.query('SELECT * FROM orders WHERE id=$1',[x.o.orderId])).rows[0];assert.equal(stored.status,'provider_unknown');assert.ok(stored.reconciliation_error.includes('venue review'));}finally{globalThis.fetch=original;}
});
test('email worker retries provider failures and sends the same idempotency key',async()=>{
 await db.query('DELETE FROM outbox');const id=randomUUID();await db.query('INSERT INTO outbox(id,recipient,subject,html) VALUES($1,$2,$3,$4)',[id,'worker@example.com','Worker test','<p>Test</p>']);const original=globalThis.fetch;let success=false,calls=0;
 globalThis.fetch=async(url,init)=>{assert.equal(String(url),'https://api.resend.com/emails');assert.equal(new Headers(init?.headers).get('Idempotency-Key'),id);calls++;return new Response('{}',{status:success?200:503});};
 try{await runJobs(db,{...c,emailKey:'test-key',emailFrom:'club@example.com'});assert.equal((await db.query('SELECT attempts FROM outbox WHERE id=$1',[id])).rows[0].attempts,1);success=true;await runJobs(db,{...c,emailKey:'test-key',emailFrom:'club@example.com'});assert.equal((await db.query('SELECT status FROM outbox WHERE id=$1',[id])).rows[0].status,'sent');assert.equal(calls,2);}finally{globalThis.fetch=original;}
});
