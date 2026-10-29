import 'dotenv/config';
import {fileURLToPath} from 'node:url';
export const dataDir=fileURLToPath(new URL('../../.data/',import.meta.url));
export const config={production:process.env.NODE_ENV==='production',port:Number(process.env.PORT||4000),origin:process.env.WEB_ORIGIN||'http://127.0.0.1:3000',databaseUrl:process.env.DATABASE_URL,localDb:process.env.LOCAL_DB_PATH||dataDir+'club',payments:process.env.PAYMENT_MODE||'demo',razorpayKey:process.env.RAZORPAY_KEY_ID||'',razorpaySecret:process.env.RAZORPAY_KEY_SECRET||'',webhookSecret:process.env.RAZORPAY_WEBHOOK_SECRET||'local-demo-webhook-secret',emailKey:process.env.RESEND_API_KEY||'',emailFrom:process.env.EMAIL_FROM||'',turnstileSecret:process.env.TURNSTILE_SECRET_KEY||'',turnstileSite:process.env.TURNSTILE_SITE_KEY||'',seed:process.env.SEED_DEMO!=='false'};
export type Config=typeof config;
export function validateConfig(c:Config){if(c.production&&(!c.databaseUrl||c.payments!=='razorpay'||!c.razorpayKey||!c.razorpaySecret||(!c.webhookSecret.trim()||c.webhookSecret==='local-demo-webhook-secret')||!c.emailKey||!c.emailFrom||!c.turnstileSecret||!c.turnstileSite||c.seed||!c.origin.startsWith('https://')))throw new Error('Production requires PostgreSQL, Razorpay and webhook secrets, email, Turnstile, HTTPS WEB_ORIGIN and SEED_DEMO=false.');}

