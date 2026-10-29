import type {Metadata} from 'next';
import '@fontsource-variable/schibsted-grotesk';
import './globals.css';
export const metadata:Metadata={title:'The High Spirits Cafe · Pune',description:'Find your next night. Events, tickets and table bookings at The High Spirits Cafe, Pune.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
