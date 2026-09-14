import Phaser from 'phaser';
import {ACTIVES,BUFFS,ENEMIES,isActive,KEYS,SIZE,TOWERS,UPGRADE,XP,type RewardKind} from './data';
import {cell} from './map';
import {BattleScene} from './render';
import {Simulation} from './sim';
import {AudioBus} from './audio';
import './style.css';
let sim=new Simulation();const audio=new AudioBus();let book=false,overlayKey='',lastMini=0;
const ui=document.querySelector<HTMLDivElement>('#ui')!;
ui.innerHTML=`<div class="vignette"></div><header id="hud"><div class="identity"><span class="brandmark">⚒</span><div><strong>围城工匠</strong><small>THE LAST BUILDER</small></div></div><div class="survival"><span class="small-label">工匠 <b id="level">Lv.1</b></span><div class="hp-track"><i id="hp-fill"></i><span id="hp-text">100 / 100</span></div><div class="xp-track"><i id="xp-fill"></i></div></div><div class="economy"><span>◆ <b id="gold">120</b></span><small id="capacity">建筑 1 / 6</small></div><div class="wave"><span id="wave-title">准备阶段</span><small id="wave-time">敌军抵达 10s</small></div><div class="header-actions"><button data-action="sound" id="sound" title="声音开关">♪</button><button data-action="book" title="战地手册">?</button><button data-action="pause" title="暂停 P">Ⅱ</button></div></header>
<aside class="map-panel" id="map-panel"><canvas id="minimap" width="144" height="144" aria-label="战场地图"></canvas><div><span id="clock">00:00</span><small id="count">0 敌军</small></div></aside><div id="buffs" class="buffs"></div><div id="boss-bars"></div><div id="messages" aria-live="polite"></div>
<div id="context" class="context"></div><div id="toolbar" class="toolbar"></div><div id="equipment" class="equipment"></div><div class="bottom-hint" id="bottom-hint"><kbd>WASD</kbd>移动 <span>·</span> <kbd>E</kbd>建造 <kbd>R</kbd>修复 <kbd>F</kbd>升级 <kbd>G</kbd>拾取</div>
<div id="mobile-stick"><i></i></div><div id="overlay"></div>`;
const $=(id:string)=>document.getElementById(id)!;
const setHTML=(id:string,html:string)=>{const node=$(id);if(node.innerHTML!==html)node.innerHTML=html;};
const clock=(t:number)=>`${Math.floor(Math.max(0,t)/60).toString().padStart(2,'0')}:${Math.floor(Math.max(0,t)%60).toString().padStart(2,'0')}`;
const scene=new BattleScene(sim,refresh);
const game=new Phaser.Game({type:Phaser.AUTO,parent:'world',width:window.innerWidth,height:window.innerHeight,backgroundColor:'#263e31',antialias:true,powerPreference:'high-performance',scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[scene],audio:{noAudio:true},input:{keyboard:true}});
function begin(practice=false){audio.enable();sim=new Simulation();scene.sim=sim;scene.keys.clear();scene.touch={x:0,y:0};book=false;overlayKey='__refresh__';if(practice)sim.practiceStart();else sim.start();refresh();}
ui.addEventListener('click',event=>{const button=(event.target as HTMLElement).closest<HTMLElement>('[data-action]');if(!button)return;audio.enable();const action=button.dataset.action!;
 if(action==='start'||action==='restart'){begin();return;}if(action==='practice'){begin(true);return;}
 if(action==='menu'){sim.state='menu';sim.paused=false;book=false;overlayKey='';refresh();return;}
 if(action==='sound'){audio.muted=!audio.muted;refresh();return;}
 if(action==='book'){book=!book;if(sim.state==='playing')sim.paused=book;scene.keys.clear();refresh();return;}
 if(action==='pause'){if(sim.state==='playing'){sim.paused=!sim.paused;book=false;scene.keys.clear();}refresh();return;}
 if(action==='tower'){if(!sim.paused)sim.selected=KEYS[Number(button.dataset.index)];refresh();return;}
 if(action==='swap'){sim.exchange(Number(button.dataset.index));refresh();return;}
 if(action==='grant'){sim.grant(button.dataset.kind as RewardKind);refresh();return;}
 if(action==='practice-wave'&&sim.practice){const b=sim.batches.find(b=>!b.done);if(b){sim.time=Math.max(sim.time,b.time-2.1);}refresh();return;}
 sim.command(action as Parameters<Simulation['command']>[0]);refresh();
});
function refresh(){const playing=sim.state==='playing';if(playing&&!sim.paused)book=false;ui.classList.toggle('in-game',playing);ui.classList.toggle('paused',sim.paused);ui.classList.toggle('practice',sim.practice);
 $('hp-fill').style.width=Math.max(0,sim.player.hp)+'%';$('hp-text').textContent=`${Math.max(0,Math.ceil(sim.player.hp))} / 100`;$('level').textContent='Lv.'+sim.player.level;
 const low=XP[sim.player.level-1],high=XP[sim.player.level]||low+1;$('xp-fill').style.width=(sim.player.level===12?100:(sim.player.xp-low)/(high-low)*100)+'%';
 $('gold').textContent=Math.floor(sim.player.gold).toString();$('capacity').textContent=`建筑 ${sim.buildings.length} / ${sim.cap}`;
 $('wave-title').textContent=sim.time<0?'准备阶段':`第 ${sim.wave.toString().padStart(2,'0')} / 20 波`;
 $('wave-time').textContent=sim.time<0?`敌军抵达 ${Math.ceil(-sim.time)}s`:sim.wave===20?'最终清场 · 消灭全部敌军':`下一波 ${Math.ceil(sim.wave*45-sim.time)}s`;
 $('clock').textContent=clock(sim.time);$('count').textContent=`${sim.enemies.length} 敌军`;$('sound').textContent=audio.muted?'♫̸':'♪';
 setHTML('toolbar',KEYS.map((k,i)=>{const d=TOWERS[k],locked=sim.player.level<d.unlock;return `<button data-action="tower" data-index="${i}" class="tower-choice ${sim.selected===k?'selected':''} ${locked?'locked':''}" title="${d.name}：${d.desc}\n建造${d.work}秒 · 生命${d.hp} · 护甲${d.armor}"><kbd>${i+1}</kbd><span class="tower-icon ${k}">${d.icon}</span><strong>${d.name}</strong><small>${locked?'Lv.'+d.unlock+' 解锁':'◆ '+d.cost}</small></button>`;}).join(''));
 setHTML('equipment',sim.gear.map((g,i)=>{const d=g?ACTIVES[g.kind]:null,remaining=g?Math.max(0,g.ready-sim.time,(sim.shared[g.kind]||-100)-sim.time):0;return `<button data-action="active${i}" class="gear ${g&&g.until>sim.time?'active':''}" title="${d?.desc||'击败BOSS后拾取主动装备'}"><kbd>${i===0?'Q':'SPACE'}</kbd><span>${d?.icon||'+'}</span><div><strong>${d?.name||'空装备格'}</strong><small>${remaining>0?'冷却 '+Math.ceil(remaining)+'s':d?'可以使用':'BOSS掉落装备'}</small></div>${remaining>0?`<i style="height:${remaining/(d?.cd||1)*100}%"></i>`:''}</button>`;}).join(''));
 setHTML('buffs',Object.entries(sim.buffs).map(([k,n])=>{const d=BUFFS[k as keyof typeof BUFFS];return `<span title="${d.name} ×${n}：${d.desc}，持续整局">${d.icon}<small>${n!>1?n:''}</small></span>`;}).join(''));
 setHTML('messages',sim.messages.slice(-3).map(m=>`<div class="toast ${m.type}">${m.text}</div>`).join(''));
 const t=sim.atPlayer(),drop=sim.drops.find(d=>cell(d)===cell(sim.player));let context='';
 if(drop){const d=isActive(drop.kind)?ACTIVES[drop.kind]:BUFFS[drop.kind];context=`<div class="context-title"><span class="gold">${d.icon}</span> ${d.name} <small>${isActive(drop.kind)?'主动装备':'永久被动BUFF'}</small></div><p>${d.desc}</p><button class="action" data-action="pickup"><kbd>G</kbd> ${isActive(drop.kind)&&sim.gear.every(Boolean)?'拾取 / 选择替换':'拾取'}</button>`;}
 else if(t){const d=TOWERS[t.kind];context=`<div class="context-title">${d.name} <small>${t.progress<1?'施工中':`等级 ${t.level}`} · ${Math.ceil(t.hp)}/${Math.round(t.maxHp)}</small></div>`;
  if(t.progress<1)context+=`<div class="work-track"><i style="width:${t.progress*100}%"></i></div><button class="action" data-action="build"><kbd>E</kbd> ${sim.task?'正在建造':'继续建造'} · ${((1-t.progress)*d.work/sim.buildRate).toFixed(1)}s</button>`;
  else{context+=`<div class="context-actions"><button class="action" data-action="repair"><kbd>R</kbd> 修复 <small>◆ ${((t.maxHp-t.hp)/t.maxHp*d.cost*.3).toFixed(1)}</small></button><button class="action" data-action="upgrade"><kbd>F</kbd> ${t.level===4?'已满级':`升级 ◆ ${Math.ceil(d.cost*UPGRADE[t.level])}`}</button></div>`;}
 }else{const d=TOWERS[sim.selected];context=`<div class="context-title">${d.name}<small>${d.desc}</small></div><button class="action" data-action="build"><kbd>E</kbd> 原地建造 <span>◆ ${d.cost} · ${(d.work/sim.buildRate).toFixed(1)}s</span></button>`;}
 setHTML('context',context);
 setHTML('boss-bars',sim.enemies.filter(e=>ENEMIES[e.kind].boss).map(e=>`<div class="boss-hud"><strong>${ENEMIES[e.kind].name}</strong><div><i style="width:${e.hp/e.maxHp*100}%"></i></div><small>${Math.ceil(e.hp)} / ${e.maxHp}</small></div>`).join(''));
 const bossCount=sim.enemies.filter(e=>ENEMIES[e.kind].boss).length;$('boss-bars').style.top=window.innerWidth<=720?'140px':'110px';$('messages').style.top=bossCount?(window.innerWidth<=720?140:110)+bossCount*43+8+'px':(window.innerWidth<=720?'85px':'115px');
 $('bottom-hint').innerHTML=sim.practice?'<span class="practice-label">演练 · 无敌</span> <button data-action="practice-wave">下一批敌军 →</button> <button data-action="book">装备补给 / 手册</button>':'<kbd>WASD</kbd>移动 <span>·</span> <kbd>E</kbd>建造 <kbd>R</kbd>修复 <kbd>F</kbd>升级 <kbd>G</kbd>拾取';
 let key=book?'book':sim.state==='menu'?'menu':sim.state==='won'||sim.state==='lost'?sim.state:sim.paused?'pause':sim.swap!==null?'swap'+sim.swap:'';
 if(key!==overlayKey){overlayKey=key;renderOverlay(key);}
 if(performance.now()-lastMini>300){drawMini();lastMini=performance.now();}
 for(const event of sim.soundEvents.splice(0))audio.play(event);
}
function renderOverlay(key:string){const root=$('overlay');root.innerHTML='';root.className=key?'visible '+(key==='menu'?'menu-overlay':''):'';if(!key)return;
 if(key==='menu')root.innerHTML=`<section class="landing"><div class="edition"><span></span> 生存建造 · 20波守城</div><h1>围城<br><em>工匠</em><b>THE LAST BUILDER</b></h1><p class="intro">你没有利刃。<br>你的阵地，就是你的武器。</p><p class="landing-note">穿过石脊、河道与泥地，引导敌群。<br>在脚下筑起防线，在围城中活到最后。</p><div class="start-actions"><button class="primary" data-action="start">开始守城 <span>↗</span></button><button class="secondary" data-action="practice">自由演练</button></div><div class="landing-footer"><span>约15分钟 / 单人</span><button data-action="book">查看战地手册 ↗</button></div></section><div class="landing-caption"><i>01 / 营地</i><strong>一座箭塔，一名工匠。<br>防线由此开始。</strong><span>WASD移动 · E原地建造</span></div>`;
 else if(key==='pause')root.innerHTML=`<section class="modal"><span class="eyebrow">TAKE A BREATH</span><h2>战场已暂停</h2><p>计时、施工和敌军都在等你。</p><button class="primary" data-action="pause">继续守城</button><button class="secondary" data-action="book">战地手册${sim.practice?' / 装备补给':''}</button><button class="text-button" data-action="menu">返回营地</button></section>`;
 else if(key==='won'||key==='lost')root.innerHTML=`<section class="modal result"><span class="eyebrow">${sim.practice?'PRACTICE COMPLETE':key==='won'?'THE NIGHT IS OVER':'THE WALLS REMEMBER'}</span><h2>${key==='won'?'守城成功':'防线失守'}</h2><p>${key==='won'?'最后一名敌人倒下。你守住了这片土地。':'每一道防线，都是下一次胜利的经验。'}</p><div class="results"><div><b>${clock(sim.time)}</b><small>生存时间</small></div><div><b>${sim.wave}/20</b><small>抵达波次</small></div><div><b>${sim.stats.kills}</b><small>消灭敌军</small></div><div><b>${sim.stats.built}</b><small>完成建造</small></div></div><details class="result-details"><summary>查看战场记录</summary><p>等级 ${sim.player.level} · 建筑损失 ${sim.stats.lost} · 修复生命 ${Math.round(sim.stats.repaired)}<br>击杀收入 ${sim.stats.income} · 支出 ${sim.stats.spent.toFixed(1)} · 主动使用 ${sim.stats.actives}次</p>${KEYS.filter(k=>sim.stats.damage[k]>0).map(k=>`<div>${TOWERS[k].name}<span>${Math.round(sim.stats.damage[k])} 伤害</span></div>`).join('')}<p>主动：${sim.gear.filter(Boolean).map(g=>ACTIVES[g!.kind].name).join('、')||'无'}<br>祝福：${Object.keys(sim.buffs).map(k=>BUFFS[k as keyof typeof BUFFS].name).join('、')||'无'}</p></details><button class="primary" data-action="restart">再次守城 ↗</button><button class="text-button" data-action="menu">返回营地</button></section>`;
 else if(key.startsWith('swap')){const d=sim.drops.find(d=>d.id===sim.swap);if(d&&isActive(d.kind))root.innerHTML=`<section class="modal swap"><span class="eyebrow">FIELD EQUIPMENT</span><h2>选择要替换的装备</h2><p class="warning-text">战斗仍在继续。旧装备会留在脚下，可再次拾取。</p><div class="new-gear"><b>${ACTIVES[d.kind].icon} ${ACTIVES[d.kind].name}</b><p>${ACTIVES[d.kind].desc}</p></div>${sim.gear.map((g,i)=>`<button class="swap-choice" data-action="swap" data-index="${i}"><b>${g?ACTIVES[g.kind].name:'空格'}</b><small>${g?ACTIVES[g.kind].desc:''}</small><span>替换 →</span></button>`).join('')}<button class="text-button" data-action="cancel">保留原装备</button></section>`;}
 else if(key==='book')root.innerHTML=`<section class="modal book"><div class="book-head"><div><span class="eyebrow">FIELD MANUAL</span><h2>工匠的战地手册</h2></div><button data-action="book" class="close">×</button></div><div class="book-scroll"><div class="manual-grid"><article><h3>01 · 到现场，才能建造</h3><p>WASD / 方向键移动。数字1—5选择建筑，E在脚下开工。移动会中断，但保留进度；受伤不会清零。</p></article><article><h3>02 · 维护你的防线</h3><p>站上已完工建筑，R持续修复、F瞬间升级。修复付建造点。升级保持生命比例，不能代替修复。</p></article><article><h3>03 · 利用复杂地形</h3><p>石头、河流和高地边缘不可通行；只有带横纹的坡道能切换高低地。石头阻挡直射，泥泞令地面单位减速30%。飞翼掠夺者无视这些地面限制。</p></article><article><h3>04 · 时间不会等你</h3><p>每45秒来一波，旧敌人不会消失。第6波起出现空军，5、10、15、20波出现BOSS。全部20波生成且清场后胜利。</p></article><article><h3>05 · 只带两件主动</h3><p>BOSS掉落道具，走到所在格按G拾取。Q / 空格使用主动。满格时替换，旧装备留在原地，冷却不会重置。</p></article><article><h3>06 · 祝福伴你同行</h3><p>被动拾取即成为整局BUFF，不占格。建筑需要在你周围5格内才能受益。无敌只保护你，工地仍会被攻击。</p></article></div><h3 class="catalog-title">主动装备 · 9种</h3><div class="catalog">${Object.entries(ACTIVES).map(([k,d])=>`<article><span>${d.icon}</span><div><b>${d.name}</b><p>${d.desc} · 冷却${d.cd}秒</p></div>${sim.practice?`<button data-action="grant" data-kind="${k}">投放</button>`:''}</article>`).join('')}</div><h3 class="catalog-title">被动祝福 · 11种</h3><div class="catalog">${Object.entries(BUFFS).map(([k,d])=>`<article><span>${d.icon}</span><div><b>${d.name}</b><p>${d.desc}</p></div>${sim.practice?`<button data-action="grant" data-kind="${k}">投放</button>`:''}</article>`).join('')}</div></div></section>`;
}
function drawMini(){const c=$('minimap') as HTMLCanvasElement,ctx=c.getContext('2d')!,scale=c.width/SIZE;ctx.fillStyle='#233b30';ctx.fillRect(0,0,c.width,c.height);
 for(let i=0;i<sim.map.elevation.length;i++)if(sim.map.elevation[i]){ctx.fillStyle='#49664b';ctx.fillRect(i%SIZE*scale,Math.floor(i/SIZE)*scale,scale,scale);}
 for(let i=0;i<sim.map.tiles.length;i++){const t=sim.map.tiles[i];if(t){ctx.fillStyle=t===1?'#627268':t===2?'#487d7e':'#756c49';ctx.fillRect(i%SIZE*scale,Math.floor(i/SIZE)*scale,scale,scale);}}
 ctx.fillStyle='#c2a76b';for(let i=0;i<sim.map.ramps.length;i++)if(sim.map.ramps[i])ctx.fillRect(i%SIZE*scale,Math.floor(i/SIZE)*scale,scale,scale);
 ctx.fillStyle='#e7cb8b';for(const b of sim.buildings)ctx.fillRect(b.x*scale-1,b.y*scale-1,2,2);
 for(const e of sim.enemies){ctx.fillStyle=ENEMIES[e.kind].air?'#9ed9db':'#dc8d79';ctx.fillRect(e.x*scale-1,e.y*scale-1,ENEMIES[e.kind].boss?4:ENEMIES[e.kind].air?2.2:1.5,ENEMIES[e.kind].boss?4:ENEMIES[e.kind].air?2.2:1.5);}
 ctx.fillStyle='#a4e2d2';for(const d of sim.drops)ctx.fillRect(d.x*scale-1,d.y*scale-1,3,3);
 ctx.fillStyle='#fff3c4';ctx.beginPath();ctx.arc(sim.player.x*scale,sim.player.y*scale,3,0,Math.PI*2);ctx.fill();
}
const stick=$('mobile-stick');let pointer:number|null=null;function stickMove(e:PointerEvent){if(pointer!==e.pointerId)return;const r=stick.getBoundingClientRect(),dx=(e.clientX-r.left-r.width/2)/35,dy=(e.clientY-r.top-r.height/2)/35,n=Math.max(1,Math.hypot(dx,dy));scene.touch={x:dx/n,y:dy/n};(stick.firstElementChild as HTMLElement).style.transform=`translate(${dx/n*25}px,${dy/n*25}px)`;}
stick.addEventListener('pointerdown',e=>{pointer=e.pointerId;stick.setPointerCapture(pointer);stickMove(e);});stick.addEventListener('pointermove',stickMove);for(const name of ['pointerup','pointercancel'])stick.addEventListener(name,()=>{pointer=null;scene.touch={x:0,y:0};(stick.firstElementChild as HTMLElement).style.transform='';});
// Read-only state hook, plus explicit scenario controls only in dev/QA URLs.
const qa=new URLSearchParams(location.search).has('qa');
Object.assign(window,{siege:{snapshot:()=>sim.snapshot(),...(qa?{sim:()=>sim,begin,step:(seconds:number)=>{for(let i=0;i<seconds*30;i++)sim.tick(1/30);refresh();},refresh}:{} )}});
refresh();
