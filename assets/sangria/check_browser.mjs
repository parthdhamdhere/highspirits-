import assert from 'node:assert/strict';
import {mkdirSync, writeFileSync} from 'node:fs';
import {Browser, sleep} from '../../.agents/skills/taste-skill/scripts/lib/cdp.mjs';
const url=process.env.CHECK_URL || 'http://127.0.0.1:3001';
// Run from the repository root after starting the production site and API.
const out='.taste-skill/sangria-check';mkdirSync(out,{recursive:true});
const browser=await Browser.launch();const results=[];
const scroll=async(page,p)=>{await page.eval(p=>{const s=document.querySelector('.sangria-story');const stage=s.querySelector('.sangria-stage');window.scrollTo({top:scrollY+s.getBoundingClientRect().top+(s.offsetHeight-stage.offsetHeight)*p,behavior:'instant'});},p);await sleep(700);};
const state=page=>page.eval(()=>{const s=document.querySelector('.sangria-story'),c=s.querySelector('.sangria-copy'),v=s.querySelector('video'),stage=s.querySelector('.sangria-stage');const r=c.getBoundingClientRect();return {revealed:!c.inert,opacity:+getComputedStyle(c).opacity,top:stage.getBoundingClientRect().top,copy:{x:r.x,y:r.y,right:r.right,bottom:r.bottom},width:innerWidth,height:innerHeight,overflow:s.scrollWidth>s.clientWidth, pageOverflow:document.documentElement.scrollWidth>innerWidth,time:v.currentTime,duration:v.duration,videoWidth:v.videoWidth,videoHeight:v.videoHeight,static:s.classList.contains('sangria-static')};});
try{
 for(const [width,height] of [[1440,900],[1366,768],[768,1024],[390,844],[320,568],[844,390]]){
  const page=await browser.newPage({width,height});await page.goto(url);await scroll(page,0);
  const opening=await state(page);assert.equal(opening.revealed,false);assert.equal(opening.videoWidth,1920);assert.equal(opening.videoHeight,1080);await page.screenshot({path:`${out}/${width}-opening.jpg`});
  await scroll(page,.75);const finish=await state(page);assert.equal(finish.revealed,true);assert.equal(finish.opacity,1);assert.ok(Math.abs(finish.top)<1);assert.ok(!finish.overflow);assert.ok(finish.copy.y>=0 && finish.copy.bottom<=height,JSON.stringify(finish));
  await page.screenshot({path:`${out}/${width}-hero.jpg`});
  await scroll(page,.95);assert.ok(Math.abs((await state(page)).copy.y-finish.copy.y)<1,'Hero must stay pinned');
  await scroll(page,.2);assert.equal((await state(page)).revealed,false);const reverse=await state(page);assert.ok(Math.abs(reverse.time-reverse.duration*.2/.72)<.15,'Reverse seeking');
  await page.eval(()=>document.querySelector('.sangria-skip').click());await sleep(700);assert.equal((await state(page)).revealed,true);assert.equal(await page.eval(()=>document.activeElement.tagName),'H1');
  await scroll(page,1.2);assert.ok((await state(page)).top<0,'Stage must release for programme');
  assert.equal(page.consoleErrors.length,0,page.consoleErrors.join('\n'));results.push({width,height,finish});await page.close();
 }
 for(const mode of ['reduced','no-script','video-error']){
  const page=await browser.newPage({width:390,height:844,reducedMotion:mode==='reduced'});
  if(mode==='no-script')await page.send('Emulation.setScriptExecutionDisabled',{value:true});
  if(mode==='video-error'){await page.send('Network.enable');await page.send('Network.setBlockedURLs',{urls:['*/sangria/pour.mp4']});}
  await page.goto(url);await sleep(500);const rest=await state(page);assert.equal(rest.revealed,true,mode);assert.equal(rest.static,true,mode);assert.equal(rest.opacity,1,mode);await page.screenshot({path:`${out}/${mode}.jpg`});results.push({mode,rest});await page.close();
 }
 writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));console.log(`PASS: ${results.length} viewport/fallback scenarios, pin hold, reverse seek, skip focus, overflow, and release.`);
}finally{await browser.close();}
