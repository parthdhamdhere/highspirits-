import {database,migrate} from '../src/db';
import {seed} from '../src/seed';
import {buildApp} from '../src/app';
import {config} from '../src/config';
const db=await database();await migrate(db);await seed(db,true);
const app=await buildApp(db,{...config,production:false,payments:'demo',origin:'http://127.0.0.1:3002',emailKey:'',turnstileSecret:'',turnstileSite:''});
await app.listen({port:4002,host:'127.0.0.1'});
console.log('Isolated audit API ready');
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,async()=>{await app.close();await db.close();process.exit(0);});
