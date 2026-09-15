import type {Point} from './map';

export type Facing='down'|'right'|'up'|'left';

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
