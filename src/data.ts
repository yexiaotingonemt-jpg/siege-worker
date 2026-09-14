export const SIZE=64, TILE=42, REPAIR_SPEED=.5, REPAIR_COST=.5;
export type TowerKind='arrow'|'wall'|'mortar'|'frost'|'taunt';
export const TOWERS:Record<TowerKind,{name:string;icon:string;color:number;cost:number;work:number;hp:number;armor:number;attack:number;interval:number;range:number;unlock:number;skill:number;desc:string}>={
 arrow:{name:'箭塔',icon:'➶',color:0xe5bd75,cost:40,work:3,hp:180,armor:5,attack:18,interval:.8,range:6,unlock:1,skill:8,desc:'稳定单体火力 · 周期穿甲'},
 wall:{name:'拒马',icon:'╳',color:0xb9a28b,cost:20,work:1.5,hp:300,armor:15,attack:0,interval:0,range:0,unlock:1,skill:6,desc:'坚固路障 · 周围绊索减速'},
 mortar:{name:'迫击炮',icon:'◉',color:0xea926d,cost:75,work:5,hp:160,armor:0,attack:42,interval:2.4,range:8,unlock:3,skill:10,desc:'范围轰炸 · 震荡炮弹眩晕'},
 frost:{name:'寒霜塔',icon:'❄',color:0x92d6dc,cost:65,work:4,hp:180,armor:5,attack:8,interval:1.2,range:5,unlock:5,skill:7,desc:'单体冰箭 · 范围脉冲减速'},
 taunt:{name:'嘲讽塔',icon:'⚑',color:0xc4a1ed,cost:60,work:3.5,hp:420,armor:20,attack:0,interval:0,range:0,unlock:7,skill:8,desc:'高生命掩护 · 警报吸引敌人'}
};
export const KEYS=Object.keys(TOWERS) as TowerKind[];
export const HP_SCALE=[1,1.45,2,2.7], DMG_SCALE=[1,1.55,2.25,3.1], UPGRADE=[0,.8,1.2,1.8];
export const XP=[0,40,110,220,380,600,900,1300,1800,2400,3100,3900];
export type EnemyKind='infantry'|'heavy'|'archer'|'cavalry'|'air'|'boss1'|'boss2'|'boss3'|'boss4';
export const ENEMIES:Record<EnemyKind,{name:string;hp:number;armor:number;speed:number;attack:number;interval:number;range:number;wind:number;r:number;gold:number;xp:number;boss?:boolean;cavalry?:boolean;air?:boolean;color:number}>={
 infantry:{name:'步兵',hp:45,armor:0,speed:2.1,attack:10,interval:1.2,range:.65,wind:.3,r:.25,gold:4,xp:4,color:0xbb6663},
 heavy:{name:'重装兵',hp:160,armor:30,speed:1.4,attack:16,interval:1.6,range:.65,wind:.55,r:.38,gold:9,xp:10,color:0x9d8b91},
 archer:{name:'弓箭手',hp:55,armor:0,speed:1.8,attack:8,interval:1.8,range:5,wind:.5,r:.25,gold:6,xp:7,color:0xcc907a},
 cavalry:{name:'骑兵',hp:85,armor:10,speed:3.8,attack:12,interval:1.4,range:.75,wind:.35,r:.32,gold:7,xp:8,cavalry:true,color:0xc99261},
 air:{name:'飞翼掠夺者',hp:70,armor:5,speed:2.7,attack:9,interval:1.5,range:.75,wind:.4,r:.28,gold:6,xp:7,air:true,color:0x8ab6b8},
 boss1:{name:'破城先锋',hp:1600,armor:15,speed:1.6,attack:24,interval:1.8,range:.9,wind:.6,r:.5,gold:80,xp:100,boss:true,color:0xea7861},
 boss2:{name:'猎人工长',hp:2800,armor:10,speed:1.8,attack:18,interval:1.8,range:6,wind:.65,r:.45,gold:100,xp:140,boss:true,color:0xdb9974},
 boss3:{name:'铁骑统领',hp:4200,armor:25,speed:2,attack:30,interval:1.6,range:1,wind:.45,r:.5,gold:120,xp:180,boss:true,cavalry:true,color:0xb790d3},
 boss4:{name:'围城领主',hp:6500,armor:30,speed:1.7,attack:36,interval:1.6,range:1,wind:.6,r:.6,gold:150,xp:220,boss:true,color:0xf09663}
};
export const WAVES=[ [8,0,0,0,0],[12,0,0,0,0],[14,2,0,0,0],[16,2,3,0,0],[12,2,2,0,0], [17,3,4,0,3],[18,3,4,4,4],[19,4,6,4,5],[22,5,6,6,6],[14,4,6,4,4], [23,6,8,6,7],[24,6,10,8,8],[27,8,10,8,9],[28,8,12,10,10],[18,6,8,8,6], [29,10,12,10,11],[32,10,14,12,12],[35,12,14,14,13],[38,12,16,16,14],[21,8,10,10,9] ];
export const NORMAL:EnemyKind[]=['infantry','heavy','archer','cavalry','air'];
export const ACTIVES={build:{name:'疾建手套',icon:'⚒',duration:8,cd:45,desc:'8秒内建造速度×2'},repair:{name:'抢修扳手',icon:'⚙',duration:6,cd:45,desc:'6秒内修复速度×2'},invincible:{name:'庇护安全帽',icon:'◈',duration:4,cd:60,desc:'4秒无敌、不可索敌；无目标敌人停步'},shield:{name:'防爆工具箱',icon:'⬡',duration:6,cd:45,desc:'4格内建筑与工地获得30%生命护盾，6秒'},alarm:{name:'紧急警报器',icon:'⚑',duration:3,cd:40,desc:'脚下完工建筑嘲讽4格内敌人，3秒'},foam:{name:'速凝泡沫罐',icon:'◌',duration:5,cd:35,desc:'留下3格泡沫区，5秒内减速50%'},overload:{name:'超载发电机',icon:'ϟ',duration:6,cd:50,desc:'6秒内周围5格建筑普攻速度+60%'},instant:{name:'应急支撑架',icon:'✚',duration:0,cd:35,desc:'立即修复脚下建筑35%生命，支付正常费用'},boots:{name:'动力工作靴',icon:'➤',duration:4,cd:30,desc:'4秒内移动速度+60%'}};
export type ActiveKind=keyof typeof ACTIVES;
export const BUFFS={power:{name:'火力祝福',icon:'⚔',desc:'5格内建筑攻击+25%'},armor:{name:'加固祝福',icon:'⬡',desc:'5格内建筑护甲+15'},haste:{name:'速射祝福',icon:'ϟ',desc:'5格内建筑攻速+20%'},range:{name:'远望祝福',icon:'◎',desc:'5格内建筑普攻射程+1'},pierce:{name:'破甲祝福',icon:'➶',desc:'5格内建筑穿甲+20%'},crit:{name:'精准祝福',icon:'✦',desc:'5格内建筑普攻15%概率造成175%伤害'},life:{name:'坚基祝福',icon:'♥',desc:'5格内建筑最大生命+25%，保持生命比例'},resonance:{name:'共鸣祝福',icon:'❖',desc:'5格内建筑技能冷却缩短15%'},hunter:{name:'猎骑祝福',icon:'♞',desc:'5格内建筑对骑兵伤害+35%'},boss:{name:'攻坚祝福',icon:'♜',desc:'5格内建筑对BOSS伤害+25%'},overflow:{name:'余势祝福',icon:'↗',desc:'单体普攻击杀，50%溢出传递至2格内另一敌人'}};
export type BuffKind=keyof typeof BUFFS;
export type RewardKind=ActiveKind|BuffKind;
export const isActive=(k:string):k is ActiveKind=>k in ACTIVES;
