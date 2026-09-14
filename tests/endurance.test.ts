import {it,expect} from 'vitest';
import {Simulation} from '../src/sim';
import {ENEMIES,type TowerKind} from '../src/data';
import {distance} from '../src/map';
it('a staffed fortress can fight the full independent 20-wave schedule to victory',()=>{
 const s=new Simulation();s.start();s.god=true;s.player.level=12;s.player.gold=99999;
 const locations:[TowerKind,number,number][]=[['arrow',31.5,32.5],['arrow',32.5,31.5],['arrow',32.5,33.5],['arrow',34.5,31.5],['arrow',30.5,33.5],['mortar',30.5,30.5],['mortar',34.5,34.5],['mortar',30.5,34.5],['mortar',34.5,30.5],['frost',29.5,32.5],['frost',35.5,32.5],['frost',32.5,35.5],['taunt',32.5,29.5],['taunt',35.5,34.5],['wall',29.5,34.5]];
 for(const [kind,x,y]of locations)s.addBuilding(kind,x,y,true);for(const t of s.buildings){t.level=4;s.attributes(t);}
 let maxEnemies=0,maxBosses=0;const start=performance.now();
 for(let frame=0;frame<1200*30&&s.state==='playing';frame++){
  // Test-only maintenance crew keeps damage fixtures alive; does not kill or reposition enemies.
  for(const t of s.buildings)t.hp=t.maxHp;
  s.tick(1/30);s.soundEvents=[];
  maxEnemies=Math.max(maxEnemies,s.enemies.length);maxBosses=Math.max(maxBosses,s.enemies.filter(e=>ENEMIES[e.kind].boss).length);
 }
 console.log(JSON.stringify({test:'20-wave endurance',time:s.time,state:s.state,kills:s.stats.kills,remaining:s.enemies.map(e=>({kind:e.kind,x:e.x,y:e.y,d:distance(e,s.player),target:e.target,wind:e.wind,skillAt:e.skillAt,stunUntil:e.stunUntil})),zones:s.zones,maxEnemies,maxBosses,elapsedMs:Math.round(performance.now()-start)}));
 expect(s.batches.every(b=>b.done)).toBe(true);expect(s.wave).toBe(20);expect(s.state).toBe('won');expect(s.stats.kills).toBe(928);
},60000);
it('928-unit accumulation remains finite and leaves every scheduled batch accounted for',()=>{
 const s=new Simulation();s.start();s.god=true;s.buildings=[];s.reindex();
 s.time=900; // All due batches must be serviced, not dropped or limited by an arbitrary live-unit cap.
 s.tick(1/30);expect(s.enemies.length).toBe(928);expect(s.batches.every(b=>b.done)).toBe(true);
 const start=performance.now();for(let i=0;i<30;i++)s.tick(1/30);
 console.log(JSON.stringify({test:'928-unit pressure',oneSecondSimulationMs:Math.round(performance.now()-start),remaining:s.enemies.length}));
 for(let a=0;a<s.enemies.length;a++)for(let b=a+1;b<s.enemies.length;b++){const first=s.enemies[a],second=s.enemies[b];expect(distance(first,second)).toBeGreaterThanOrEqual(ENEMIES[first.kind].r+ENEMIES[second.kind].r-.003);}
 expect(s.enemies.every(e=>Number.isFinite(e.x)&&Number.isFinite(e.y)&&Number.isFinite(e.hp))).toBe(true);expect(s.state).toBe('playing');
},60000);
