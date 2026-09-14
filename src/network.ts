import type {NetworkState,Simulation} from './sim';

export interface Account{id:string;name:string}
export interface RoomMember{accountId:string;name:string;slot:number;host:boolean}
type RoomEvent=
 | {type:'welcome';member:RoomMember;roster:RoomMember[]}
 | {type:'member_joined';member:RoomMember;roster:RoomMember[]}
 | {type:'member_left';slot:number;accountId:string;roster?:RoomMember[]}
 | {type:'state';state:NetworkState}
 | {type:'input';slot:number;input:{x:number;y:number}}
 | {type:'command';slot:number;action:string}
 | {type:'select';slot:number;index:number}
 | {type:'resync';slot:number}
 | {type:'notice';text:string}
 | {type:'error';code:string};

const DEFAULT_ENDPOINT='wss://siege-worker-realtime.yexiaoting-onemt.workers.dev';
export const REALTIME_ENDPOINT=(import.meta.env.VITE_REALTIME_URL||DEFAULT_ENDPOINT).replace(/\/$/,'');

export function loadAccount():Account{
 let id=localStorage.getItem('siege-account-id');
 if(!id){id=`acct_${crypto.randomUUID().replaceAll('-','')}`;localStorage.setItem('siege-account-id',id);}
 return{id,name:localStorage.getItem('siege-account-name')||`工匠${id.slice(-4).toUpperCase()}`};
}
export function saveAccountName(name:string){localStorage.setItem('siege-account-name',(name.trim()||'工匠').slice(0,16));}
export function roomCode(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',bytes=crypto.getRandomValues(new Uint8Array(6));return Array.from(bytes,n=>alphabet[n%alphabet.length]).join('');}

export class OnlineRoom{
 ws:WebSocket;member?:RoomMember;roster:RoomMember[]=[];connected=false;lastState=0;lastInput='';snapshots=0;correction=0;rejections=0;
 constructor(public code:string,public account:Account,intent:'create'|'join',private events:{onWelcome:(member:RoomMember)=>void;onJoin:(member:RoomMember)=>void;onLeave:(slot:number)=>void;onState:(state:NetworkState)=>void;onInput:(slot:number,input:{x:number;y:number})=>void;onCommand:(slot:number,action:string)=>void;onSelect:(slot:number,index:number)=>void;onStatus:(text:string,bad?:boolean)=>void}){
  const url=`${REALTIME_ENDPOINT}/rooms/${code}?account=${encodeURIComponent(account.id)}&name=${encodeURIComponent(account.name)}&intent=${intent}`;
  this.ws=new WebSocket(url);this.ws.addEventListener('open',()=>{this.connected=true;events.onStatus('已连接联机服务器');});
  this.ws.addEventListener('message',e=>this.receive(JSON.parse(String(e.data)) as RoomEvent));
  this.ws.addEventListener('close',e=>{this.connected=false;events.onStatus(e.code===4001?'房主已离开，房间结束':'与房间断开连接',true);});
  this.ws.addEventListener('error',()=>events.onStatus('无法连接联机服务器',true));
 }
 get host(){return !!this.member?.host;}get slot(){return this.member?.slot??0;}
 private receive(event:RoomEvent){
  if(event.type==='welcome'){this.member=event.member;this.roster=event.roster;this.events.onWelcome(event.member);if(!event.member.host)this.send({type:'resync'});}
  else if(event.type==='member_joined'){this.roster=event.roster;this.events.onJoin(event.member);}
  else if(event.type==='member_left'){this.roster=event.roster||this.roster.filter(m=>m.accountId!==event.accountId);this.events.onLeave(event.slot);}
  else if(event.type==='state'){this.snapshots++;this.events.onState(event.state);}
  else if(event.type==='input')this.events.onInput(event.slot,event.input);
  else if(event.type==='command')this.events.onCommand(event.slot,event.action);
  else if(event.type==='select')this.events.onSelect(event.slot,event.index);
  else if(event.type==='resync')this.lastState=0;
  else if(event.type==='notice')this.events.onStatus(event.text);
  else if(event.type==='error'){this.rejections++;this.events.onStatus(`服务器拒绝了非法联机消息：${event.code}`,true);}
 }
 send(data:unknown){if(this.ws.readyState===WebSocket.OPEN)this.ws.send(JSON.stringify(data));}
 sendInput(input:{x:number;y:number}){const key=`${input.x},${input.y}`;if(key!==this.lastInput){this.lastInput=key;this.send({type:'input',input});}}
 sendCommand(action:string){this.send({type:'command',action});}
 sendSelect(index:number){this.send({type:'select',index});}
 pump(sim:Simulation,force=false){if(!this.host||!this.connected)return;const now=performance.now(),interval=sim.enemies.length>250?333:125;if(force||now-this.lastState>=interval){this.lastState=now;this.send({type:'state',state:sim.networkState(true)});}}
 close(){this.ws.close(1000,'离开房间');}
}
