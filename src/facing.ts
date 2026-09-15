import type {Point} from './map';

export type Facing='down'|'right'|'up'|'left';

const DIRECTION_OFFSET:Record<Facing,number>={down:0,right:2,up:4,left:6};

export function facingFromInput(input:Point,previous:Facing='down'):Facing{
 const ax=Math.abs(input.x),ay=Math.abs(input.y);
 if(ax<.001&&ay<.001)return previous;
 if(ax>ay)return input.x>0?'right':'left';
 return input.y>0?'down':'up';
}

export function walkingFrame(time:number,input:Point):0|1{
 if(Math.abs(input.x)<.001&&Math.abs(input.y)<.001)return 0;
 return ((Math.floor(time*7)%2+2)%2) as 0|1;
}

export function directionFrame(facing:Facing,step:0|1):number{
 return DIRECTION_OFFSET[facing]+step;
}

export function loopFrame(time:number,fps:number,count:number):number{
 return ((Math.floor(time*fps)%count)+count)%count;
}

export function enemyAttackFrame(time:number,next:number,hitAt:number,wind:number,interval:number):number|null{
 if(!Number.isFinite(next)){
  if(hitAt<=time)return null;
  const progress=Math.max(0,(time-(hitAt-wind))/Math.max(.001,wind));
  return Math.min(2,Math.floor(progress*3));
 }
 if(next<=time)return null;
 const start=hitAt>time?hitAt-wind:next-interval,hit=hitAt>time?hitAt:start+wind,end=Math.max(next,hit+.001);
 if(time<start||time>=end)return null;
 if(time<hit)return Math.min(2,Math.floor((time-start)/Math.max(.001,hit-start)*3));
 return 3+Math.min(2,Math.floor((time-hit)/Math.max(.001,end-hit)*3));
}
