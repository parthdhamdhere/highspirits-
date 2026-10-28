import type {Metadata} from 'next';
import '@fontsource-variable/schibsted-grotesk';
import './globals.css';
export const metadata:Metadata={title:'highspirts cafe · Pune',description:'Find your next night. Events, tickets and table bookings at highspirts cafe, Pune.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
