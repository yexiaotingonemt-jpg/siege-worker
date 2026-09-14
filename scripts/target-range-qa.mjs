import {chromium} from '@playwright/test';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5186/?qa');await page.click('[data-action="start"]');
await page.evaluate(()=>{const s=window.siege.sim();s.paused=false;s.time=0;s.enemies=[];s.buildings=[];s.reindex();s.addBuilding('arrow',26.5,20.5,true);s.spawn('infantry',{x:25.4,y:21.5},1);s.player.x=27.4;s.player.y=21.5;s.updateEnemies(0);s.enemies[0].stunUntil=100;s.enemies[0].hp=10000;});
await page.mouse.move(636,468);await page.waitForTimeout(300);await page.screenshot({path:'qa/enemy-target-range.png'});console.log(JSON.stringify({errors}));await browser.close();

