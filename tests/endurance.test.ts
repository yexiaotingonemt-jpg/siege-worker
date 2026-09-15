import {it,expect} from 'vitest';
import {Simulation} from '../src/sim';
import {ENEMIES,type TowerKind} from '../src/data';
import {distance} from '../src/map';
it('a staffed fortress can fight the full independent 20-wave schedule to victory',()=>{
 const s=new Simulation();s.start();s.god=true;s.player.level=12;s.setGold(99999);
 const locations:[TowerKind,number,number][]=[['arrow',17.5,16.5],['arrow',15.5,16.5],['arrow',16.5,15.5],['arrow',16.5,17.5],['arrow',18.5,15.5],['arrow',14.5,17.5],['mortar',14.5,14.5],['mortar',18.5,18.5],['mortar',14.5,18.5],['mortar',18.5,14.5],['frost',13.5,16.5],['frost',19.5,16.5],['frost',16.5,19.5],['taunt',16.5,13.5],['taunt',19.5,18.5],['wall',13.5,18.5]];
 for(const [kind,x,y]of locations)s.addBuilding(kind,x,y,true);for(const t of s.buildings){t.level=4;s.attributes(t);}
 let maxEnemies=0,maxBosses=0;const start=performance.now();
 for(let frame=0;frame<1200*30&&s.state==='playing';frame++){
  // Test-only maintenance crew keeps damage fixtures alive; does not kill or reposition enemies.
  for(const t of s.buildings)t.hp=t.maxHp;
  s.tick(1/30);s.soundEvents=[];
  maxEnemies=Math.max(maxEnemies,s.enemies.length);maxBosses=Math.max(maxBosses,s.enemies.filter(e=>ENEMIES[e.kind].boss).length);
 }
 console.log(JSON.stringify({test:'20-wave endurance',time:s.time,state:s.state,kills:s.stats.kills,remaining:s.enemies.map(e=>({kind:e.kind,x:e.x,y:e.y,d:distance(e,s.player),target:e.target,wind:e.wind,skillAt:e.skillAt,stunUntil:e.stunUntil})),zones:s.zones,maxEnemies,maxBosses,elapsedMs:Math.round(performance.now()-start)}));
 expect(s.batches.every(b=>b.done)).toBe(true);expect(s.wave).toBe(20);expect(s.state).toBe('won');expect(s.stats.kills).toBe(930);
},60000);
it('930-unit accumulation on the compact battlefield stays finite and collision-free',()=>{
 const s=new Simulation();s.start();s.god=true;s.buildings=[];s.reindex();
 s.time=900;s.tick(1/30);expect(s.enemies.length).toBe(930);expect(s.batches.every(b=>b.done)).toBe(true);
 const start=performance.now();for(let i=0;i<30;i++)s.tick(1/30);
 console.log(JSON.stringify({test:'compact-map pressure',oneSecondSimulationMs:Math.round(performance.now()-start),active:s.enemies.length}));
 for(let a=0;a<s.enemies.length;a++)for(let b=a+1;b<s.enemies.length;b++){const first=s.enemies[a],second=s.enemies[b];if(!!ENEMIES[first.kind].air!==!!ENEMIES[second.kind].air)continue;expect(distance(first,second)).toBeGreaterThanOrEqual(ENEMIES[first.kind].r+ENEMIES[second.kind].r-.003);}
 expect(s.enemies.every(e=>Number.isFinite(e.x)&&Number.isFinite(e.y)&&Number.isFinite(e.hp))).toBe(true);expect(s.state).toBe('playing');
},60000);
it('a remote client interpolates the 1946-enemy three-player schedule without rerunning battle AI',()=>{
 const host=new Simulation(3);host.start();host.god=true;host.buildings=[];host.reindex();const template=host.spawn('infantry',{x:24,y:16},20);host.enemies=Array.from({length:1946},(_,i)=>({...template,id:1000+i,x:2+(i%28),y:2+(Math.floor(i/28)%28)}));const fullBytes=JSON.stringify(host.networkState()).length,wire=JSON.stringify(host.networkState(true)),compactBytes=wire.length,guest=new Simulation(3);guest.start();guest.reconcileNetworkState(JSON.parse(wire),2);const hp=guest.enemies.reduce((sum,e)=>sum+e.hp,0),start=performance.now();
 for(let i=0;i<30;i++)guest.predictNetwork(1/30,2);
 const elapsed=performance.now()-start;console.log(JSON.stringify({test:'1946-unit remote prediction',oneSecondPredictionMs:Number(elapsed.toFixed(2)),fullBytes,compactBytes,remaining:guest.enemies.length}));
 expect(guest.enemies).toHaveLength(1946);expect(guest.enemies.reduce((sum,e)=>sum+e.hp,0)).toBe(hp);expect(compactBytes).toBeLessThan(fullBytes*.6);expect(elapsed).toBeLessThan(100);
},60000);
