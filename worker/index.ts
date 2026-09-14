import {DurableObject} from 'cloudflare:workers';

interface Env{ROOMS:DurableObjectNamespace<GameRoom>}
interface Member{accountId:string;name:string;slot:number;host:boolean;replaced?:boolean}

const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','access-control-allow-origin':'*'}});

export default {
 async fetch(request:Request,env:Env):Promise<Response>{
  const url=new URL(request.url);
  if(url.pathname==='/health')return json({ok:true,service:'siege-worker-realtime'});
  const match=url.pathname.match(/^\/rooms\/([A-Z2-9]{6})$/);
  if(match&&request.headers.get('Upgrade')?.toLowerCase()==='websocket')return env.ROOMS.getByName(match[1]).fetch(request);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET,OPTIONS','access-control-allow-headers':'content-type'}});
  return json({error:'not_found'},404);
 }
};

export class GameRoom extends DurableObject<Env>{
 constructor(ctx:DurableObjectState,env:Env){super(ctx,env);}

 private sockets(){return this.ctx.getWebSockets().map(ws=>({ws,member:ws.deserializeAttachment() as Member})).filter(v=>v.member&&!v.member.replaced);}
 private send(ws:WebSocket,data:unknown){try{ws.send(JSON.stringify(data));}catch{} }
 private broadcast(data:unknown,except?:WebSocket){for(const {ws} of this.sockets())if(ws!==except)this.send(ws,data);}
 private roster(){return this.sockets().map(({member})=>member).sort((a,b)=>a.slot-b.slot);}
 private host(){return this.sockets().find(v=>v.member.host)?.ws;}

 async fetch(request:Request):Promise<Response>{
  if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return json({error:'upgrade_required'},426);
  const url=new URL(request.url),accountId=(url.searchParams.get('account')||'').slice(0,80),name=(url.searchParams.get('name')||'工匠').trim().slice(0,16);
  if(!/^[a-zA-Z0-9_-]{8,80}$/.test(accountId))return json({error:'invalid_account'},400);
  const existing=this.sockets();
  const intent=url.searchParams.get('intent');if(!existing.length&&intent!=='create')return json({error:'room_not_found'},404);if(existing.length&&intent==='create')return json({error:'room_exists'},409);
  for(const old of existing)if(old.member.accountId===accountId){old.ws.serializeAttachment({...old.member,replaced:true});old.ws.close(4000,'账号已在新设备连接');}
  const occupied=new Set(existing.filter(v=>v.member.accountId!==accountId).map(v=>v.member.slot));
  const slot=[0,1,2].find(n=>!occupied.has(n));
  if(slot===undefined)return json({error:'room_full'},409);
  if(slot===0&&existing.some(v=>v.member.host))return json({error:'host_slot_unavailable'},409);
  const pair=new WebSocketPair(),client=pair[0],server=pair[1],member:Member={accountId,name:name||'工匠',slot,host:slot===0};
  server.serializeAttachment(member);this.ctx.acceptWebSocket(server);
  this.send(server,{type:'welcome',member,roster:[...this.roster(),member].filter((v,i,a)=>a.findIndex(x=>x.accountId===v.accountId)===i)});
  this.broadcast({type:'member_joined',member,roster:this.roster()},server);
  return new Response(null,{status:101,webSocket:client});
 }

 webSocketMessage(ws:WebSocket,message:string|ArrayBuffer){
  if(typeof message!=='string'||message.length>4_000_000)return;
  let data:any;try{data=JSON.parse(message);}catch{return;}
  const member=ws.deserializeAttachment() as Member;if(!member||member.replaced)return;
  if(member.host){
   if(data.type==='state')this.broadcast({type:'state',state:data.state},ws);
   else if(data.type==='notice')this.broadcast({type:'notice',text:String(data.text||'').slice(0,100)},ws);
  }else if(['input','command','select','resync'].includes(data.type)){
   const host=this.host();if(host)this.send(host,{...data,slot:member.slot,accountId:member.accountId});
  }
 }

 webSocketClose(ws:WebSocket){this.leave(ws);}
 webSocketError(ws:WebSocket){this.leave(ws);}
 private leave(ws:WebSocket){
  const member=ws.deserializeAttachment() as Member;if(!member||member.replaced)return;
  if(member.host){for(const peer of this.ctx.getWebSockets())if(peer!==ws)peer.close(4001,'房主已离开');}
  else{const host=this.host();if(host)this.send(host,{type:'member_left',slot:member.slot,accountId:member.accountId});this.broadcast({type:'member_left',slot:member.slot,accountId:member.accountId,roster:this.roster().filter(v=>v.accountId!==member.accountId)},ws);}
 }
}
