import {SIZE} from './data';
import {CELL_CODE,CELL_EFFECTS,FIXED_MAP_ROWS,FIXED_VARIANT_ROWS,type CellEffect} from './map-layout';
export interface Point{x:number;y:number}
export const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
export const cell=(p:Point)=>Math.floor(p.y)*SIZE+Math.floor(p.x);
export const center=(i:number)=>({x:i%SIZE+.5,y:Math.floor(i/SIZE)+.5});
export function random(seed:number){return ()=>{seed|=0;seed=seed+0x6d2b79f5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
export class WorldMap{
 tiles=new Uint8Array(SIZE*SIZE); // 0 meadow, 1 stone, 2 water, 3 mud, 4 cliff face
 elevation=new Uint8Array(SIZE*SIZE); // 0 lowland, 1 highland
 ramps=new Uint8Array(SIZE*SIZE); // paired high/low cells form a passable slope
 variants=new Uint8Array(SIZE*SIZE); // fixed art variant 0..3 for every cell
 effects:CellEffect[]=[];
 constructor(){
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const id=y*SIZE+x,decoded=CELL_CODE[FIXED_MAP_ROWS[y][x]];
   if(!decoded)throw new Error(`Unknown fixed map cell at ${x},${y}`);
   this.tiles[id]=decoded.terrain;this.elevation[id]=decoded.elevation;this.ramps[id]=decoded.ramp;this.variants[id]=Number(FIXED_VARIANT_ROWS[y][x]);this.effects[id]=CELL_EFFECTS[decoded.effect];
  }
 }
 terrain(x:number,y:number){if(x<0||y<0||x>=SIZE||y>=SIZE)return 1;return this.tiles[Math.floor(y)*SIZE+Math.floor(x)];}
 effectAt(x:number,y:number){if(x<0||y<0||x>=SIZE||y>=SIZE)return CELL_EFFECTS.stone;return this.effects[Math.floor(y)*SIZE+Math.floor(x)];}
 elevationAt(x:number,y:number){if(x<0||y<0||x>=SIZE||y>=SIZE)return 0;return this.elevation[Math.floor(y)*SIZE+Math.floor(x)];}
 rampAt(x:number,y:number){if(x<0||y<0||x>=SIZE||y>=SIZE)return false;return !!this.ramps[Math.floor(y)*SIZE+Math.floor(x)];}
 blockedTerrain(x:number,y:number){return this.effectAt(x,y).blocksGround;}
 isBuildable(x:number,y:number){return this.effectAt(x,y).buildable;}
 moveFactor(x:number,y:number){return this.effectAt(x,y).moveFactor;}
 canFly(x:number,y:number,r=.25){return x-r>=1&&y-r>=1&&x+r<SIZE-1&&y+r<SIZE-1&&[[-r,-r],[r,-r],[-r,r],[r,r],[0,0]].every(([dx,dy])=>this.effectAt(x+dx,y+dy).airPassable);}
 canStand(x:number,y:number,r=.25,blocked?:Set<number>){
  // Touching an obstacle edge is valid; sample just inside the circular footprint
  // so a one-cell-wide unit can pass through a one-cell-wide ramp.
  const sampleRadius=Math.max(0,r-1e-4);
  const baseElevation=this.elevationAt(x,y),baseRamp=this.rampAt(x,y);
  for(const [dx,dy] of [[-sampleRadius,-sampleRadius],[sampleRadius,-sampleRadius],[-sampleRadius,sampleRadius],[sampleRadius,sampleRadius],[0,0]]){
   const sx=x+dx,sy=y+dy;
   if(this.blockedTerrain(sx,sy)||blocked?.has(cell({x:sx,y:sy})))return false;
   if(this.elevationAt(sx,sy)!==baseElevation&&!baseRamp&&!this.rampAt(sx,sy))return false;
  }
  return true;
 }
 los(a:Point,b:Point){const n=Math.ceil(distance(a,b)*6);for(let i=1;i<n;i++)if(this.effectAt(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n).blocksSight)return false;return true;}
}
// One shared flow field per target, computed from attack-adjacent tiles. No enemy-per-frame A*.
export function flow(map:WorldMap,target:Point,blocked:Set<number>,breakCost?:Map<number,number>,clearance=.25,air=false){
 const dist=new Float32Array(SIZE*SIZE);dist.fill(Infinity);
 const heap:[number,number][]=[];
 const push=(id:number,d:number)=>{heap.push([id,d]);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p][1]<=d)break;heap[i]=heap[p];i=p;}heap[i]=[id,d];};
 const pop=()=>{const top=heap[0],last=heap.pop()!;if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&heap[j+1][1]<heap[j][1])j++;if(heap[j][1]>=last[1])break;heap[i]=heap[j];i=j;}heap[i]=last;}return top;};
 const id=cell(target);dist[id]=0;push(id,0);
 while(heap.length){const [at,d]=pop();if(d!==dist[at])continue;const x=at%SIZE,y=Math.floor(at/SIZE);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=SIZE||ny>=SIZE)continue;const ni=ny*SIZE+nx,effect=map.effects[ni];
   if(!air&&effect.blocksGround)continue;
   if(!air&&map.elevation[at]!==map.elevation[ni]&&!map.ramps[at]&&!map.ramps[ni])continue;
   if(!air&&blocked.has(ni)&&ni!==id&&!breakCost)continue;
   if(!air&&clearance>=.5&&ni!==id&&!map.canStand(nx+.5,ny+.5,clearance))continue;
   const nd=Math.fround(d+1+(!air?(1/effect.moveFactor-1):0)+(air?0:(breakCost?.get(ni)||0)));if(nd<dist[ni]){dist[ni]=nd;push(ni,nd);}}
 }
 return dist;
}
