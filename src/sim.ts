import {ACTIVES,BUFFS,DMG_SCALE,ENEMIES,HP_SCALE,KEYS,MORTAR_TARGET_CAP,NORMAL,PARTY_RULES,REPAIR_COST,REPAIR_SPEED,REVIVE_COST,SIZE,TOWERS,UPGRADE,WAVE_BATCHES,WAVES,XP,isActive,type ActiveKind,type BuffKind,type EnemyKind,type RewardKind,type TowerKind} from './data';
import {cell,center,distance,flow,random,WorldMap,type Point} from './map';
export interface Gear{id:number;kind:ActiveKind;ready:number;until:number}
export interface Building extends Point{id:number;owner:number;kind:TowerKind;level:number;hp:number;maxHp:number;progress:number;armor:number;attack:number;range:number;interval:number;skillInterval:number;shot:number;skill:number;aim:number;wind:number;skillAim:number;skillWind:number;shield:number;shieldUntil:number;shieldSource:number;damage:number}
export interface Enemy extends Point{id:number;kind:EnemyKind;wave:number;hp:number;maxHp:number;attack:number;target:number;next:number;wind:number;skillAt:number;sequence:number;slow:number;slowUntil:number;slows?:{factor:number;until:number}[];stunUntil:number;stunImmune:number;taunt:number;tauntUntil:number;tauntImmune:number;tauntSource:number;decision:number;flash:number}
export interface Packet{damage:number;pierce:number;hunter:number;boss:number;overflow:number;source:number;crit:boolean}
export interface Projectile extends Point{id:number;kind:'arrow'|'ice'|'mortar'|'enemy';target:number;tx:number;ty:number;sx:number;sy:number;age:number;life:number;speed:number;packet:Packet;radius:number;stun:number;maxTargets:number}
export interface Zone extends Point{id:number;kind:'foam'|'smash'|'rain'|'charge';radius:number;start:number;until:number;next:number;source:number;owner:number;dx:number;dy:number;travel:number;fired:boolean}
export interface Drop extends Point{id:number;kind:RewardKind;gear?:Gear}
export interface Visual extends Point{kind:string;color:number;size:number;age:number;life:number;text?:string;tx?:number;ty?:number}
export interface Batch{time:number;wave:number;kinds:EnemyKind[];point?:Point;done:boolean;retry:number}
export interface NetworkState{time:number;state:'menu'|'playing'|'won'|'lost';paused:boolean;wave:number;playerCount:1|2|3;waveInterval:number;gold:number;players:Worker[];buildings:Building[];enemies:Enemy[];projectiles:Projectile[];zones:Zone[];drops:Drop[];visuals:Visual[];gear:(Gear|null)[];buffs:Partial<Record<BuffKind,number>>;shared:Partial<Record<ActiveKind,number>>;batches:Batch[];messages:{text:string;until:number;type:string}[];swap:number|null;serial:number;stats:Simulation['stats'];god:boolean;practice:boolean}
type Task={type:'build'|'repair';id:number}|null;
export interface Worker extends Point{id:number;hp:number;maxHp:number;level:number;xp:number;gold:number;hurtUntil:number;input:Point;task:Task;selected:TowerKind;color:number}
export class Simulation{
 map=new WorldMap(); rand=random(7819); time=-10;state:'menu'|'playing'|'won'|'lost'='menu'; paused=false; wave=0;gold=120;
 players:Worker[];player:Worker;focusPlayer=0;playerCount:1|2|3;waveInterval:number;
 buildings:Building[]=[];enemies:Enemy[]=[];projectiles:Projectile[]=[];zones:Zone[]=[];drops:Drop[]=[];visuals:Visual[]=[];
 gear:(Gear|null)[]=[null,null];buffs:Partial<Record<BuffKind,number>>={};shared:Partial<Record<ActiveKind,number>>={};
 batches:Batch[]=[];rewardPool:RewardKind[]=[...Object.keys(ACTIVES),...Object.keys(BUFFS)] as RewardKind[];pendingDrops:{kind:RewardKind;point:Point}[]=[];
 messages:{text:string;until:number;type:string}[]=[];swap:number|null=null;serial=1;
 stats={kills:0,built:0,lost:0,repaired:0,income:0,spent:0,actives:0,damage:{arrow:0,wall:0,mortar:0,frost:0,taunt:0} as Record<TowerKind,number>};
 blocked=new Set<number>();towerCells=new Map<number,Building>();fields=new Map<number,Float32Array>();fieldAt=-100;fieldCell='';dirty=true;
 buckets=new Map<number,Enemy[]>();god=false;practice=false;soundEvents:string[]=[];
 networkTracks:{entity:Point;x:number;y:number}[]=[];networkBlend=0;lastNetworkTime:number|undefined;
 constructor(count:1|2|3=1){this.playerCount=count;this.waveInterval=PARTY_RULES[count].interval;const mid=SIZE/2,starts=[[mid+.5,mid+.5],[mid-.5,mid+1.5],[mid+.5,mid+2.5]],colors=[0xf0c563,0x75c8d0,0xd29be8];this.players=starts.slice(0,count).map(([x,y],i)=>({id:i?-(i+1):0,x,y,hp:100,maxHp:100,level:1,xp:0,gold:120,hurtUntil:0,input:{x:0,y:0},task:null,selected:'arrow',color:colors[i]}));this.player=this.players[0];this.makeBatches();}
 get selected(){return this.player.selected;}set selected(v:TowerKind){this.player.selected=v;}
 get task(){return this.player.task;}set task(v:Task){this.player.task=v;}
 get input(){return this.player.input;}set input(v:Point){this.player.input=v;}
 get focused(){return this.players[this.focusPlayer]??this.player;}
 get nextWaveAt(){if(this.time<0)return 0;return this.batches.filter(b=>b.wave>this.wave).reduce((n,b)=>Math.min(n,b.time),Infinity);}
 alivePlayers(){return this.players.filter(p=>p.hp>0||this.god);}
 playerForTarget(id:number){return id===0?this.players[0]:id<=-2?this.players[-id-1]:undefined;}
 isPlayerTarget(id:number){return !!this.playerForTarget(id);}
 nearestPlayer(p:Point,attackable=false){return this.alivePlayers().filter(w=>!attackable||!this.invincible).sort((a,b)=>distance(a,p)-distance(b,p))[0];}
 nearPlayer(p:Point,r:number){return this.alivePlayers().some(w=>distance(w,p)<=r);}
 get speed(){return 3.2*(1+.02*(this.player.level-1))*(this.active('boots')?1.6:1);}
 get buildRate(){return (1+.05*(this.player.level-1))*(this.active('build')?2:1);}
 get repairRate(){return REPAIR_SPEED*(1+.05*(this.player.level-1))*(this.active('repair')?2:1);}
 underAttack(worker:Worker|number=this.focused){const p=typeof worker==='number'?this.players[worker]:worker;if(!p||p.hp<=0)return false;return this.enemies.some(e=>e.hp>0&&e.target===p.id&&this.canHit(e,p,p.id))||this.projectiles.some(v=>v.kind==='enemy'&&v.target===p.id);}
 repairRateFor(worker:Worker|number=this.focused){return this.repairRate*(this.underAttack(worker)?.5:1);}
 get invincible(){return this.active('invincible');}
 active(kind:ActiveKind){return this.gear.some(g=>g?.kind===kind&&g.until>this.time);}
 b(kind:BuffKind){return this.buffs[kind]||0;}
 atPlayer(worker:Worker|number=this.focused){const p=typeof worker==='number'?this.players[worker]:worker;return p&&this.buildings.find(t=>cell(t)===cell(p));}
 reviveTarget(worker:Worker|number=this.focused){const p=typeof worker==='number'?this.players[worker]:worker;return p&&this.players.filter(w=>w!==p&&w.hp<=0&&distance(w,p)<=.9).sort((a,b)=>distance(a,p)-distance(b,p))[0];}
 message(text:string,type='info'){this.messages.push({text,type,until:this.time+3.5});if(this.messages.length>4)this.messages.shift();}
 fx(kind:string,p:Point,color=0xeec274,size=1,life=.5,text?:string){this.visuals.push({...p,kind,color,size,life,age:0,text});}
 start(){this.state='playing';this.message('敌军将在10秒后抵达。全队共享建造点。');}
 workerSpawn(){const origin=this.partyCenter(),valid=(p:Point)=>this.map.canStand(p.x,p.y,.25)&&this.players.every(w=>distance(w,p)>.65)&&this.enemies.every(e=>distance(e,p)>ENEMIES[e.kind].r+.5);for(let ring=1;ring<12;ring++)for(let i=0;i<ring*8;i++){const a=i/(ring*8)*Math.PI*2,p=center(cell({x:origin.x+Math.cos(a)*ring,y:origin.y+Math.sin(a)*ring}));if(valid(p))return p;}return center(cell(origin));}
 joinPlayer(){if(this.state!=='playing'||this.playerCount>=3)return false;const oldCount=this.playerCount,oldInterval=this.waveInterval,next=(oldCount+1) as 2|3,spawn=this.workerSpawn(),colors=[0xf0c563,0x75c8d0,0xd29be8],p:Worker={id:-(next),...spawn,hp:100,maxHp:100,level:this.player.level,xp:this.player.xp,gold:this.gold,hurtUntil:0,input:{x:0,y:0},task:null,selected:'arrow',color:colors[next-1]};this.players.push(p);this.playerCount=next;this.waveInterval=PARTY_RULES[next].interval;const ratio=this.waveInterval/oldInterval,current=this.wave;
  if(current===0){for(let wave=1;wave<=20;wave++){this.batches.filter(b=>b.wave===wave).sort((a,b)=>a.time-b.time).forEach((b,i)=>{b.time=(wave-1)*this.waveInterval+i*WAVE_BATCHES.gap;b.point=undefined;b.retry=-100;});}}
  else for(const b of this.batches)if(!b.done&&b.wave>current){b.time=this.time+Math.max(2,b.time-this.time)*ratio;b.point=undefined;b.retry=-100;}
  for(let wave=Math.max(1,current+1);wave<=20;wave++){const rows=this.waveBatches(wave,next),future=this.batches.filter(b=>!b.done&&b.wave===wave).sort((a,b)=>a.time-b.time);for(let i=0;i<Math.min(rows.length,future.length);i++)future[i].kinds=rows[i];}
  if(current>0){const oldScale=PARTY_RULES[oldCount].count,newScale=PARTY_RULES[next].count,kinds:EnemyKind[]=[];WAVES[current-1].forEach((n,k)=>{const add=Math.max(0,Math.round(n*newScale)-Math.round(n*oldScale));for(let i=0;i<add;i++)kinds.push(NORMAL[k]);});if(kinds.length)this.batches.push({time:this.time+2,wave:current,kinds,done:false,retry:-100});}
  this.focusPlayer=next-1;this.dirty=true;this.message(current>0?`P${next}加入 · 波次改为${this.waveInterval}秒，当前波增援即将抵达`:`P${next}加入 · 波次改为${this.waveInterval}秒，敌军数量已提高`,'wave');this.fx('ring',p,p.color,2,1);return true;
 }
 addBuilding(kind:TowerKind,x:number,y:number,complete=false,owner=0){const d=TOWERS[kind];const t:Building={id:this.serial++,owner,kind,x,y,level:1,hp:d.hp*(complete?1:.3),maxHp:d.hp*(complete?1:.3),progress:complete?1:0,armor:complete?d.armor:0,attack:d.attack,range:d.range,interval:d.interval,skillInterval:d.skill,shot:1,skill:0,aim:0,wind:0,skillAim:0,skillWind:0,shield:0,shieldUntil:0,shieldSource:0,damage:0};this.buildings.push(t);this.reindex();return t;}
 reindex(){this.blocked=new Set(this.buildings.filter(t=>t.hp>0).map(cell));this.towerCells=new Map(this.buildings.filter(t=>t.hp>0).map(t=>[cell(t),t]));this.dirty=true;}
 command(action:'context'|'build'|'repair'|'upgrade'|'pickup'|'cancel'|'active0'|'active1',playerIndex=this.focusPlayer){
  if(this.state!=='playing'||this.paused)return;
  const p=this.players[playerIndex];if(!p||p.hp<=0)return;this.focusPlayer=playerIndex;
  if(action==='cancel'){p.task=null;this.swap=null;return;}
  if(action==='active0'||action==='active1'){this.use(action==='active0'?0:1,playerIndex);return;}
  if(action==='pickup'){this.pickup(playerIndex);return;}
  if(action==='context'){const fallen=this.reviveTarget(p);if(fallen){if(this.gold<REVIVE_COST){this.message(`复活需要${REVIVE_COST}建造点`,'bad');return;}this.spend(REVIVE_COST);fallen.hp=fallen.maxHp*.5;fallen.hurtUntil=this.time+1;fallen.input={x:0,y:0};fallen.task=null;this.fx('ring',fallen,fallen.color,2,1);this.soundEvents.push('level');this.message(`P${playerIndex+1}复活了P${this.players.indexOf(fallen)+1}`);return;}const here=this.atPlayer(p);if(!here){this.command('build',playerIndex);return;}if(here.progress<1){this.command('build',playerIndex);return;}if(here.hp<here.maxHp-.01){this.command('repair',playerIndex);return;}this.message('脚下建筑无需修理');return;}
  const t=this.atPlayer(p);
  if(action==='build'){
   if(t){if(t.progress<1){p.task={type:'build',id:t.id};this.message(`P${playerIndex+1}继续施工，已保留之前的进度`);}else this.message('这里已有建筑：修复或升级');return;}
   const point=center(cell(p)),d=TOWERS[p.selected];
   if(this.map.terrain(point.x,point.y)){this.message('石头、河流和泥泞地上无法施工','bad');return;}
   if(this.player.level<d.unlock){this.message(`达到${d.unlock}级解锁${d.name}`,'bad');return;}
   if(this.gold<d.cost){this.message('建造点不足','bad');return;}
   if(this.enemies.some(e=>e.hp>0&&!ENEMIES[e.kind].air&&this.circleHitsBuilding(e,ENEMIES[e.kind].r,point))){this.message('敌人占据了这块地面','bad');return;}
   this.spend(d.cost);const newT=this.addBuilding(p.selected,point.x,point.y,false,p.id);p.task={type:'build',id:newT.id};this.soundEvents.push('build');
  }
  if(action==='repair'){
   if(!t||t.progress<1){this.message('站到已完成建筑上才能修复','bad');return;}
   if(t.hp>=t.maxHp-.01){this.message('建筑生命已满');return;}p.task={type:'repair',id:t.id};
  }
  if(action==='upgrade'){
   if(!t||t.progress<1){this.message('站到已完成建筑上才能升级','bad');return;}
   if(t.level>=4){this.message('已达到最高等级');return;}
   const need=[0,4,8,11][t.level];if(this.player.level<need){this.message(`角色${need}级解锁下一级建筑`,'bad');return;}
   const fee=Math.ceil(TOWERS[t.kind].cost*UPGRADE[t.level]);if(this.gold<fee){this.message('升级建造点不足','bad');return;}
   this.spend(fee);t.level++;this.attributes(t);this.fx('ring',t,0xf6d983,1.4,.6);this.soundEvents.push('upgrade');this.message(`${TOWERS[t.kind].name}升至${t.level}级`);
  }
 }
 setGold(n:number){this.gold=Math.max(0,n);for(const p of this.players)p.gold=this.gold;}
 spend(n:number){this.setGold(this.gold-n);this.stats.spent+=n;}
 attributes(t:Building){if(t.progress<1)return;const d=TOWERS[t.kind],near=this.nearPlayer(t,5);
  const hp=d.hp*HP_SCALE[t.level-1]*(1+(near?.25*this.b('life'):0));t.hp=t.hp/t.maxHp*hp;t.maxHp=hp;
  t.armor=d.armor+5*(t.level-1)+(near?15*this.b('armor'):0);t.attack=d.attack*DMG_SCALE[t.level-1]*(1+(near?.25*this.b('power'):0));
  t.range=d.range+(near&&d.attack?this.b('range'):0);t.interval=d.interval/(1+(near?.2*this.b('haste')+(this.active('overload')?.6:0):0));t.skillInterval=d.skill*(1-(near?Math.min(.5,.15*this.b('resonance')):0));
 }
 use(slot:number,playerIndex=this.focusPlayer){const p=this.players[playerIndex]??this.player,g=this.gear[slot];if(!g){this.message('击败BOSS，拾取主动装备');return;}
  const d=ACTIVES[g.kind];if(Math.max(g.ready,this.shared[g.kind]||-100)>this.time){this.message('装备尚在冷却');return;}
  const here=this.atPlayer(p),near=this.buildings.filter(t=>distance(t,p)<=4);
  if(g.kind==='shield'&&!near.length){this.message('4格内没有可保护的建筑','bad');return;}
  if(g.kind==='alarm'&&(!here||here.progress<1||!this.enemies.some(e=>distance(e,here)<=4&&e.tauntImmune<=this.time))){this.message('站在完工建筑上，且4格内需要有敌人','bad');return;}
  if(g.kind==='instant'){
   if(!here||here.progress<1||here.hp>=here.maxHp-.001){this.message('需要脚下有受损的完工建筑','bad');return;}
   const heal=Math.min(here.maxHp*.35,here.maxHp-here.hp),fee=heal/here.maxHp*TOWERS[here.kind].cost*REPAIR_COST;
   if(this.gold<fee){this.message(`修复需要${fee.toFixed(1)}建造点`,'bad');return;}
   this.spend(fee);here.hp+=heal;this.stats.repaired+=heal;this.fx('ring',here,0x9cdfb9,1.5);
  }
  g.ready=this.time+d.cd;g.until=this.time+d.duration;this.shared[g.kind]=g.ready;this.stats.actives++;this.soundEvents.push('active');
  if(g.kind==='shield')for(const t of near){t.shield=Math.max(t.shield,t.maxHp*.3);t.shieldUntil=g.until;t.shieldSource=g.id;}
  if(g.kind==='alarm'&&here)this.taunt(here,4,3,g.id);
  if(g.kind==='foam')this.zones.push({...p,id:this.serial++,kind:'foam',radius:3,start:this.time,until:g.until,next:0,source:g.id,owner:p.id,dx:0,dy:0,travel:0,fired:true});
  if(g.kind==='invincible'){for(const e of this.enemies){if(this.isPlayerTarget(e.target)){e.wind=0;e.target=-1;}e.decision=0;}for(const z of this.zones)if(z.kind!=='foam'&&!z.fired)z.until=this.time;}
  this.fx('ring',p,0xf1d389,2,.6);this.message(`P${playerIndex+1} ${d.name} · 已启动`);
 }
 removeGear(g:Gear){g.until=-100;this.zones=this.zones.filter(z=>z.source!==g.id);for(const t of this.buildings)if(t.shieldSource===g.id)t.shield=0;for(const e of this.enemies)if(e.tauntSource===g.id){e.tauntUntil=this.time;e.decision=0;}}
 pickup(playerIndex=this.focusPlayer){const p=this.players[playerIndex]??this.player,drop=this.drops.find(d=>cell(d)===cell(p));if(!drop){this.message('站到地面道具所在格拾取');return;}
  if(!isActive(drop.kind)){const k=drop.kind as BuffKind;this.buffs[k]=(this.buffs[k]||0)+1;this.drops=this.drops.filter(d=>d.id!==drop.id);this.message(`获得 ${BUFFS[k].name} · 持续整局`);this.soundEvents.push('reward');return;}
  const slot=this.gear.findIndex(g=>!g);if(slot<0){this.swap=drop.id;this.focusPlayer=playerIndex;return;}this.exchange(slot,drop.id,playerIndex);
 }
 exchange(slot:number,id=this.swap,playerIndex=this.focusPlayer){if(this.paused||this.state!=='playing'||id===null)return;const p=this.players[playerIndex]??this.player,d=this.drops.find(d=>d.id===id);if(!d||!isActive(d.kind)||cell(d)!==cell(p)){this.swap=null;return;}
  const old=this.gear[slot];this.drops=this.drops.filter(v=>v.id!==d.id);this.gear[slot]=d.gear||{id:this.serial++,kind:d.kind,ready:-100,until:-100};
  if(old){this.removeGear(old);this.drops.push({id:this.serial++,kind:old.kind,gear:old,...center(cell(p))});}
  this.swap=null;this.message(`携带 ${ACTIVES[d.kind].name}`);this.soundEvents.push('reward');
 }
 drop(kind:RewardKind,p:Point){const taken=new Set(this.drops.map(cell));let best:Point|undefined;
  for(let ring=0;ring<SIZE&&!best;ring++)for(let dy=-ring;dy<=ring&&!best;dy++)for(let dx=-ring;dx<=ring&&!best;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==ring)continue;const c={x:Math.floor(p.x)+dx+.5,y:Math.floor(p.y)+dy+.5};if(!this.map.terrain(c.x,c.y)&&!taken.has(cell(c)))best=c;}
  if(!best){this.pendingDrops.push({kind,point:p});return;}
  this.drops.push({id:this.serial++,kind,...best,gear:isActive(kind)?{id:this.serial++,kind,ready:-100,until:-100}:undefined});this.fx('ring',best,0xefca7d,2,1);
 }
 partyCenter(){const list=this.alivePlayers();return{x:list.reduce((n,p)=>n+p.x,0)/Math.max(1,list.length),y:list.reduce((n,p)=>n+p.y,0)/Math.max(1,list.length)};}
 waveBatches(wave:number,count=this.playerCount){const row=WAVES[wave-1],batches=wave<=5?WAVE_BATCHES.early:WAVE_BATCHES.late,scale=PARTY_RULES[count].count,scaled=row.map(n=>n?Math.max(1,Math.round(n*scale)):0),result:EnemyKind[][]=[];for(let batch=0;batch<batches;batch++){const kinds:EnemyKind[]=[];scaled.forEach((n,k)=>{const qty=Math.floor(n/batches)+(batch>=batches-n%batches?1:0);for(let j=0;j<qty;j++)kinds.push(NORMAL[k]);});if(wave%5===0&&batch===batches-1)kinds.push(('boss'+(wave/5)) as EnemyKind);result.push(kinds);}return result;}
 makeBatches(){this.batches=[];WAVES.forEach((_row,i)=>{const wave=i+1;this.waveBatches(wave).forEach((kinds,batch)=>this.batches.push({time:i*this.waveInterval+batch*WAVE_BATCHES.gap,wave,kinds,done:false,retry:-100}));});}
 spawnPoint(wave:number,batch:number){const origin=this.partyCenter();for(let k=0;k<180;k++){const side=(wave+batch)%4,angle=(side*Math.PI/2)+(this.rand()-.5)*1.3+(k>70?this.rand()*Math.PI*2:0),radius=10+this.rand()*3;const p=center(cell({x:Math.max(2,Math.min(SIZE-3,origin.x+Math.cos(angle)*radius)),y:Math.max(2,Math.min(SIZE-3,origin.y+Math.sin(angle)*radius))}));if(this.alivePlayers().every(w=>distance(p,w)>=8)&&this.map.canStand(p.x,p.y,.65,this.blocked))return p;}return undefined;}
 spawn(kind:EnemyKind,p:Point,wave=this.wave){const d=ENEMIES[kind],scale=d.boss?1:1+.065*(wave-1);if(!this.enemies.length)this.buckets.clear();const point=this.enemySpawnPoint(p,d.r,!!d.air),initial=this.nearestPlayer(point,true);const e:Enemy={...point,id:this.serial++,kind,wave,hp:d.hp*scale,maxHp:d.hp*scale,attack:d.attack*(d.boss?1:1+.025*(wave-1)),target:initial?.id??-1,next:this.time,wind:0,skillAt:this.time+(kind==='boss2'?5:4),sequence:0,slow:1,slowUntil:0,stunUntil:0,stunImmune:0,taunt:0,tauntUntil:0,tauntImmune:0,tauntSource:0,decision:0,flash:0};this.enemies.push(e);this.addBucket(e);if(d.boss){this.message(`${d.name} 已进入战场`,'boss');this.soundEvents.push('boss');}return e;}
 tick(dt:number){if(this.state!=='playing'||this.paused)return;
  this.time+=dt;this.messages=this.messages.filter(m=>m.until>this.time);this.visuals=this.visuals.filter(v=>(v.age+=dt)<v.life);
  this.updatePlayers(dt);for(const t of this.buildings)this.attributes(t);
  const wave=this.time<0?0:this.batches.length?this.batches.reduce((n,b)=>this.time>=b.time?Math.max(n,b.wave):n,0):this.wave;if(wave!==this.wave){this.wave=wave;this.message(`第 ${wave} / 20 波 · ${this.playerCount}人工地压力`,'wave');this.soundEvents.push('wave');}
  for(let i=0;i<this.batches.length;i++){const b=this.batches[i];if(b.done||this.time<b.time-2||this.time<b.retry)continue;
   if(!b.point)b.point=this.spawnPoint(b.wave,i);if(this.time<b.time)continue;
   if(!b.point||this.alivePlayers().some(w=>distance(b.point!,w)<6)||!this.map.canStand(b.point.x,b.point.y,.65,this.blocked)){b.point=this.spawnPoint(b.wave,i);b.retry=this.time+2;continue;}
   let complete=true;for(let enemyIndex=0;enemyIndex<b.kinds.length;enemyIndex++){const kind=b.kinds[enemyIndex];let p=b.point;const d=ENEMIES[kind];for(let tries=0;tries<10;tries++){const pp={x:b.point.x+(this.rand()-.5)*2,y:b.point.y+(this.rand()-.5)*2};if((d.air?this.map.canFly(pp.x,pp.y,d.r):this.map.canStand(pp.x,pp.y,d.r,this.blocked))&&this.alivePlayers().every(w=>distance(pp,w)>=6)){p=pp;break;}}try{this.spawn(kind,p,b.wave);}catch{b.kinds=b.kinds.slice(enemyIndex);b.point=undefined;b.retry=this.time+2;complete=false;break;}}if(complete)b.done=true;
  }
  if(this.pendingDrops.length){const pending=this.pendingDrops.splice(0);for(const d of pending)this.drop(d.kind,d.point);}
  this.rebuildBuckets();this.updateFields();this.updateTowers(dt);this.updateEnemies(dt);this.updateZones(dt);this.resolveEnemyCollisions();this.updateProjectiles(dt);this.cleanDead();
  if(this.alivePlayers().length===0&&!this.god){this.state='lost';for(const p of this.players)p.task=null;this.soundEvents.push('lost');return;}
  this.updateTasks(dt);
  if(this.batches.every(b=>b.done)&&this.enemies.length===0&&this.wave===20){this.state='won';for(const p of this.players)p.task=null;this.soundEvents.push('won');}
 }
 networkState(compact=false):NetworkState{
  const enemies=compact?this.enemies.map(({id,kind,x,y,hp,maxHp,target,wind,slowUntil,stunUntil,tauntUntil,flash})=>({id,kind,x,y,hp,maxHp,target,wind,slowUntil,stunUntil,tauntUntil,flash} as Enemy)):this.enemies;
  const projectiles=compact?this.projectiles.map(({id,kind,x,y,target,tx,ty,age,life})=>({id,kind,x,y,target,tx,ty,age,life} as Projectile)):this.projectiles;
  return{time:this.time,state:this.state,paused:this.paused,wave:this.wave,playerCount:this.playerCount,waveInterval:this.waveInterval,gold:this.gold,players:this.players,buildings:this.buildings,enemies,projectiles,zones:this.zones,drops:this.drops,visuals:this.visuals,gear:this.gear,buffs:this.buffs,shared:this.shared,batches:compact?this.batches.map(b=>({...b,kinds:[]})):this.batches,messages:this.messages,swap:this.swap,serial:this.serial,stats:this.stats,god:this.god,practice:this.practice};
 }
 applyNetworkState(state:NetworkState,localSlot=0,lightweight=false){this.time=state.time;this.state=state.state;this.paused=state.paused;this.wave=state.wave;this.playerCount=state.playerCount;this.waveInterval=state.waveInterval;this.players=state.players;this.player=this.players[0];this.setGold(state.gold??this.player.gold);this.buildings=state.buildings;this.enemies=state.enemies;this.projectiles=state.projectiles;this.zones=state.zones;this.drops=state.drops;this.visuals=state.visuals;this.gear=state.gear;this.buffs=state.buffs;this.shared=state.shared;this.batches=state.batches;this.messages=state.messages;this.swap=state.swap;this.serial=state.serial;this.stats=state.stats;this.god=state.god;this.practice=state.practice;this.focusPlayer=Math.min(localSlot,this.players.length-1);this.pendingDrops=[];this.soundEvents=[];this.reindex();if(lightweight)this.buckets.clear();else this.rebuildBuckets();this.fields.clear();this.fieldAt=-100;this.networkTracks=[];}
 reconcileNetworkState(state:NetworkState,localSlot=0){
  const shown=new Map<string,Point>(),remember=(name:string,list:(Point&{id:number})[])=>{for(const item of list)shown.set(name+item.id,{x:item.x,y:item.y});};remember('p',this.players);remember('e',this.enemies);remember('r',this.projectiles);remember('z',this.zones);
  const predicted=this.players[localSlot],position=predicted&&{x:predicted.x,y:predicted.y,input:{...predicted.input},selected:predicted.selected},authoritative=state.players[localSlot],error=position&&authoritative?Math.hypot(position.x-authoritative.x,position.y-authoritative.y):0,previousTime=this.lastNetworkTime;
  this.applyNetworkState(state,localSlot,true);this.lastNetworkTime=state.time;this.networkBlend=Math.max(.08,Math.min(.5,previousTime===undefined?.1:state.time-previousTime));
  const track=(name:string,list:(Point&{id:number})[],skip=-1)=>{for(let i=0;i<list.length;i++){const item=list[i],old=shown.get(name+item.id),tx=item.x,ty=item.y;if(i!==skip&&old&&distance(old,item)<6){item.x=old.x;item.y=old.y;this.networkTracks.push({entity:item,x:tx,y:ty});}}};track('p',this.players,localSlot);track('e',this.enemies);track('r',this.projectiles);track('z',this.zones);
  const local=this.players[localSlot];if(local&&position&&error<=1.25){local.x=position.x+(local.x-position.x)*.35;local.y=position.y+(local.y-position.y)*.35;local.input=position.input;local.selected=position.selected;}
  return error;
 }
 predictNetwork(dt:number,localSlot=0){
  if(this.state!=='playing'||this.paused)return;this.time+=dt;
  const p=this.players[localSlot];if(p&&p.hp>0){let{x,y}=p.input;const len=Math.hypot(x,y);if(len){x/=Math.max(1,len);y/=Math.max(1,len);const before={x:p.x,y:p.y},terrainSpeed=this.map.moveFactor(p.x,p.y);this.move(p,x*this.speed*terrainSpeed*dt,y*this.speed*terrainSpeed*dt,.25,false);if(distance(before,p)>.0001){p.task=null;if(this.swap!==null&&this.drops.find(d=>d.id===this.swap)&&cell(this.drops.find(d=>d.id===this.swap)!)!==cell(p))this.swap=null;}}}
  if(this.networkBlend>0){const alpha=this.networkBlend<=dt?1:dt/this.networkBlend;for(const item of this.networkTracks){item.entity.x+=(item.x-item.entity.x)*alpha;item.entity.y+=(item.y-item.entity.y)*alpha;}this.networkBlend=Math.max(0,this.networkBlend-dt);if(!this.networkBlend)this.networkTracks=[];}
  this.visuals=this.visuals.filter(v=>(v.age+=dt)<v.life);this.messages=this.messages.filter(m=>m.until>this.time);
 }
 updatePlayers(dt:number){for(const p of this.players){if(p.hp<=0)continue;let {x,y}=p.input;const len=Math.hypot(x,y);if(!len)continue;x/=Math.max(1,len);y/=Math.max(1,len);const before={x:p.x,y:p.y},terrainSpeed=this.map.moveFactor(p.x,p.y);this.move(p,x*this.speed*terrainSpeed*dt,y*this.speed*terrainSpeed*dt,.25,false);
   if(distance(before,p)>.0001){p.task=null;if(this.swap!==null&&this.focused===p&&this.drops.find(d=>d.id===this.swap)&&cell(this.drops.find(d=>d.id===this.swap)!)!==cell(p))this.swap=null;}}
 }
 move(p:Point,dx:number,dy:number,r:number,enemy:boolean){const e=enemy?p as Enemy:undefined,air=!!e&&!!ENEMIES[e.kind].air,oldBucket=e?this.bucketKey(e):0,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/.18));for(let i=0;i<steps;i++){
  const nx=p.x+dx/steps;if((air?this.map.canFly(nx,p.y,r):this.map.canStand(nx,p.y,r))&&(!e||air||!this.buildingAtPosition({x:nx,y:p.y},r))){p.x=nx;}
  const ny=p.y+dy/steps;if((air?this.map.canFly(p.x,ny,r):this.map.canStand(p.x,ny,r))&&(!e||air||!this.buildingAtPosition({x:p.x,y:ny},r))){p.y=ny;}
 }if(e)this.relocateBucket(e,oldBucket);}
 updateTasks(dt:number){for(const p of this.players){if(!p.task||p.hp<=0)continue;const task=p.task,t=this.buildings.find(t=>t.id===task.id);if(!t||cell(t)!==cell(p)){p.task=null;continue;}
  const d=TOWERS[t.kind];if(task.type==='build'){t.progress=Math.min(1,t.progress+dt*this.buildRate/d.work);if(t.progress>=1){const ratio=t.hp/t.maxHp;t.maxHp=d.hp;t.hp=ratio*d.hp;this.attributes(t);for(const w of this.players)if(w.task?.id===t.id)w.task=null;this.stats.built++;this.fx('ring',t,d.color,1.5,.6);this.message(d.name+' 建造完成');this.soundEvents.push('complete');}}
  else{let heal=Math.min(t.maxHp-t.hp,t.maxHp*this.repairRateFor(p)/d.work*dt);if(heal<.0001){p.task=null;continue;}const fee=heal/t.maxHp*d.cost*REPAIR_COST;if(this.gold+1e-8<fee){p.task=null;this.message('队伍建造点不足，修复暂停','bad');continue;}this.spend(fee);t.hp+=heal;this.stats.repaired+=heal;if(t.hp>=t.maxHp-.0001)for(const w of this.players)if(w.task?.id===t.id)w.task=null;}
  }
 }
 bucketKey(p:Point){return Math.floor(p.x/3)+Math.floor(p.y/3)*24;}
 addBucket(e:Enemy){const id=this.bucketKey(e),arr=this.buckets.get(id)||[];if(!arr.includes(e))arr.push(e);this.buckets.set(id,arr);}
 relocateBucket(e:Enemy,old:number){const next=this.bucketKey(e);if(next===old)return;const arr=this.buckets.get(old);if(arr){const i=arr.indexOf(e);if(i>=0)arr.splice(i,1);}this.addBucket(e);}
 rebuildBuckets(){this.buckets.clear();for(const e of this.enemies)if(e.hp>0)this.addBucket(e);}
 circleHitsBuilding(p:Point,r:number,t:Point){const dx=Math.max(0,Math.abs(p.x-t.x)-.5),dy=Math.max(0,Math.abs(p.y-t.y)-.5);return Math.hypot(dx,dy)<r-1e-4;}
 buildingAtPosition(p:Point,r:number){for(let y=Math.floor(p.y-r-.5);y<=Math.floor(p.y+r+.5);y++)for(let x=Math.floor(p.x-r-.5);x<=Math.floor(p.x+r+.5);x++){const t=this.towerCells.get(y*SIZE+x);if(t&&t.hp>0&&this.circleHitsBuilding(p,r,t))return t;}return undefined;}
 enemyAtPosition(p:Point,r:number,ignore=0,air=false){const reach=r+.65;for(let y=Math.floor((p.y-reach)/3);y<=Math.floor((p.y+reach)/3);y++)for(let x=Math.floor((p.x-reach)/3);x<=Math.floor((p.x+reach)/3);x++)for(const other of this.buckets.get(x+y*24)||[])if(other.id!==ignore&&other.hp>0&&!!ENEMIES[other.kind].air===air&&distance(p,other)<r+ENEMIES[other.kind].r-1e-4)return other;return undefined;}
 enemyPositionFree(p:Point,r:number,air=false,ignore=0){return (air||!this.buildingAtPosition(p,r))&&!this.enemyAtPosition(p,r,ignore,air);}
 enemySpawnPoint(origin:Point,r:number,air=false,ignore=0){const valid=(p:Point)=>(air?this.map.canFly(p.x,p.y,r):this.map.canStand(p.x,p.y,r))&&this.enemyPositionFree(p,r,air,ignore);if(valid(origin))return origin;
  const phase=this.serial*2.399963;for(let i=1;i<=900;i++){const radius=.35*Math.sqrt(i),angle=phase+i*2.399963,p={x:origin.x+Math.cos(angle)*radius,y:origin.y+Math.sin(angle)*radius};if(valid(p))return p;}
  for(let i=0;i<SIZE*SIZE;i++){const id=(i+this.serial*97)%(SIZE*SIZE),p=center(id);if(valid(p))return p;}throw new Error('No non-overlapping enemy spawn position');
 }
 resolveEnemyCollisions(){for(let pass=0;pass<5;pass++){this.rebuildBuckets();let overlaps=0;for(const e of this.enemies){if(e.hp<=0)continue;for(const other of [...this.nearby(e,1.35)]){if(other.id<=e.id||other.hp<=0||!!ENEMIES[e.kind].air!==!!ENEMIES[other.kind].air)continue;const minimum=ENEMIES[e.kind].r+ENEMIES[other.kind].r,gap=distance(e,other);if(gap>=minimum-1e-4)continue;overlaps++;
    const angle=gap>.0001?Math.atan2(other.y-e.y,other.x-e.x):(e.id+other.id)*2.399963,nx=Math.cos(angle),ny=Math.sin(angle),push=(minimum-gap+.001)/2;
    const a={x:e.x,y:e.y},b={x:other.x,y:other.y};this.move(e,-nx*push,-ny*push,ENEMIES[e.kind].r,true);this.move(other,nx*push,ny*push,ENEMIES[other.kind].r,true);
    const remaining=minimum-distance(e,other);if(remaining>1e-4){const firstMoved=distance(a,e),secondMoved=distance(b,other);if(firstMoved>=secondMoved)this.move(e,-nx*remaining,-ny*remaining,ENEMIES[e.kind].r,true);else this.move(other,nx*remaining,ny*remaining,ENEMIES[other.kind].r,true);}
   }}if(!overlaps)break;}this.rebuildBuckets();for(const e of this.enemies){const d=ENEMIES[e.kind],air=!!d.air;if(e.hp<=0||!this.enemyAtPosition(e,d.r,e.id,air))continue;const old=this.bucketKey(e),p=this.enemySpawnPoint(e,d.r,air,e.id);e.x=p.x;e.y=p.y;this.relocateBucket(e,old);}}
 nearby(p:Point,r:number){const list:Enemy[]=[];for(let y=Math.floor((p.y-r)/3);y<=Math.floor((p.y+r)/3);y++)for(let x=Math.floor((p.x-r)/3);x<=Math.floor((p.x+r)/3);x++)for(const e of this.buckets.get(x+y*24)||[])if(e.hp>0&&distance(e,p)<=r)list.push(e);return list;}
 updateFields(){const cells=this.alivePlayers().map(p=>cell(p)).join(',');if(!this.dirty&&this.fieldCell===cells&&this.time<this.fieldAt+.5)return;this.fieldCell=cells;this.fieldAt=this.time;this.dirty=false;this.fields.clear();for(const p of this.alivePlayers())this.fields.set(p.id,flow(this.map,p,this.blocked));
 }
 target(id:number):Point|undefined{return this.playerForTarget(id)??this.buildings.find(t=>t.id===id&&t.hp>0);}
 edgeDistance(e:Enemy,p:Point,id:number){if(this.isPlayerTarget(id))return Math.max(0,distance(e,p)-ENEMIES[e.kind].r-.25);const dx=Math.max(0,Math.abs(e.x-p.x)-.5),dy=Math.max(0,Math.abs(e.y-p.y)-.5);return Math.max(0,Math.hypot(dx,dy)-ENEMIES[e.kind].r);}
 canHit(e:Enemy,p:Point,id:number){const d=ENEMIES[e.kind];return (!this.isPlayerTarget(id)||(!this.invincible&&(p as Worker).hp>0))&&this.edgeDistance(e,p,id)<=d.range&&(d.air||this.map.los(e,p));}
  updateEnemies(dt:number){for(const e of this.enemies){if(e.hp<=0)continue;const d=ENEMIES[e.kind];
   if(e.slows){e.slows=e.slows.filter(v=>v.until>this.time);const strongest=e.slows.reduce<{factor:number;until:number}|null>((a,b)=>!a||b.factor<a.factor?b:a,null);e.slow=strongest?.factor??1;e.slowUntil=strongest?.until??0;}
   if(e.tauntUntil>0&&e.tauntUntil<=this.time){e.tauntUntil=0;e.taunt=0;e.tauntImmune=this.time+2;e.decision=0;}
   // Re-evaluate priority before attack windups, stuns and skill execution.
   const previous=e.target,taunt=this.buildings.find(t=>t.id===e.taunt&&t.hp>0);
   if(e.tauntUntil>this.time&&taunt)e.target=taunt.id;
    else {const hitPlayer=this.alivePlayers().filter(p=>this.canHit(e,p,p.id)).sort((a,b)=>distance(a,e)-distance(b,e))[0];if(hitPlayer)e.target=hitPlayer.id;
    else {
     const current=this.buildings.find(t=>t.id===previous&&t.hp>0&&this.canHit(e,t,t.id));
     const nearest=current??this.buildings.filter(t=>t.hp>0&&this.canHit(e,t,t.id)).sort((a,b)=>distance(a,e)-distance(b,e))[0];
     e.target=nearest?.id??(this.invincible?-1:(this.nearestPlayer(e,true)?.id??-1));
    }}
   if(previous!==e.target&&e.wind>0){e.wind=0;if(e.target!==-1){const nextTarget=this.target(e.target);if(nextTarget&&this.canHit(e,nextTarget,e.target)){e.wind=this.time+d.wind;e.next=Math.max(e.next,this.time+d.interval);}}}
   if(e.stunUntil>this.time)continue;
   const casting=this.zones.some(z=>z.owner===e.id&&z.until>this.time&&(!z.fired||z.kind==='charge'));if(casting)continue;
   if(d.boss&&this.time>=e.skillAt&&!this.invincible){if(this.bossSkill(e))continue;}
   if(e.wind>0){if(this.time>=e.wind){const target=this.target(e.target);if(target&&this.canHit(e,target,e.target)){if(e.kind==='archer'||e.kind==='boss2')this.enemyArrow(e,target);else this.damageTarget(e.target,e.attack);}e.wind=0;}continue;}
   if(e.target===-1)continue;const target=this.target(e.target);if(!target){e.decision=0;continue;}
   if(this.canHit(e,target,e.target)){if(this.time>=e.next){e.wind=this.time+d.wind;e.next=this.time+d.interval;}continue;}
   let dest:Point=target;
   if(!d.air){
     const playerTarget=this.isPlayerTarget(e.target),fieldKey=e.target+(d.r>.5?100000:0);let field=this.fields.get(fieldKey);if(!field){field=flow(this.map,target,this.blocked,playerTarget?undefined:new Map(this.buildings.map(t=>[cell(t),2+t.hp/15])),d.r);this.fields.set(fieldKey,field);}
    const ci=cell(e),cp=center(ci);let best=ci,value=field[ci],recovered=false;
     if(!Number.isFinite(value)&&playerTarget){const breakKey=-200000+e.target-(d.r>.5?100000:0);let breakField=this.fields.get(breakKey);if(!breakField){const costs=new Map(this.buildings.map(t=>[cell(t),2+t.hp/15]));breakField=flow(this.map,target,this.blocked,costs,d.r);this.fields.set(breakKey,breakField);}field=breakField;value=field[ci];}
    if(!Number.isFinite(value)){let nearest=Infinity,cx=ci%SIZE,cy=Math.floor(ci/SIZE);for(let oy=-4;oy<=4;oy++)for(let ox=-4;ox<=4;ox++){const x=cx+ox,y=cy+oy;if(x<0||y<0||x>=SIZE||y>=SIZE)continue;const id=y*SIZE+x;if(!Number.isFinite(field[id]))continue;const p=center(id),gap=distance(e,p);if(gap<nearest){nearest=gap;best=id;value=field[id];recovered=true;}}}
    if(!recovered)for(const id of [ci+1,ci-1,ci+SIZE,ci-SIZE])if(id>=0&&id<SIZE*SIZE&&(this.map.elevation[id]===this.map.elevation[ci]||this.map.ramps[id]||this.map.ramps[ci])&&field[id]<value){best=id;value=field[id];}
    dest=best===ci?target:center(best);const obstacle=this.towerCells.get(best);
    if(obstacle&&obstacle.id!==e.target){if(this.canHit(e,obstacle,obstacle.id)){e.target=obstacle.id;if(this.time>=e.next){e.wind=this.time+d.wind;e.next=this.time+d.interval;}continue;}}
     if(best===ci&&distance(e,cp)>.3&&!playerTarget)dest=cp;
   }
   let dx=dest.x-e.x,dy=dest.y-e.y,n=Math.hypot(dx,dy);if(n>.001){dx/=n;dy/=n;const slow=e.slowUntil>this.time?e.slow:1;let foam=1;for(const z of this.zones)if(z.kind==='foam'&&z.until>this.time&&distance(e,z)<=z.radius)foam=Math.min(foam,d.boss?.75:.5);
    const speed=d.speed*(e.kind==='boss4'&&e.hp/e.maxHp<.4?1.15:1)*Math.max(.4,Math.min(slow,foam))*(d.air?1:this.map.moveFactor(e.x,e.y));
    // Soft steering creates room before the hard circular colliders touch.
    let sx=0,sy=0;for(const other of this.nearby(e,1.35)){if(other.id===e.id||!!ENEMIES[other.kind].air!==!!d.air)continue;const gap=distance(e,other),wanted=d.r+ENEMIES[other.kind].r+.08;if(gap>0&&gap<wanted){sx+=(e.x-other.x)/gap*(wanted-gap);sy+=(e.y-other.y)/gap*(wanted-gap);}}
    const sep=Math.hypot(sx,sy);if(sep>.35){sx*=.35/sep;sy*=.35/sep;}
    const old={x:e.x,y:e.y};this.move(e,(dx*speed+sx)*dt,(dy*speed+sy)*dt,d.r,true);
    if(distance(old,e)<.00001){this.move(e,-dy*speed*dt,dx*speed*dt,d.r,true);}
   }
   if(!d.air&&!this.invincible)for(const p of this.alivePlayers()){const gap=distance(e,p),min=d.r+.25;if(gap<min&&gap>.0001){const old={x:p.x,y:p.y};this.move(p,(p.x-e.x)/gap*(min-gap)*.3,(p.y-e.y)/gap*(min-gap)*.3,.25,false);if(distance(old,p)>.001)p.task=null;}}
  }
 }
 bossSkill(e:Enemy){const k=e.kind==='boss1'?'smash':e.kind==='boss2'?'rain':e.kind==='boss3'?'charge':(['smash','rain','charge'] as const)[e.sequence%3];const range=k==='smash'?8:k==='rain'?10:6;
  const target=this.alivePlayers().filter(p=>distance(e,p)<=range&&(k!=='charge'||this.map.los(e,p))).sort((a,b)=>distance(e,a)-distance(e,b))[0];if(!target)return false;
  const wind=k==='smash'?1.2:k==='rain'?1.5:1,cycle=e.kind==='boss4'?(e.hp/e.maxHp<.4?5:6):(k==='smash'?8:k==='rain'?9:10);e.skillAt=this.time+cycle;e.sequence++;e.wind=0;
  const n=distance(e,target)||1;this.zones.push({id:this.serial++,kind:k,x:k==='charge'?e.x:target.x,y:k==='charge'?e.y:target.y,radius:2,start:this.time+wind,until:this.time+wind+(k==='smash'?.1:k==='rain'?3:.75),next:this.time+wind+1,source:target.id,owner:e.id,dx:(target.x-e.x)/n,dy:(target.y-e.y)/n,travel:0,fired:false});this.soundEvents.push('warning');return true;
 }
 updateZones(dt:number){for(const z of this.zones){if(z.until<=this.time&&!(z.kind==='rain'&&z.next<=z.until&&z.next<=this.time))continue;if(z.kind==='foam')continue;
   const owner=this.enemies.find(e=>e.id===z.owner&&e.hp>0);if(!z.fired&&!owner){z.until=this.time;continue;}
   if(this.time<z.start)continue;
   if(z.kind==='smash'&&!z.fired){z.fired=true;this.areaDamage(z,2,30,80);this.fx('blast',z,0xe98965,2,.5);}
   if(z.kind==='rain'){z.fired=true;if(this.time>=z.next&&z.next<=z.until+.001){this.areaDamage(z,2,8,12);this.fx('rain',z,0xe98965,2,.4);z.next+=1;}}
   if(z.kind==='charge'){if(!owner){z.until=this.time;continue;}z.fired=true;const travel=Math.min(8*dt,6-z.travel);const nx=owner.x+z.dx*travel,ny=owner.y+z.dy*travel;
    const hit=this.buildingAtPosition({x:nx,y:ny},ENEMIES[owner.kind].r);
    if(hit){this.damageBuilding(hit,100);z.until=this.time;this.fx('blast',hit,0xe98965,1.5);}
    else {const victim=!this.invincible&&this.alivePlayers().find(p=>distance(p,{x:nx,y:ny})<ENEMIES[owner.kind].r+.25);if(victim){this.damagePlayer(25,victim);this.move(victim,z.dx,z.dy,.25,false);victim.task=null;z.until=this.time;}
    else if(!this.map.canStand(nx,ny,ENEMIES[owner.kind].r)){z.until=this.time;}
    else{const before={x:owner.x,y:owner.y};this.move(owner,z.dx*travel,z.dy*travel,ENEMIES[owner.kind].r,true);const moved=distance(before,owner);z.travel+=moved;if(moved<travel*.5||z.travel>=6)z.until=this.time;}
    }
   }
  }this.zones=this.zones.filter(z=>z.until>this.time);}
 areaDamage(p:Point,r:number,player:number,building:number){for(const w of this.alivePlayers())if(distance(w,p)<=r)this.damagePlayer(player,w);for(const t of this.buildings)if(distance(t,p)<=r)this.damageBuilding(t,building);}
 damagePlayer(amount:number,worker=this.player){if(this.god||this.invincible||worker.hurtUntil>this.time||worker.hp<=0)return;worker.hp-=amount;worker.hurtUntil=this.time+.3;this.fx('number',worker,0xff968a,.8,.7,'−'+Math.round(amount));this.soundEvents.push('hurt');}
 damageBuilding(t:Building,amount:number){if(t.hp<=0)return;let hit=Math.max(1,amount*100/(100+t.armor));if(t.shieldUntil>this.time&&t.shield>0){const absorbed=Math.min(hit,t.shield);t.shield-=absorbed;hit-=absorbed;}t.hp-=hit;if(hit>0)this.fx('hit',t,0xffb18d,.5,.18);}
 damageTarget(id:number,amount:number){const worker=this.playerForTarget(id);if(worker)this.damagePlayer(amount,worker);else{const t=this.buildings.find(t=>t.id===id);if(t)this.damageBuilding(t,amount);}}
 taunt(t:Building,r:number,duration:number,source=0){for(const e of this.nearby(t,r)){if(e.tauntImmune>this.time||e.tauntUntil>this.time)continue;e.taunt=t.id;e.tauntUntil=this.time+duration*(ENEMIES[e.kind].boss?.5:1);e.tauntSource=source;e.decision=0;e.wind=0;}this.fx('ring',t,0xc5a3f4,r,.8);}
 slow(e:Enemy,value:number,duration:number){const actual=value*(ENEMIES[e.kind].boss?.5:1),factor=1-actual;e.slows??=[];const existing=e.slows.find(v=>v.factor===factor);if(existing)existing.until=Math.max(existing.until,this.time+duration);else e.slows.push({factor,until:this.time+duration});if(e.slowUntil<=this.time||factor<e.slow){e.slow=factor;e.slowUntil=this.time+duration;}}
 stun(e:Enemy,duration:number){if(ENEMIES[e.kind].boss||e.stunUntil>this.time||e.stunImmune>this.time)return;e.stunUntil=this.time+duration;e.stunImmune=e.stunUntil+1;e.wind=0;}
 packet(t:Building,skill=false):Packet{const near=this.nearPlayer(t,5),crit=!skill&&near&&this.rand()<Math.min(1,.15*this.b('crit'));
  return {damage:t.attack*(crit?1.75:1),pierce:near?.2*this.b('pierce'):0,hunter:near?.35*this.b('hunter'):0,boss:near?.25*this.b('boss'):0,overflow:near&&!skill&&t.kind!=='mortar'?Math.min(1,.5*this.b('overflow')):0,source:t.id,crit};
 }
 updateTowers(dt:number){for(const t of this.buildings){if(t.hp<=0||t.progress<1)continue;const d=TOWERS[t.kind];t.shot=Math.min(1,t.shot+(t.interval?dt/t.interval:0));t.skill=Math.min(1,t.skill+dt/t.skillInterval);
   if(t.aim){t.wind-=dt/t.interval;if(t.wind<=0){const target=this.enemies.find(e=>e.id===t.aim&&e.hp>0);if(target&&distance(t,target)-.5-ENEMIES[target.kind].r<=t.range&&(t.kind==='mortar'||this.map.los(t,target)))this.towerShot(t,target,false);else t.shot=1;t.aim=0;}}
   if(t.skillAim){t.skillWind-=dt;if(t.skillWind<=0){const target=this.enemies.find(e=>e.id===t.skillAim&&e.hp>0);if(target&&distance(t,target)<=d.range&&(t.kind==='mortar'||this.map.los(t,target)))this.towerShot(t,target,true);else t.skill=1;t.skillAim=0;}}
   if(t.shot>=1&&d.attack&&!t.aim){const candidates=this.nearby(t,t.range+1).filter(e=>distance(t,e)-.5-ENEMIES[e.kind].r<=t.range&&(t.kind==='mortar'||this.map.los(t,e)));
    if(candidates.length){let target=candidates.sort((a,b)=>(this.isPlayerTarget(a.target)?-100:0)+distance(a,t)-((this.isPlayerTarget(b.target)?-100:0)+distance(b,t)))[0];if(t.kind==='mortar')target=candidates.reduce((a,b)=>this.nearby(a,1.3).length>=this.nearby(b,1.3).length?a:b);t.aim=target.id;t.wind=.125;t.shot=0;}
   }
   if(t.skill>=1){const radius=t.kind==='wall'?1.2:t.kind==='frost'?(t.level>=3?3.5:3):t.kind==='taunt'?4:d.range;
    const targets=this.nearby(t,radius).filter(e=>t.kind!=='arrow'||this.map.los(t,e));if(!targets.length)continue;
    if(t.kind==='taunt')this.taunt(t,radius,t.level>=3?2.5:2);
    else if(t.kind==='wall'||t.kind==='frost'){for(const e of targets)this.slow(e,t.kind==='wall'?(t.level>=3?.45:.35):.4,t.kind==='wall'?2:2.5);this.fx('ring',t,d.color,radius,.7);}
    else{const target=t.kind==='mortar'?targets.reduce((a,b)=>this.nearby(a,1.3).length>=this.nearby(b,1.3).length?a:b):targets[0];t.skillAim=target.id;t.skillWind=t.kind==='mortar'?.3:.1;}t.skill=0;
   }
  }
 }
 towerShot(t:Building,e:Enemy,skill:boolean){const packet=this.packet(t,skill);if(skill&&t.kind==='arrow'){packet.damage*=t.level>=3?2:1.5;packet.pierce+=.5;}
  this.projectiles.push({id:this.serial++,kind:t.kind==='mortar'?'mortar':t.kind==='frost'?'ice':'arrow',x:t.x,y:t.y,sx:t.x,sy:t.y,target:e.id,tx:e.x,ty:e.y,age:0,life:t.kind==='mortar'?.65:2,speed:t.kind==='frost'?10:12,packet,radius:t.kind==='mortar'?1.3:0,stun:skill&&t.kind==='mortar'?(t.level>=3?.9:.6):0,maxTargets:t.kind==='mortar'?MORTAR_TARGET_CAP[t.level-1]:1});
  if(t.kind==='mortar')this.soundEvents.push('cannon');
 }
 enemyArrow(e:Enemy,target:Point){this.projectiles.push({id:this.serial++,kind:'enemy',x:e.x,y:e.y,sx:e.x,sy:e.y,target:e.target,tx:target.x,ty:target.y,age:0,life:1.3,speed:e.kind==='boss2'?10:8,packet:{damage:e.attack,pierce:0,hunter:0,boss:0,overflow:0,source:e.id,crit:false},radius:0,stun:0,maxTargets:1});}
 updateProjectiles(dt:number){const alive:Projectile[]=[];for(const p of this.projectiles){p.age+=dt;
   if(p.kind==='mortar'){p.x=p.sx+(p.tx-p.sx)*Math.min(1,p.age/p.life);p.y=p.sy+(p.ty-p.sy)*Math.min(1,p.age/p.life);if(p.age>=p.life){const impact={x:p.tx,y:p.ty},targets=this.nearby(impact,p.radius).sort((a,b)=>distance(a,impact)-distance(b,impact)||a.id-b.id).slice(0,p.maxTargets);for(const e of targets){this.hitEnemy(e,p.packet);if(p.stun)this.stun(e,p.stun);}this.fx('blast',impact,0xe3ad75,p.radius,.5);continue;}}
   else if(p.kind==='enemy'){const n=Math.hypot(p.tx-p.sx,p.ty-p.sy)||1;let dead=false;const steps=Math.ceil(p.speed*dt/.15);for(let j=0;j<steps;j++){p.x+=(p.tx-p.sx)/n*p.speed*dt/steps;p.y+=(p.ty-p.sy)/n*p.speed*dt/steps;if(this.map.terrain(p.x,p.y)===1){dead=true;break;}
     const aimed=this.playerForTarget(p.target),workers=aimed?[aimed,...this.alivePlayers().filter(w=>w!==aimed)]:this.alivePlayers(),victim=!this.invincible&&workers.find(w=>distance(p,w)<.3);if(victim){this.damagePlayer(p.packet.damage,victim);dead=true;break;}
     const t=this.buildings.find(t=>t.hp>0&&Math.abs(t.x-p.x)<.5&&Math.abs(t.y-p.y)<.5&&!(aimed&&cell(t)===cell(aimed)));if(t){this.damageBuilding(t,p.packet.damage);dead=true;break;}
    }if(dead)continue;
   }else{const e=this.enemies.find(e=>e.id===p.target&&e.hp>0);if(!e)continue;const n=distance(p,e),travel=p.speed*dt;
    const next={x:p.x+(e.x-p.x)/Math.max(n,.001)*Math.min(n,travel),y:p.y+(e.y-p.y)/Math.max(n,.001)*Math.min(n,travel)};if(!this.map.los(p,next))continue;p.x=next.x;p.y=next.y;if(n<=travel+ENEMIES[e.kind].r){this.hitEnemy(e,p.packet);continue;}}
   if(p.age<p.life)alive.push(p);
  }this.projectiles=alive;
 }
 hitEnemy(e:Enemy,p:Packet,secondary=false){if(e.hp<=0||p.damage<=0)return;const d=ENEMIES[e.kind],bonus=secondary?1:1+(d.cavalry?p.hunter:0)+(d.boss?p.boss:0);const hit=Math.max(1,p.damage*bonus*100/(100+d.armor*(1-Math.min(1,p.pierce))));const before=e.hp;e.hp-=hit;e.flash=this.time+.1;const tower=this.buildings.find(t=>t.id===p.source);if(tower){tower.damage+=Math.min(before,hit);this.stats.damage[tower.kind]+=Math.min(before,hit);}
  if(p.crit&&!secondary)this.fx('number',e,0xffdf91,.7,.6,''+Math.round(hit)+'!');
  if(e.hp<=0){this.stats.kills++;this.setGold(this.gold+d.gold);this.stats.income+=d.gold;this.player.xp+=d.xp;this.fx('death',e,d.color,d.boss?1.2:.5,.5);
   while(this.player.level<12&&this.player.xp>=XP[this.player.level]){this.player.level++;for(const w of this.players){w.level=this.player.level;w.xp=this.player.xp;if(w.hp>0){w.hp=Math.min(w.maxHp,w.hp+10);this.fx('ring',w,0xf4d88e,2,1);}}this.message(`队伍等级 ${this.player.level}`);this.soundEvents.push('level');}
   if(d.boss&&this.rewardPool.length){const index=Math.floor(this.rand()*this.rewardPool.length),kind=this.rewardPool.splice(index,1)[0];this.drop(kind,e);this.message(`${d.name} 被击败 · 地面掉落新奖励`,'boss');}
   const excess=hit-before;if(!secondary&&p.overflow>0&&excess>0){const other=this.nearby(e,2).filter(o=>o.id!==e.id&&this.map.los(e,o)).sort((a,b)=>distance(a,e)-distance(b,e))[0];if(other){this.visuals.push({kind:'arc',x:e.x,y:e.y,tx:other.x,ty:other.y,color:0xf4d88e,size:1,life:.3,age:0});this.hitEnemy(other,{...p,damage:excess*p.overflow,overflow:0,crit:false},true);}}
  }
 }
 cleanDead(){const destroyed=this.buildings.filter(t=>t.hp<=0);for(const t of destroyed){this.stats.lost++;this.fx('blast',t,0xb79072,1,.7);for(const p of this.players)if(p.task?.id===t.id)p.task=null;for(const e of this.enemies)if(e.taunt===t.id){e.tauntUntil=this.time;e.decision=0;}this.message(TOWERS[t.kind].name+' 被摧毁','bad');}
  if(destroyed.length){this.buildings=this.buildings.filter(t=>t.hp>0);this.reindex();}this.enemies=this.enemies.filter(e=>e.hp>0);
 }
 // Explicit practice mode only; normal runs have no debug grants or wave skips.
 practiceStart(){this.start();this.practice=true;this.god=true;this.setGold(5000);for(const p of this.players){p.xp=3900;p.level=12;}this.time=-10;this.message('演练模式 · 无敌、全建筑解锁，可测试全部装备');}
 grant(kind:RewardKind){if(this.practice)this.drop(kind,this.player);}
 snapshot(){return {state:this.state,time:this.time,wave:this.wave,gold:this.gold,player:{...this.player,input:{...this.player.input}},players:this.players.map(p=>({id:p.id,x:p.x,y:p.y,hp:p.hp,gold:this.gold,task:p.task,selected:p.selected})),playerCount:this.playerCount,waveInterval:this.waveInterval,batches:this.batches.reduce((n,b)=>n+b.kinds.length,0),buildings:this.buildings.map(t=>({id:t.id,owner:t.owner,kind:t.kind,x:t.x,y:t.y,hp:t.hp,level:t.level,progress:t.progress})),enemies:this.enemies.length,kills:this.stats.kills,gear:this.gear.map(g=>g?.kind||null),buffs:{...this.buffs},drops:this.drops.map(d=>({id:d.id,kind:d.kind,x:d.x,y:d.y})),task:this.task,paused:this.paused};}
}
