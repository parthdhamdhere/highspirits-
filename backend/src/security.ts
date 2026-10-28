import { randomBytes, scryptSync, timingSafeEqual, createHash, createHmac } from 'node:crypto';
export const token=()=>randomBytes(32).toString('hex');
export const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export function passwordHash(password:string){const salt=randomBytes(16).toString('hex');return `${salt}:${scryptSync(password,salt,64).toString('hex')}`;}
export function passwordValid(password:string,stored:string|null){if(!stored)return false;const [salt,digest]=stored.split(':');if(!salt||!digest)return false;const b=Buffer.from(digest,'hex');return b.length===64&&timingSafeEqual(b,scryptSync(password,salt,64));}
export function signatureValid(body:string,signature:string|undefined,secret:string){if(!signature||!/^[a-f0-9]{64}$/i.test(signature))return false;return timingSafeEqual(Buffer.from(signature,'hex'),createHmac('sha256',secret).update(body).digest());}
export const escapeHtml=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function csv(rows:unknown[][]){return '\uFEFF'+rows.map(row=>row.map(v=>{let s=String(v??'');if(/^[\s\u0000-\u001f]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}).join(',')).join('\r\n');}
export class ApiError extends Error{constructor(public statusCode:number,public code:string,message:string){super(message);}}
export const fail=(status:number,code:string,message:string):never=>{throw new ApiError(status,code,message);};
