import type {Session,Settings,ClubEvent,Order,Guest,Staff} from '@highspirits/contracts';
let csrf='';
export class ApiError extends Error{constructor(message:string,public status:number,public code:string){super(message);}}
export async function api<T>(path:string,init:RequestInit={},retryCsrf=true):Promise<T>{const method=init.method||'GET';if(method!=='GET'&&!csrf){const s=await api<Session>('/session');csrf=s.csrfToken;}const headers=new Headers(init.headers);if(init.body&&!(init.body instanceof FormData))headers.set('Content-Type','application/json');if(method!=='GET')headers.set('X-CSRF-Token',csrf);const response=await fetch('/api/v1'+path,{...init,headers,credentials:'include',cache:'no-store'});const data=await response.json();if(!response.ok&&response.status===403&&data.error?.code==='CSRF'&&method!=='GET'&&retryCsrf){await api<Session>('/session');return api<T>(path,init,false);}if(!response.ok)throw new ApiError(data.error?.message||'Request failed',response.status,data.error?.code||'UNKNOWN');if(data.csrfToken)csrf=data.csrfToken;return data as T;}
export const post=<T>(path:string,data:unknown,headers?:HeadersInit)=>api<T>(path,{method:'POST',body:JSON.stringify(data),headers});
export const patch=<T>(path:string,data:unknown)=>api<T>(path,{method:'PATCH',body:JSON.stringify(data)});
export type PublicConfig={name:string;city:string;minimumAge:number;refundPolicy:string;demo:boolean;turnstileSiteKey:string;settings:Settings};
export type Checkout={orderId:string;razorpayOrderId:string;keyId:string;amount:number;currency:string;mode:string;expiresAt:string};
export const date=(value:string,options:Intl.DateTimeFormatOptions={weekday:'short',day:'numeric',month:'short'})=>new Intl.DateTimeFormat('en-IN',{...options,timeZone:'Asia/Kolkata'}).format(new Date(value));
export const time=(value:string)=>date(value,{hour:'numeric',minute:'2-digit'});
export const tierPayload=(e:ClubEvent)=>({...e,tiers:e.tiers.map(({id,remaining,availability,...t})=>t)});
