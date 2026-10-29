import { z } from 'zod';

export const roleSchema = z.enum(['admin','manager','promoter']);
export type Role = z.infer<typeof roleSchema>;
export const id = z.string().min(1).max(100);
export const phone = z.string().regex(/^\+?[0-9]{10,15}$/, 'Enter a valid phone number including country code');
export const tierInput = z.object({name:z.string().min(2).max(100),kind:z.enum(['ticket','table']),partyType:z.enum(['female','couple','table']),seats:z.number().int().min(1).max(30),pricePaise:z.number().int().min(0).max(100000000),quantity:z.number().int().min(1).max(700),maxPerOrder:z.number().int().min(1).max(4).default(4),saleStartsAt:z.string().datetime(),saleEndsAt:z.string().datetime(),perks:z.string().max(1000).default(''),sortOrder:z.number().int().default(0),active:z.boolean().default(true)}).refine(t=>t.kind==='table'?t.partyType==='table':t.partyType!=='table','Ticket/table party type does not match').refine(t=>t.kind==='table'||t.seats===(t.partyType==='couple'?2:1),'Female tickets require one guest and couple tickets require two').refine(t=>Date.parse(t.saleEndsAt)>Date.parse(t.saleStartsAt),'Sale end must follow sale start');
export const eventInput = z.object({title:z.string().min(2).max(160),description:z.string().min(10).max(8000),lineup:z.string().max(1000),posterUrl:z.string().max(2000).refine(s=>s===''||s.startsWith('/media/')||/^https:\/\//.test(s),'Use an HTTPS image URL'),startsAt:z.string().datetime(),doorsAt:z.string().datetime(),capacity:z.number().int().min(1).max(700),status:z.enum(['draft','published','cancelled']),tiers:z.array(tierInput).min(1).max(30)}).refine(e=>e.tiers.reduce((n,t)=>n+t.quantity*t.seats,0)<=e.capacity,'Tier guest capacity exceeds venue capacity');
export const holdInput = z.object({tierId:id,qty:z.number().int().min(1).max(4)});
export const checkoutInput = z.object({holdId:id,holderNames:z.array(z.string().trim().min(2).max(100)).min(1).max(30),phone,notes:z.string().max(1000).default(''),policyAccepted:z.literal(true)});
export const guestInput = z.object({eventId:id,name:z.string().trim().min(2).max(100),phone,partyType:z.enum(['female','couple']),plusCount:z.number().int().min(0).max(10).default(0),notes:z.string().max(1000).default('')});
export const customerInput = z.object({email:z.string().email().max(254),name:z.string().trim().min(2).max(100),phone,dob:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),consent:z.literal(true),next:z.string().max(300).regex(/^\/(?!\/)/).default('/profile'),botToken:z.string().optional()});
export const staffLoginInput = z.object({email:z.string().email(),password:z.string().min(1).max(256),totp:z.string().optional(),botToken:z.string().optional()});
export const settingsInput = z.object({tableCoverPaise:z.number().int().min(0).max(1000000),platformFeePaise:z.number().int().min(0).max(100000),gstBasisPoints:z.number().int().min(0).max(2800),gstConfirmed:z.boolean(),businessGstin:z.string().max(20),tablePaymentMode:z.enum(['cover','deposit'])});
export type TierInput = z.infer<typeof tierInput>;
export type EventInput = z.infer<typeof eventInput>;
export type Tier = TierInput & {id:string;remaining:number;availability:'on_sale'|'sold_out'|'opens_soon'|'closed'};
export type ClubEvent = Omit<EventInput,'tiers'> & {id:string;tiers:Tier[];ticketsSold:number;tablesBooked:number;revenuePaise:number};
export type Settings = z.infer<typeof settingsInput>;
export type SessionUser = {id:string;name:string;email:string;role:Role|'customer';phone?:string;dob?:string};
export type Session = {user:SessionUser|null;csrfToken:string};
export type Hold = {id:string;tierId:string;qty:number;expiresAt:string;status:string};
export type Order = {id:string;eventId:string;title:string;tierName:string;kind:'ticket'|'table';status:string;qty:number;holderNames:string[];phone:string;notes:string;subtotalPaise:number;coverPaise:number;feePaise:number;gstPaise:number;totalPaise:number;createdAt:string;startsAt:string;razorpayOrderId:string|null;tickets:{id:string;holderName:string;qrPayload:string;status:string}[]};
export type Guest = {id:string;eventId:string;name:string;phone:string;partyType:string;plusCount:number;notes:string;addedBy:string;createdAt:string};
export type Staff = {id:string;name:string;email:string;role:Role;status:string};
export const money = (paise:number) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:paise%100?2:0}).format(paise/100);
export function priceBreakdown(unit:number,qty:number,kind:string,settings:Settings){const subtotalPaise=unit*qty;const coverPaise=kind==='table'?settings.tableCoverPaise*qty:0;const feePaise=settings.platformFeePaise;const gstPaise=Math.round((subtotalPaise+coverPaise+feePaise)*settings.gstBasisPoints/10000);return {subtotalPaise,coverPaise,feePaise,gstPaise,totalPaise:subtotalPaise+coverPaise+feePaise+gstPaise};}
export function isAdult(dob:string,now=new Date()){const d=new Date(dob+'T00:00:00Z');if(Number.isNaN(d.valueOf())||d.toISOString().slice(0,10)!==dob)return false;const today=new Date(now.valueOf()+19800000);let age=today.getUTCFullYear()-d.getUTCFullYear();if(today.getUTCMonth()<d.getUTCMonth()||(today.getUTCMonth()===d.getUTCMonth()&&today.getUTCDate()<d.getUTCDate()))age--;return age>=21;}
