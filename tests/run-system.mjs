import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as pause} from 'node:timers/promises';
const env={...process.env,API_INTERNAL_URL:'http://127.0.0.1:4002',NEXT_DIST_DIR:'.next-audit'};
const children=[];
function launch(command,args){const child=spawn(command,args,{env,stdio:'inherit'});children.push(child);return child;}
async function run(command,args){const child=launch(command,args);const [code]=await once(child,'exit');if(code!==0)throw new Error(`${command} failed (${code})`);}
async function ready(url){for(let i=0;i<120;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return;}catch{}await pause(250);}throw new Error('Test service did not start: '+url);}
try{
 // Protect an existing local server from accidental test writes.
 for(const port of [3002,4002]){try{await fetch(`http://127.0.0.1:${port}`,{signal:AbortSignal.timeout(500)});}catch{continue;}throw new Error(`Port ${port} is in use. Stop that test service before running acceptance tests.`);}
 await run('npm',['run','build','-w','frontend']);
 launch(process.execPath,['--import','tsx','backend/test/system-server.ts']);await ready('http://127.0.0.1:4002/api/health');
 launch(process.execPath,['node_modules/next/dist/bin/next','start','frontend','--hostname','127.0.0.1','--port','3002']);await ready('http://127.0.0.1:3002/login');
 await run(process.execPath,['tests/acceptance.mjs']);
}finally{
 for(const child of children){if(child.exitCode===null&&child.signalCode===null){const stopped=once(child,'exit');child.kill('SIGTERM');await Promise.race([stopped,pause(5000)]);if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');}}
}
