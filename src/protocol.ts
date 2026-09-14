import {SIZE} from './data';

const COMMANDS=new Set(['build','repair','upgrade','pickup','cancel','active0','active1','exchange:0','exchange:1']);
const STATES=new Set(['menu','playing','won','lost']);

type Point={x:number;y:number};

const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const finite=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value);
const array=(value:unknown,max:number):value is unknown[]=>Array.isArray(value)&&value.length<=max;
const point=(value:unknown):value is Point=>{
 if(!object(value))return false;
 const x=value.x,y=value.y;
 return finite(x)&&finite(y)&&x>=-4&&x<=SIZE+4&&y>=-4&&y<=SIZE+4;
};

export function validInput(value:unknown):value is Point{
 if(!point(value))return false;
 const {x,y}=value;return Math.abs(x)<=1&&Math.abs(y)<=1&&Math.hypot(x,y)<=Math.SQRT2+.001;
}

export function validCommand(value:unknown):value is string{return typeof value==='string'&&COMMANDS.has(value);}
export function validSelect(value:unknown):value is number{return Number.isInteger(value)&&Number(value)>=0&&Number(value)<=4;}

export function validNetworkState(value:unknown,requiredPlayers=1,lastTime?:number):value is Record<string,unknown>{
 if(!object(value)||!finite(value.time)||value.time< -10.01||value.time>3600||!STATES.has(String(value.state)))return false;
 if(lastTime!==undefined&&value.time<lastTime-1)return false;
 if(!Number.isInteger(value.playerCount)||Number(value.playerCount)<requiredPlayers||Number(value.playerCount)>3)return false;
 const players=value.players;if(!array(players,3)||players.length!==value.playerCount||!players.every(point))return false;
 const limits:[string,number,boolean][]=[['buildings',32,true],['enemies',3000,true],['projectiles',6000,true],['zones',256,true],['drops',128,true],['visuals',1200,true],['batches',128,false],['messages',32,false],['gear',2,false]];
 for(const [key,max,hasPoint] of limits){const list=value[key];if(!array(list,max)||(hasPoint&&!list.every(point)))return false;}
 return finite(value.wave)&&value.wave>=0&&value.wave<=20&&finite(value.waveInterval)&&value.waveInterval>=20&&value.waveInterval<=60;
}
