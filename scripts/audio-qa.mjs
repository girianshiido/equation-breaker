import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const names=['tap','lift','cross','drop','merge','win','cancel'],report=[];
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{for(const fallback of [false,true]){
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(fallback=>{
  window.played=[];const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){window.played.push(this.buffer.duration);return start.apply(this,args);};
  if(fallback){const original=window.fetch.bind(window);window.fallbackRequests=0;window.fetch=(input,init)=>{if(String(input).endsWith('.ogg'))return Promise.resolve(new Response('invalid audio'));if(String(input).endsWith('.mp3'))window.fallbackRequests++;return original(input,init);};}
 },fallback);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.QA_URL||'http://127.0.0.1:5194/');await page.locator('#play').waitFor();
 if(!fallback){const decoded=await page.evaluate(async names=>{const ac=new AudioContext(),out=[];for(const name of names)for(const ext of ['ogg','mp3']){const res=await fetch(`./audio/${name}.${ext}`);const b=await ac.decodeAudioData(await res.arrayBuffer());let peak=0;for(const value of b.getChannelData(0))peak=Math.max(peak,Math.abs(value));out.push({name,ext,duration:b.duration,channels:b.numberOfChannels,peak});}await ac.close();return out;},names);assert.equal(decoded.length,14);for(const s of decoded){assert.ok(s.duration>.1&&s.duration<1.1);assert.equal(s.channels,2);assert.ok(s.peak>.03&&s.peak<.5);}report.push({test:'14 real files decode and contain unclipped sound',decoded});}
 await page.locator('#sound-toggle').click();await page.waitForFunction(()=>window.played.length>0);assert.equal(await page.locator('#sound-toggle').getAttribute('aria-pressed'),'true');
 await page.locator('[data-screen="settings"]').click();assert.equal(await page.locator('[data-pref="sound"]').isChecked(),true);
 await page.locator('[data-pref="sound"]').uncheck();assert.equal(await page.locator('#sound-toggle').getAttribute('aria-pressed'),'false');
 await page.locator('#sound-toggle').click();assert.equal(await page.locator('[data-pref="sound"]').isChecked(),true);
 await page.locator('[data-screen="home"]:visible').first().click();
 if(fallback)assert.ok(await page.evaluate(()=>window.fallbackRequests>=7));
 await page.locator('#sound-toggle').click();const before=await page.evaluate(()=>window.played.length);await page.locator('#play').click();await page.locator('[data-node="l.1"]').click();await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>window.played.length),before);
 await page.locator('#sound-toggle').click();await page.waitForFunction(before=>window.played.length>before,before);

 // Genuine drag events trigger recorded lift, crossing, deposit and reduction cues.
 const startCount=await page.evaluate(()=>window.played.length),from=await page.locator('[data-node="l.1"]').boundingBox(),to=await page.locator('.right-plate').boundingBox();
 await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();await page.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps:10});await page.waitForSelector('.drop-over');await page.mouse.up();await page.waitForFunction(()=>document.querySelector('#moves').textContent==='1');
 assert.ok(await page.evaluate(n=>window.played.length>=n+4,startCount),'Recorded cues during actual drag');
 await page.evaluate(async()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await page.waitForFunction(()=>document.querySelector('.footer').textContent.includes('Prêt pour le hors-ligne'));
 await context.setOffline(true);await page.reload();await page.locator('#sound-toggle').click();await page.locator('#sound-toggle').click();await page.waitForFunction(()=>window.played.length>0);assert.deepEqual(errors,[]);
 report.push({fallback,playback:true,mute:true,offlinePlayback:true,errors});await context.close();
}await mkdir('test-results',{recursive:true});await writeFile('test-results/audio-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,decodedFiles:14,fallback:true,mute:true,offline:true}));}finally{await browser.close();}
