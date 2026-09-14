import Phaser from 'phaser';
import {ENEMIES,isActive,KEYS,SIZE,TILE,TOWERS} from './data';
import {distance,random} from './map';
import {Simulation,type Building,type Enemy,type Worker} from './sim';
export class BattleScene extends Phaser.Scene{
 sim:Simulation;world!:Phaser.GameObjects.Graphics;actors!:Phaser.GameObjects.Graphics;effects!:Phaser.GameObjects.Graphics;labels:Phaser.GameObjects.Text[]=[];workerLabels:Phaser.GameObjects.Text[]=[];
 keys=new Set<string>();acc=0;onTick:()=>void;lastUI=0;touch={x:0,y:0};
 constructor(sim:Simulation,onTick:()=>void){super('battle');this.sim=sim;this.onTick=onTick;}
 create(){this.world=this.add.graphics();this.actors=this.add.graphics();this.effects=this.add.graphics();this.drawMap();
  this.input.keyboard!.on('keydown',(e:KeyboardEvent)=>{if(['INPUT','SELECT','TEXTAREA'].includes((e.target as HTMLElement)?.tagName))return;this.keys.add(e.code);if(e.repeat)return;
   if(['Space','Enter','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
   const s=this.sim;if(s.state!=='playing')return;
   if(e.code==='KeyP'){s.paused=!s.paused;this.keys.clear();this.onTick();return;}
   if(e.code==='Escape'){if(s.swap!==null||s.task){s.command('cancel');}else s.paused=!s.paused;this.keys.clear();this.onTick();return;}
   if((e.code==='Enter'&&s.playerCount===1)||(e.code==='KeyO'&&s.playerCount===2)){s.joinPlayer();this.keys.clear();this.onTick();return;}
   if(/^Digit[1-5]$/.test(e.code)){s.players[0].selected=KEYS[Number(e.code.slice(-1))-1];s.focusPlayer=0;}
   const moveOwner:Record<string,number>={KeyW:0,KeyA:0,KeyS:0,KeyD:0,ArrowUp:1,ArrowLeft:1,ArrowDown:1,ArrowRight:1,KeyI:2,KeyJ:2,KeyK:2,KeyL:2};if(moveOwner[e.code]!==undefined&&moveOwner[e.code]<s.playerCount)s.focusPlayer=moveOwner[e.code];
   const cycles:Record<string,[number,number]>={BracketLeft:[1,-1],BracketRight:[1,1],KeyN:[2,-1],KeyM:[2,1]};const cycle=cycles[e.code];if(cycle&&cycle[0]<s.playerCount){const p=s.players[cycle[0]],i=KEYS.indexOf(p.selected);p.selected=KEYS[(i+cycle[1]+KEYS.length)%KEYS.length];s.focusPlayer=cycle[0];}
   const actions:Record<string,[number,Parameters<Simulation['command']>[0]]>={KeyE:[0,'build'],KeyR:[0,'repair'],KeyF:[0,'upgrade'],KeyG:[0,'pickup'],KeyQ:[0,'active0'],Space:[0,'active1'],Enter:[1,'build'],Slash:[1,'repair'],Period:[1,'upgrade'],Comma:[1,'pickup'],Semicolon:[1,'active0'],Quote:[1,'active1'],KeyO:[2,'build'],KeyU:[2,'repair'],KeyY:[2,'upgrade'],KeyH:[2,'pickup'],KeyV:[2,'active0'],KeyB:[2,'active1']};const action=actions[e.code];if(action&&action[0]<s.playerCount)s.command(action[1],action[0]);this.onTick();
  });this.input.keyboard!.on('keyup',(e:KeyboardEvent)=>this.keys.delete(e.code));
  window.addEventListener('blur',()=>{this.keys.clear();this.touch={x:0,y:0};if(this.sim.state==='playing'){this.sim.paused=true;this.onTick();}});
  this.input.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{if(pointer.rightButtonDown())this.sim.command('cancel');});this.game.canvas.addEventListener('contextmenu',e=>e.preventDefault());
  this.cameras.main.setBounds(0,0,SIZE*TILE,SIZE*TILE);this.cameras.main.setBackgroundColor('#263e31');this.resize();this.scale.on('resize',()=>this.resize());
 }
 resize(){const camera=this.cameras.main;camera.setZoom(this.scale.width<700?.78:1);}
 drawMap(){const g=this.world,rand=random(773);g.clear();g.fillStyle(0x2d4739).fillRect(0,0,SIZE*TILE,SIZE*TILE);
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const id=y*SIZE+x,px=x*TILE,py=y*TILE,type=this.sim.map.tiles[id],high=!!this.sim.map.elevation[id],shade=rand();
   if(type===2){g.fillStyle(high?(shade>.5?0x3b6968:0x3e6e6c):(shade>.5?0x315b5d:0x345f61)).fillRect(px,py,TILE,TILE);g.lineStyle(1,0x86bab1,.18);g.lineBetween(px+8,py+12,px+24,py+12);if(shade>.6)g.lineBetween(px+22,py+29,px+35,py+29);}
   else if(type===3){g.fillStyle(high?(shade>.55?0x5b573d:0x53543a):(shade>.55?0x4a4934:0x444630)).fillRect(px,py,TILE,TILE);g.fillStyle(0x776a47,.22).fillEllipse(px+14,py+13,18,8).fillEllipse(px+31,py+29,15,7);g.lineStyle(1,0xa69561,.24).strokeCircle(px+13,py+13,4).strokeCircle(px+31,py+29,3);}
   else if(type===4)g.fillStyle(0x26382e).fillRect(px,py,TILE,TILE);
   else{g.fillStyle(high?(shade>.75?0x476248:shade>.3?0x425d44:0x3f5941):(shade>.75?0x354e3d:shade>.3?0x314b39:0x304837)).fillRect(px,py,TILE,TILE);
    if(type===1){g.fillStyle(0x122920,.4).fillEllipse(px+24,py+34,41,17);g.fillStyle(0x60766a).fillPoints([{x:px+3,y:py+24},{x:px+8,y:py+8},{x:px+28,y:py+3},{x:px+40,y:py+15},{x:px+36,y:py+34},{x:px+13,y:py+36}],true);g.fillStyle(0x809083).fillTriangle(px+8,py+8,px+28,py+3,px+22,py+21);g.fillStyle(0x4b6157).fillTriangle(px+22,py+21,px+40,py+15,px+36,py+34);g.lineStyle(1,0x9dab92,.4).lineBetween(px+9,py+9,px+26,py+5);}
    else{if(shade>.52){const a=px+rand()*34+4,b=py+rand()*32+5;g.lineStyle(1,0x73945d,.27).lineBetween(a,b,a-2,b-4).lineBetween(a,b,a+3,b-5);}if(shade>.91){g.fillStyle(0xb9b57b,.45).fillCircle(px+14,py+24,1.3).fillCircle(px+18,py+22,1);}}
   }
  }
  // A full blocked tile now depicts the vertical drop instead of a thin outline.
  for(let y=1;y<SIZE-1;y++)for(let x=1;x<SIZE-1;x++){const id=y*SIZE+x;if(this.sim.map.tiles[id]!==4)continue;const px=x*TILE,py=y*TILE,left=!this.sim.map.elevation[id-1],right=!this.sim.map.elevation[id+1],up=!this.sim.map.elevation[id-SIZE],down=!this.sim.map.elevation[id+SIZE],dx=left?-1:right?1:0,dy=up?-1:down?1:0;
   const light=0x52684f,mid=0x34483a,dark=0x17271f;let tl=mid,tr=mid,bl=mid,br=mid;
   if(dx===1&&dy===1){tl=light;br=dark;}else if(dx===-1&&dy===-1){tl=dark;br=light;}else if(dx===1&&dy===-1){tr=dark;bl=light;}else if(dx===-1&&dy===1){tl=mid;tr=light;bl=dark;br=mid;}
   else if(dx===1){tl=light;bl=light;tr=dark;br=dark;}else if(dx===-1){tl=dark;bl=dark;tr=light;br=light;}else if(dy===1){tl=light;tr=light;bl=dark;br=dark;}else{tl=dark;tr=dark;bl=light;br=light;}
   g.fillGradientStyle(tl,tr,bl,br,1).fillRect(px,py,TILE,TILE);
   g.lineStyle(3,0x91a273,.55);if(left)g.lineBetween(px+TILE-3,py+3,px+TILE-3,py+TILE-3);if(right)g.lineBetween(px+3,py+3,px+3,py+TILE-3);if(up)g.lineBetween(px+3,py+TILE-3,px+TILE-3,py+TILE-3);if(down)g.lineBetween(px+3,py+3,px+TILE-3,py+3);
   g.lineStyle(1,0x102018,.3);if(left)g.lineBetween(px,py,px,py+TILE);if(right)g.lineBetween(px+TILE,py,px+TILE,py+TILE);if(up)g.lineBetween(px,py,px+TILE,py);if(down)g.lineBetween(px,py+TILE,px+TILE,py+TILE);
   g.lineStyle(1,0x9aa286,.23).lineBetween(px+12,py+10,px+18,py+22).lineBetween(px+18,py+22,px+14,py+31).lineBetween(px+30,py+7,px+26,py+17);
  }
  // Two-cell ramps use a continuous color slope and lengthwise guide marks, avoiding stair-step stripes.
  for(let i=0;i<this.sim.map.ramps.length;i++)if(this.sim.map.ramps[i]){const x=i%SIZE,y=Math.floor(i/SIZE),px=x*TILE,py=y*TILE,high=!!this.sim.map.elevation[i];let pair=-1;
   for(const off of [-1,1,-SIZE,SIZE]){const ni=i+off;if(this.sim.map.ramps[ni]&&this.sim.map.elevation[ni]!==this.sim.map.elevation[i]){pair=ni;break;}}
   if(pair<0)continue;const pairX=pair%SIZE,pairY=Math.floor(pair/SIZE),dx=high?pairX-x:x-pairX,dy=high?pairY-y:y-pairY,from=high?0x566c50:0x907851,to=high?0x907851:0x344d3b;
   if(dx===1)g.fillGradientStyle(from,to,from,to,1);else if(dx===-1)g.fillGradientStyle(to,from,to,from,1);else if(dy===1)g.fillGradientStyle(from,from,to,to,1);else g.fillGradientStyle(to,to,from,from,1);g.fillRect(px,py,TILE,TILE);
   g.lineStyle(2,0xc2ae79,.36);if(dx){g.lineBetween(px+2,py+5,px+TILE-2,py+5).lineBetween(px+2,py+TILE-5,px+TILE-2,py+TILE-5);g.lineStyle(1,0xe0cb91,.2).lineBetween(px+3,py+TILE/2,px+TILE-3,py+TILE/2);}else{g.lineBetween(px+5,py+2,px+5,py+TILE-2).lineBetween(px+TILE-5,py+2,px+TILE-5,py+TILE-2);g.lineStyle(1,0xe0cb91,.2).lineBetween(px+TILE/2,py+3,px+TILE/2,py+TILE-3);}
  }
  // A weathered foundation marks the initial camp without constraining construction.
  g.lineStyle(1,0xd7c896,.12).strokeRect(29*TILE,29*TILE,7*TILE,7*TILE);g.lineStyle(1,0xcabf91,.055);
  for(let i=1;i<SIZE;i++)g.lineBetween(i*TILE,0,i*TILE,SIZE*TILE).lineBetween(0,i*TILE,SIZE*TILE,i*TILE);
 }
 update(_time:number,delta:number){const s=this.sim;this.acc+=Math.min(delta/1000,.15);const controls=[['KeyA','KeyD','KeyW','KeyS'],['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'],['KeyJ','KeyL','KeyI','KeyK']];for(let i=0;i<s.players.length;i++){const [left,right,up,down]=controls[i];s.players[i].input={x:(this.keys.has(right)?1:0)-(this.keys.has(left)?1:0),y:(this.keys.has(down)?1:0)-(this.keys.has(up)?1:0)};}s.player.input={x:s.player.input.x||this.touch.x,y:s.player.input.y||this.touch.y};
  while(this.acc>=1/30){s.tick(1/30);this.acc-=1/30;}
  const party=s.alivePlayers(),center=s.partyCenter(),spreadX=Math.max(...party.map(p=>Math.abs(p.x-center.x)),0)*TILE*2,spreadY=Math.max(...party.map(p=>Math.abs(p.y-center.y)),0)*TILE*2,base=this.scale.width<700?.78:1,fit=Math.min(base,(this.scale.width-180)/Math.max(600,spreadX+420),(this.scale.height-170)/Math.max(480,spreadY+360));this.cameras.main.setZoom(Math.max(.55,fit)).centerOn(center.x*TILE,center.y*TILE-30);this.draw();if(_time-this.lastUI>100){this.lastUI=_time;this.onTick();}
 }
 draw(){const s=this.sim,g=this.actors,f=this.effects;g.clear();f.clear();for(const l of [...this.labels,...this.workerLabels])l.setVisible(false);let label=0;
  const text=(x:number,y:number,str:string,color='#fff0c7',size=13)=>{let t=this.labels[label];if(!t){t=this.add.text(x,y,str,{fontFamily:'Arial, Microsoft YaHei, sans-serif',fontSize:size,color,stroke:'#182921',strokeThickness:3}).setOrigin(.5);this.labels.push(t);}t.setPosition(x,y).setText(str).setColor(color).setFontSize(size).setVisible(true);label++;};
  const view=this.cameras.main.worldView,visible=(p:{x:number;y:number},r=2)=>p.x*TILE>view.x-r*TILE&&p.x*TILE<view.right+r*TILE&&p.y*TILE>view.y-r*TILE&&p.y*TILE<view.bottom+r*TILE;
  for(const z of s.zones){if(!visible(z,8))continue;const x=z.x*TILE,y=z.y*TILE,r=z.radius*TILE;
   if(z.kind==='foam'){g.fillStyle(0x83d5ca,.18).fillCircle(x,y,r);g.lineStyle(2,0x98e0d5,.4).strokeCircle(x,y,r);for(let i=0;i<9;i++)g.lineStyle(1,0xc2ece2,.3).strokeCircle(x+Math.cos(i*2.4)*r*.65,y+Math.sin(i*2.4)*r*.65,9+i%3*4);}
   else if(z.kind==='charge'){const e=s.enemies.find(e=>e.id===z.owner);const ox=(e?.x??z.x)*TILE,oy=(e?.y??z.y)*TILE;g.lineStyle(36,0xf39b78,z.fired?.18:.22).lineBetween(ox,oy,ox+z.dx*6*TILE,oy+z.dy*6*TILE);g.lineStyle(2,0xffc7a7,.8).lineBetween(ox,oy,ox+z.dx*6*TILE,oy+z.dy*6*TILE);}
   else{const pulse=.12+Math.sin(s.time*14)*.045;g.fillStyle(z.fired?0xc56a52:0xe48468,pulse).fillCircle(x,y,r);g.lineStyle(2,0xffb192,.9).strokeCircle(x,y,r);if(!z.fired){const remaining=Math.max(0,z.start-s.time);text(x,y-10,remaining.toFixed(1)+'s','#ffc8a6',16);g.lineStyle(1,0xffc9ad,.5).lineBetween(x-r*.35,y-r*.35,x+r*.35,y+r*.35).lineBetween(x+r*.35,y-r*.35,x-r*.35,y+r*.35);}}
  }
  for(const b of s.batches)if(!b.done&&b.point&&s.time>=b.time-2){const p=b.point,x=p.x*TILE,y=p.y*TILE;g.lineStyle(2,0xdd8b76,.7).strokeCircle(x,y,TILE*(1+.2*Math.sin(s.time*8)));g.lineStyle(1,0xdd8b76,.3).strokeCircle(x,y,TILE*1.6);if(visible(p))text(x,y-48,'敌军集结','#edb19b',12);}
  const p=s.focused,px=p.x*TILE,py=p.y*TILE,cx=(Math.floor(p.x)+.5)*TILE,cy=(Math.floor(p.y)+.5)*TILE;
  if(s.state==='playing'){const occupied=s.atPlayer(p);g.fillStyle(occupied?0xe2c181:0xf2d69a,.055).fillRect(cx-21,cy-21,42,42);g.lineStyle(1.5,p.color,.8).strokeRect(cx-20,cy-20,40,40);
   const r=occupied?.range||TOWERS[p.selected].range;if(r){g.lineStyle(1,occupied?TOWERS[occupied.kind].color:TOWERS[p.selected].color,.17).strokeCircle(cx,cy,r*TILE);}
   if(Object.keys(s.buffs).length||s.active('overload'))for(const worker of s.alivePlayers())g.lineStyle(1,worker.color,.13).strokeCircle(worker.x*TILE,worker.y*TILE,5*TILE);
  }
  for(const d of s.drops){if(!visible(d))continue;const x=d.x*TILE,y=d.y*TILE,bob=Math.sin(s.time*3+d.id)*2;g.fillStyle(isActive(d.kind)?0xf1c96d:0x9fd5c8,.07).fillCircle(x,y,25);g.lineStyle(1,isActive(d.kind)?0xf1c96d:0x9fd5c8,.55).strokeCircle(x,y,15);g.fillStyle(isActive(d.kind)?0xd6a550:0x91c9b9).fillTriangle(x,y-11+bob,x-8,y+bob,x,y+10+bob).fillTriangle(x,y-11+bob,x+8,y+bob,x,y+10+bob);g.fillStyle(0xffe6a8).fillCircle(x-2,y-3+bob,2);}
  const pointer=this.input.activePointer,mouse=this.cameras.main.getWorldPoint(pointer.x,pointer.y);
  const hovered=this.input.manager.isOver? s.enemies.filter(e=>e.hp>0&&Math.hypot(e.x*TILE-mouse.x,e.y*TILE-12-mouse.y)<24).sort((a,b)=>distance(a,{x:mouse.x/TILE,y:mouse.y/TILE})-distance(b,{x:mouse.x/TILE,y:mouse.y/TILE}))[0]:undefined;
  if(hovered){const e=hovered,d=ENEMIES[e.kind],hit=s.canHit(e,p,p.id),color=hit?0xffa084:0xeac88d;
   g.lineStyle(2,color,.8).strokeCircle(e.x*TILE,e.y*TILE,(d.range+d.r+.25)*TILE);
   const target=s.target(e.target);if(target)g.lineStyle(2,0xffa084,.8).lineBetween(e.x*TILE,e.y*TILE,target.x*TILE,target.y*TILE);
   const reason=s.invincible?'玩家无敌':s.edgeDistance(e,p,p.id)>d.range?'所选玩家在射程外':!d.air&&!s.map.los(e,p)?'岩石遮挡':e.tauntUntil>s.time?'受到嘲讽':'所选玩家在射程内';
   const targetPlayer=s.playerForTarget(e.target),name=targetPlayer?`P${s.players.indexOf(targetPlayer)+1}`:e.target===-1?'无':TOWERS[s.buildings.find(t=>t.id===e.target)?.kind??'wall'].name;
   text(e.x*TILE,e.y*TILE-62,`${d.name} · 目标：${name}`,'#ffe3bd',12);
   text(e.x*TILE,e.y*TILE-45,`${reason} · 圆圈为对玩家攻击边界`,'#ffe3bd',11);
  }
  const entities:({type:'tower';v:Building}|{type:'enemy';v:Enemy}|{type:'player';v:Worker})[]=[...s.buildings.map(v=>({type:'tower' as const,v})),...s.enemies.filter(e=>visible(e)).map(v=>({type:'enemy' as const,v})),...s.players.map(v=>({type:'player' as const,v}))];entities.sort((a,b)=>(a.v.y+(a.type==='player'?.15:0))-(b.v.y+(b.type==='player'?.15:0)));
  for(const entity of entities){const v=entity.v;if(!visible(v))continue;if(entity.type==='tower'){this.tower(g,entity.v);const t=entity.v;if(t.hp<t.maxHp-.1||s.atPlayer()?.id===t.id||t.progress<1){this.bar(g,t.x*TILE-17,t.y*TILE-37,34,3,t.hp/t.maxHp,0x9fc5a2);if(t.progress<1)this.bar(g,t.x*TILE-17,t.y*TILE+24,34,3,t.progress,0xe6bb6e);}if(t.level>1)text(t.x*TILE,t.y*TILE+14,['','II','III','IV'][t.level-1],'#f4dcab',9);}
   else if(entity.type==='enemy'){this.enemy(g,entity.v);const e=entity.v,d=ENEMIES[e.kind];if(d.boss){this.bar(g,e.x*TILE-30,e.y*TILE-49,60,4,e.hp/e.maxHp,0xdc826f);text(e.x*TILE,e.y*TILE-62,d.name,'#e8b19b',11);}else if(e.hp<e.maxHp)this.bar(g,e.x*TILE-12,e.y*TILE-(d.air?43:22),24,2,e.hp/e.maxHp,0xc48b79);}
   else this.worker(g,entity.v,s.players.indexOf(entity.v));
  }
  for(const b of s.buildings){if(!visible(b))continue;if(b.shield>0&&b.shieldUntil>s.time){f.lineStyle(2,0x9adfe3,.7).strokeRoundedRect(b.x*TILE-21,b.y*TILE-32,42,52,10);this.bar(f,b.x*TILE-17,b.y*TILE-42,34,2,Math.min(1,b.shield/(b.maxHp*.3)),0x9adfe3);}}
  for(const b of s.enemies){if(!visible(b))continue;if(b.wind>s.time){const target=s.target(b.target);if(target){f.lineStyle(1,0xf0b3a3,.5).lineBetween(b.x*TILE,b.y*TILE,target.x*TILE,target.y*TILE);}}if(b.tauntUntil>s.time)text(b.x*TILE+12,b.y*TILE-25,'⚑','#ceb1f4',12);if(b.stunUntil>s.time)text(b.x*TILE,b.y*TILE-27,'✦','#fff0a2',15);}
  for(const b of s.projectiles){if(!visible(b))continue;const x=b.x*TILE,y=b.y*TILE;
   if(b.kind==='mortar'){const height=Math.sin(Math.min(1,b.age/b.life)*Math.PI)*40;f.fillStyle(0x0d1d16,.3).fillEllipse(x,y,9,4);f.fillStyle(0xf2bf75).fillCircle(x,y-height,4);f.fillStyle(0xffe3a1).fillCircle(x-1,y-height-1,2);}
   else{const e=s.enemies.find(e=>e.id===b.target);const tx=b.kind==='enemy'?b.tx:(e?.x??b.tx),ty=b.kind==='enemy'?b.ty:(e?.y??b.ty),angle=Math.atan2(ty-b.y,tx-b.x);f.lineStyle(b.kind==='ice'?3:2,b.kind==='enemy'?0xf6b3a0:b.kind==='ice'?0xa2eff7:0xf2d795,.9).lineBetween(x,y,x-Math.cos(angle)*12,y-Math.sin(angle)*12);}
  }
  for(const v of s.visuals){if(!visible(v,4))continue;const x=v.x*TILE,y=v.y*TILE,a=1-v.age/v.life;
   if(v.kind==='number')text(x,y-22-v.age*25,v.text||'',v.color===0xff968a?'#ffa49c':'#ffe09c',12);
   else if(v.kind==='ring'){f.lineStyle(2,v.color,a*.65).strokeCircle(x,y,v.size*TILE*(.4+v.age/v.life*.6));}
   else if(v.kind==='arc'){f.lineStyle(2,v.color,a).lineBetween(x,y,v.tx!*TILE,v.ty!*TILE);}
   else{f.fillStyle(v.color,a*.35).fillCircle(x,y,v.size*TILE*(.2+v.age/v.life*.8));for(let i=0;i<5;i++){const r=v.size*TILE*v.age/v.life;f.fillStyle(v.color,a).fillCircle(x+Math.cos(i*1.3)*r,y+Math.sin(i*1.3)*r,2);}}
  }
  for(const worker of s.players)if(worker.task){const t=s.buildings.find(b=>b.id===worker.task!.id);if(t){const wx=worker.x*TILE,wy=worker.y*TILE;f.lineStyle(2,worker.color,.8).lineBetween(wx,wy-7,t.x*TILE,t.y*TILE);text(wx,wy-49,worker.task.type==='build'?'施工 '+Math.floor(t.progress*100)+'%':'修复中','#f2d795',12);}}
 }
 bar(g:Phaser.GameObjects.Graphics,x:number,y:number,w:number,h:number,fraction:number,color:number){g.fillStyle(0x11231d,.9).fillRoundedRect(x-1,y-1,w+2,h+2,2);g.fillStyle(color).fillRect(x,y,w*Math.max(0,Math.min(1,fraction)),h);}
 tower(g:Phaser.GameObjects.Graphics,t:Building){const x=t.x*TILE,y=t.y*TILE,d=TOWERS[t.kind];g.fillStyle(0x10241b,.4).fillEllipse(x+2,y+15,39,15);
  if(t.progress<1){g.fillStyle(0x77664a).fillRect(x-15,y-12,30,29);g.lineStyle(3,0xb69a67).strokeRect(x-16,y-20,32,36).lineBetween(x-16,y-20,x+16,y+16).lineBetween(x+16,y-20,x-16,y+16);g.fillStyle(0xf1c86b,.8).fillRect(x-19,y-23,38,5);return;}
  g.fillStyle(0x6f7665).fillRoundedRect(x-18,y+3,36,17,3);g.fillStyle(0x959886).fillRect(x-16,y,32,8);
  if(t.kind==='wall'){g.lineStyle(6,0x66523c).lineBetween(x-15,y-14,x+15,y+10).lineBetween(x+15,y-14,x-15,y+10);g.lineStyle(3,0xbba47a).lineBetween(x-15,y-16,x+15,y+8).lineBetween(x+15,y-16,x-15,y+8);g.fillStyle(0xd2cfad).fillTriangle(x-18,y-23,x-11,y-17,x-15,y-10).fillTriangle(x+18,y-23,x+11,y-17,x+15,y-10);return;}
  if(t.kind==='arrow'){g.fillStyle(0x65543e).fillRect(x-11,y-16,22,27);g.fillStyle(0x998264).fillRect(x-10,y-18,6,27);g.fillStyle(0xbaa479).fillRect(x-18,y-21,36,10);g.fillStyle(0xddc697).fillRect(x-17,y-23,34,4);g.lineStyle(3,0x543f2a).lineBetween(x,y-35,x,y-15);g.lineStyle(3,d.color).lineBetween(x-13,y-31,x+13,y-24);g.lineStyle(1,0xedddb2).lineBetween(x-13,y-31,x+10,y-33).lineBetween(x+10,y-33,x+13,y-24);}
  if(t.kind==='mortar'){g.fillStyle(0x7d6954).fillCircle(x,y,15);g.fillStyle(0x474e48).fillRoundedRect(x-7,y-29,15,31,5);g.fillStyle(0x879181).fillEllipse(x+1,y-29,15,9);g.fillStyle(0x1c3026).fillEllipse(x+1,y-29,9,5);g.lineStyle(2,0xd8ac78).strokeCircle(x,y,15);}
  if(t.kind==='frost'){g.fillStyle(0x687e76).fillRect(x-10,y-14,20,25);g.fillStyle(0x99b6a7).fillTriangle(x-15,y-13,x,y-21,x+15,y-13);g.fillStyle(0x81c7d0).fillTriangle(x,y-44,x-10,y-28,x,y-15).fillTriangle(x,y-44,x+10,y-28,x,y-15);g.fillStyle(0xc9f4ee).fillTriangle(x,y-44,x-10,y-28,x,y-26);}
  if(t.kind==='taunt'){g.fillStyle(0x6f645b).fillRect(x-11,y-19,22,30);g.fillStyle(0x9b8b7e).fillRect(x-14,y-21,28,6);g.lineStyle(3,0xd7c49c).lineBetween(x,y-19,x,y-47);g.fillStyle(0xb99bd1).fillTriangle(x+1,y-46,x+21,y-39,x+1,y-29);g.fillStyle(0xdec7ed).fillCircle(x+7,y-38,2);}
 }
 enemy(g:Phaser.GameObjects.Graphics,e:Enemy){const d=ENEMIES[e.kind],x=e.x*TILE,y=e.y*TILE,scale=d.boss?1.65:1,bob=Math.sin(this.sim.time*9+e.id)*1.1;g.fillStyle(0x102018,.4).fillEllipse(x,y+9,22*scale,10*scale);const color=e.flash>this.sim.time?0xf5d7b4:d.color;
  if(d.air){const lift=19+bob,wing=Math.sin(this.sim.time*13+e.id)*4;g.fillStyle(0x102018,.28).fillEllipse(x,y+11,25,9);g.lineStyle(1,0x9fd7d2,.28).lineBetween(x,y+5,x,y-lift+8);g.fillStyle(color,.86).fillTriangle(x-3,y-lift,x-20,y-lift-7-wing,x-9,y-lift+7).fillTriangle(x+3,y-lift,x+20,y-lift-7-wing,x+9,y-lift+7);g.fillStyle(0x45676a).fillEllipse(x,y-lift,14,19);g.fillStyle(0xcbbba0).fillCircle(x,y-lift-9,4);g.fillStyle(0x314b50).fillTriangle(x-5,y-lift-10,x-2,y-lift-17,x,y-lift-10).fillTriangle(x,y-lift-10,x+3,y-lift-17,x+5,y-lift-10);if(e.slowUntil>this.sim.time)g.lineStyle(1,0xa0d9e1,.6).strokeEllipse(x,y-lift+8,28,9);return;}
  if(d.cavalry){g.fillStyle(0x53483d).fillEllipse(x,y+4,28*scale,14*scale);g.lineStyle(3,0x443e34).lineBetween(x-9*scale,y+4,x-12*scale,y+14).lineBetween(x+8*scale,y+5,x+10*scale,y+13);g.fillStyle(0x806950).fillEllipse(x+12*scale,y,9*scale,15*scale);}
  g.fillStyle(color).fillRoundedRect(x-7*scale,y-6*scale+bob,14*scale,17*scale,3);g.fillStyle(0xccbda3).fillCircle(x,y-10*scale+bob,5*scale);g.fillStyle(d.boss?0x4a4246:0x586259).fillEllipse(x,y-13*scale+bob,13*scale,8*scale);
  if(e.kind==='heavy'||d.boss){g.fillStyle(0x596260).fillRoundedRect(x-13*scale,y-2*scale,9*scale,16*scale,2);g.lineStyle(1,0xb7b8a5).strokeRoundedRect(x-13*scale,y-2*scale,9*scale,16*scale,2);}
  g.lineStyle(2,d.boss?0xe8b789:0xa8a898).lineBetween(x+9*scale,y+5*scale,x+15*scale,y-13*scale);if(e.kind==='archer'||e.kind==='boss2')g.lineStyle(2,0xb98e60).strokeEllipse(x+10*scale,y,10*scale,23*scale);
  if(d.boss){g.fillStyle(0xe4b785).fillTriangle(x-8,y-25,x-5,y-34,x-1,y-24).fillTriangle(x+2,y-24,x+6,y-34,x+9,y-24);}
  if(e.slowUntil>this.sim.time){g.lineStyle(1,0xa0d9e1,.6).strokeEllipse(x,y+11,24*scale,9*scale);}
 }
 worker(g:Phaser.GameObjects.Graphics,p:Worker,index:number){const s=this.sim,x=p.x*TILE,y=p.y*TILE,bob=p.input.x||p.input.y?Math.sin(s.time*14)*1.7:0;g.fillStyle(0x091e17,.45).fillEllipse(x+2,y+13,26,12);
  if(s.invincible)g.lineStyle(2,0xf9e6b2,.7+Math.sin(s.time*8)*.2).strokeCircle(x,y-3,24);
  const flash=p.hurtUntil>s.time,body=p.hp>0?p.color:0x625f58;g.fillStyle(0x314f58).fillRect(x-8,y+4,6,11).fillRect(x+2,y+4,6,11);g.fillStyle(flash?0xffc1ad:body).fillRoundedRect(x-10,y-10+bob,20,20,4);g.fillStyle(0x3f7772).fillRect(x-5,y-9+bob,10,18);g.lineStyle(2,0xd9b980).lineBetween(x-4,y-8,x-4,y+8).lineBetween(x+4,y-8,x+4,y+8);g.fillStyle(0xe1b68b).fillCircle(x,y-16+bob,7);g.fillStyle(body).fillRoundedRect(x-10,y-26+bob,20,12,6).fillRect(x-13,y-17+bob,26,4);g.fillStyle(0xffedb0).fillRect(x-2,y-27+bob,4,12);
  const swing=p.task?Math.sin(s.time*18)*8:0;g.lineStyle(3,0xb6a080).lineBetween(x+10,y+2,x+19,y-9+swing);g.fillStyle(0xb9c5b2).fillRoundedRect(x+14,y-15+swing,13,6,2);g.fillStyle(0xe8d5ae).fillCircle(x+10,y,3);g.fillStyle(0x16271f,.82).fillRoundedRect(x-13,y-43,26,12,3);g.lineStyle(1,p.color,.8).strokeRoundedRect(x-13,y-43,26,12,3);this.labelWorker(x,y-37,index);
 }
 labelWorker(x:number,y:number,index:number){let t=this.workerLabels[index];if(!t){t=this.add.text(x,y,`P${index+1}`,{fontFamily:'Arial',fontSize:9,color:'#fff3d2',stroke:'#182921',strokeThickness:2}).setOrigin(.5);this.workerLabels[index]=t;}t.setPosition(x,y).setVisible(true);}
}

