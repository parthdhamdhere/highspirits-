import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {api,post} from '../lib/api';
const original=globalThis.fetch;
after(()=>{globalThis.fetch=original;});
const response=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
test('recovers once from a stale CSRF token without replaying a successful action',async()=>{
 let mutations=0,sessions=0;globalThis.fetch=async(_url,init)=>{if(String(_url).endsWith('/session')){sessions++;return response({csrfToken:'fresh-token',user:null});}mutations++;if(mutations===1)return response({error:{code:'CSRF',message:'Session changed'}},403);assert.equal(new Headers(init?.headers).get('x-csrf-token'),'fresh-token');return response({ok:true});};
 assert.deepEqual(await post('/logout',{}),{ok:true});assert.equal(mutations,2);assert.ok(sessions>=1);
});
test('does not retry origin, permission, validation, server or network failures',async()=>{
 for(const [code,status] of [['ORIGIN',403],['FORBIDDEN',403],['VALIDATION',400],['REQUEST_FAILED',500]] as const){let n=0;globalThis.fetch=async()=>{n++;return response({error:{code,message:'Rejected'}},status);};await assert.rejects(post('/logout',{}),/Rejected/);assert.equal(n,1);}
 globalThis.fetch=async()=>{throw new Error('Offline');};await assert.rejects(post('/logout',{}),/Offline/);
});
test('persistent CSRF failure stops after one retry',async()=>{
 let n=0;globalThis.fetch=async url=>{if(String(url).endsWith('/session'))return response({csrfToken:'fresh-token'});n++;return response({error:{code:'CSRF',message:'Changed again'}},403);};await assert.rejects(post('/logout',{}),/Changed again/);assert.equal(n,2);
});
test('preserves multipart boundaries, credentials, custom headers and returned tokens',async()=>{
 globalThis.fetch=async(_url,init)=>{assert.equal(new Headers(init?.headers).get('Content-Type'),null);assert.equal(new Headers(init?.headers).get('Idempotency-Key'),'key');assert.equal(init?.credentials,'include');return response({csrfToken:'rotated-token'});};const form=new FormData();form.append('file','image');await api('/manage/media',{method:'POST',body:form,headers:{'Idempotency-Key':'key'}});
 globalThis.fetch=async(_url,init)=>{assert.equal(new Headers(init?.headers).get('x-csrf-token'),'rotated-token');return response({ok:true});};await post('/logout',{});
});
