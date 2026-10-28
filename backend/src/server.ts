import {mkdir} from 'node:fs/promises';
import {config,validateConfig,dataDir} from './config';
import {database,migrate} from './db';
import {seed} from './seed';
import {buildApp} from './app';
import {runJobs} from './jobs';
validateConfig(config);if(!config.databaseUrl)await mkdir(dataDir,{recursive:true});const db=await database(config.databaseUrl,config.localDb);await migrate(db);await seed(db,config.seed);const app=await buildApp(db,config);let working=false;const timer=setInterval(async()=>{if(working)return;working=true;try{await runJobs(db,config);}catch(e){app.log.error(e);}finally{working=false;}},60000);timer.unref();await app.listen({port:config.port,host:config.production?'0.0.0.0':'127.0.0.1'});console.log(`highspirts API: http://127.0.0.1:${config.port} (${config.payments})`);for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{clearInterval(timer);await app.close();await db.close();process.exit(0);});

