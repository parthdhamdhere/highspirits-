import {ClubApp} from '../../components/club-app';
export default async function Page({params}:{params:Promise<{path?:string[]}>}){
 const {path}=await params;const route='/'+(path||[]).join('/');let initial;
 if(!route.startsWith('/manage')&&!['/login','/profile'].includes(route))try{const base=process.env.API_INTERNAL_URL||'http://127.0.0.1:4000';const [e,c]=await Promise.all([fetch(base+'/api/v1/events',{next:{revalidate:5},signal:AbortSignal.timeout(3000)}),fetch(base+'/api/v1/config',{next:{revalidate:30},signal:AbortSignal.timeout(3000)})]);if(e.ok&&c.ok)initial={events:(await e.json()).events,config:await c.json()};}catch{/* The client presents a recoverable API connection error. */}
 return <ClubApp key={route} path={route} initial={initial}/>;
}
