import {SIZE} from './data';
export interface Point{x:number;y:number}
export const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
export const cell=(p:Point)=>Math.floor(p.y)*SIZE+Math.floor(p.x);
export const center=(i:number)=>({x:i%SIZE+.5,y:Math.floor(i/SIZE)+.5});
export function random(seed:number){return ()=>{seed|=0;seed=seed+0x6d2b79f5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
export class WorldMap{
 tiles=new Uint8Array(SIZE*SIZE); // 0 meadow, 1 stone, 2 water, 3 mud, 4 cliff face
 elevation=new Uint8Array(SIZE*SIZE); // 0 lowland, 1 highland
 ramps=new Uint8Array(SIZE*SIZE); // paired high/low cells form a passable slope
 constructor(){
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
   if(x===0||y===0||x===SIZE-1||y===SIZE-1)this.tiles[y*SIZE+x]=1;
   const river=7+Math.round(Math.sin(y*.28));
   if(x>=river&&x<=river+1&&y>2&&y<SIZE-3&&![5,6,7,14,15,16,17,18,25,26,27].includes(y))this.tiles[y*SIZE+x]=2;
  }
  const paint=(type:number,rects:number[][])=>{for(const [cx,cy,w,h] of rects)for(let y=cy;y<cy+h;y++)for(let x=cx;x<cx+w;x++)if(x>0&&y>0&&x<SIZE-1&&y<SIZE-1&&this.tiles[y*SIZE+x]===0)this.tiles[y*SIZE+x]=type;};
  // Compact broken ridges preserve several routes while removing the old long empty approaches.
  paint(1,[[3,4,2,3],[12,3,3,2],[21,4,3,2],[27,8,2,3],[26,14,3,2],[25,19,3,2],[21,27,3,2],[14,27,3,2],[3,23,3,2],[3,14,2,3],[10,18,3,2],[20,18,2,3],[11,12,2,2],[20,12,2,2],[11,22,3,2],[18,25,2,2]]);
  paint(2,[[4,9,3,2],[9,7,3,2],[23,6,3,2],[24,16,3,2],[4,19,3,2],[14,23,3,2],[25,24,3,2]]);
  paint(3,[[9,5,4,2],[18,6,3,3],[23,10,3,2],[4,12,3,2],[9,15,3,2],[21,16,3,2],[8,20,4,2],[15,21,3,2],[21,23,3,3],[4,27,4,2]]);
  const raise=(rects:number[][])=>{for(const [cx,cy,w,h] of rects)for(let y=cy;y<cy+h;y++)for(let x=cx;x<cx+w;x++)if(x>0&&y>0&&x<SIZE-1&&y<SIZE-1)this.elevation[y*SIZE+x]=1;};
  raise([[10,5,8,7],[21,8,7,7],[5,21,8,7],[20,21,8,7]]);
  const rampPairs=[[13,11,13,12],[17,8,18,8],[21,11,20,11],[24,14,24,15],[8,21,8,20],[12,24,13,24],[23,21,23,20],[20,24,19,24]];
  for(const [hx,hy,lx,ly] of rampPairs){for(const [x,y] of [[hx,hy],[lx,ly]]){this.ramps[y*SIZE+x]=1;this.tiles[y*SIZE+x]=0;}}
  // Raised boundary cells are real cliff faces. Ramp mouths are the only passable breaks in the ring.
  for(let y=1;y<SIZE-1;y++)for(let x=1;x<SIZE-1;x++){const id=y*SIZE+x;if(!this.elevation[id]||this.ramps[id])continue;
   if(!this.elevation[id-1]||!this.elevation[id+1]||!this.elevation[id-SIZE]||!this.elevation[id+SIZE])this.tiles[id]=4;
  }
  // Keep the 7x7 starting camp open and buildable.
  const camp=Math.floor(SIZE/2);for(let y=camp-3;y<=camp+3;y++)for(let x=camp-3;x<=camp+3;x++){const id=y*SIZE+x;this.tiles[id]=0;this.elevation[id]=0;this.ramps[id]=0;}
 }
 terrain(x:number,y:number){if(x<0||y<0||x>=SIZE||y>=SIZE)return 1;return this.tiles[Math.floor(y)*SIZE+Math.floor(x)];}
 elevationAt(x:number,y:number){if(x<0||y<0||x>=SIZE||y>=SIZE)return 0;return this.elevation[Math.floor(y)*SIZE+Math.floor(x)];}
 rampAt(x:number,y:number){if(x<0||y<0||x>=SIZE||y>=SIZE)return false;return !!this.ramps[Math.floor(y)*SIZE+Math.floor(x)];}
 blockedTerrain(x:number,y:number){const t=this.terrain(x,y);return t===1||t===2||t===4;}
 moveFactor(x:number,y:number){return this.terrain(x,y)===3?.7:1;}
 canFly(x:number,y:number,r=.25){return x-r>=1&&y-r>=1&&x+r<SIZE-1&&y+r<SIZE-1;}
 canStand(x:number,y:number,r=.25,blocked?:Set<number>){
  const baseElevation=this.elevationAt(x,y),baseRamp=this.rampAt(x,y);
  for(const [dx,dy] of [[-r,-r],[r,-r],[-r,r],[r,r],[0,0]]){
   const sx=x+dx,sy=y+dy;
   if(this.blockedTerrain(sx,sy)||blocked?.has(cell({x:sx,y:sy})))return false;
   if(this.elevationAt(sx,sy)!==baseElevation&&!baseRamp&&!this.rampAt(sx,sy))return false;
  }
  return true;
 }
 los(a:Point,b:Point){const n=Math.ceil(distance(a,b)*6);for(let i=1;i<n;i++)if(this.terrain(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n)===1)return false;return true;}
}
// One shared flow field per target, computed from attack-adjacent tiles. No enemy-per-frame A*.
export function flow(map:WorldMap,target:Point,blocked:Set<number>,breakCost?:Map<number,number>,clearance=.25,air=false){
 const dist=new Float32Array(SIZE*SIZE);dist.fill(Infinity);
 const heap:[number,number][]=[];
 const push=(id:number,d:number)=>{heap.push([id,d]);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p][1]<=d)break;heap[i]=heap[p];i=p;}heap[i]=[id,d];};
 const pop=()=>{const top=heap[0],last=heap.pop()!;if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&heap[j+1][1]<heap[j][1])j++;if(heap[j][1]>=last[1])break;heap[i]=heap[j];i=j;}heap[i]=last;}return top;};
 const id=cell(target);dist[id]=0;push(id,0);
 while(heap.length){const [at,d]=pop();if(d!==dist[at])continue;const x=at%SIZE,y=Math.floor(at/SIZE);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=SIZE||ny>=SIZE)continue;const ni=ny*SIZE+nx,tile=map.tiles[ni];
   if(!air&&(tile===1||tile===2||tile===4))continue;
   if(!air&&map.elevation[at]!==map.elevation[ni]&&!map.ramps[at]&&!map.ramps[ni])continue;
   if(!air&&blocked.has(ni)&&ni!==id&&!breakCost)continue;
   if(!air&&clearance>.5&&ni!==id&&!map.canStand(nx+.5,ny+.5,clearance))continue;
   const nd=Math.fround(d+1+(!air&&tile===3?.45:0)+(air?0:(breakCost?.get(ni)||0)));if(nd<dist[ni]){dist[ni]=nd;push(ni,nd);}}
 }
 return dist;
}
