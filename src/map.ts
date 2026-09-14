import {SIZE} from './data';
export interface Point{x:number;y:number}
export const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
export const cell=(p:Point)=>Math.floor(p.y)*SIZE+Math.floor(p.x);
export const center=(i:number)=>({x:i%SIZE+.5,y:Math.floor(i/SIZE)+.5});
export function random(seed:number){return ()=>{seed|=0;seed=seed+0x6d2b79f5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
export class WorldMap{
 tiles=new Uint8Array(SIZE*SIZE); // 0 meadow, 1 stone, 2 water, 3 mud
 constructor(){
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
   if(x===0||y===0||x===SIZE-1||y===SIZE-1)this.tiles[y*SIZE+x]=1;
   const river=17+Math.round(Math.sin(y*.17)*2);
   if(x>=river&&x<=river+2&&y>3&&y<59 && ![12,13,14,15,16,28,29,30,31,32,33,47,48,49,50,51].includes(y))this.tiles[y*SIZE+x]=2;
  }
  const paint=(type:number,rects:number[][])=>{for(const [cx,cy,w,h] of rects)for(let y=cy;y<cy+h;y++)for(let x=cx;x<cx+w;x++)if(this.tiles[y*SIZE+x]===0)this.tiles[y*SIZE+x]=type;};
  // Broken stone ridges form lanes rather than sealed rooms. The 7x7 camp stays clear.
  paint(1,[[25,22,3,2],[40,29,2,4],[29,42,4,2],[43,42,3,2],[38,16,3,3],[9,25,3,3],[47,11,3,2],[52,52,3,3],[23,52,3,2],[8,45,2,3],[49,25,2,2],
   [25,27,3,3],[30,25,5,2],[38,25,3,2],[38,35,3,3],[34,39,4,2],[25,37,4,2],
   [22,8,4,3],[29,11,2,5],[35,7,5,2],[43,11,2,5],[53,17,4,2],[48,22,5,2],
   [53,29,2,5],[48,37,4,2],[50,46,3,4],[39,48,5,2],[31,54,4,3],[14,55,3,3],
   [7,36,4,2],[5,17,3,4],[11,8,4,2],[23,45,3,2],[13,40,3,3]]);
  // Water pockets and short tributaries make additional detours without splitting the map.
  paint(2,[[20,18,7,2],[24,19,3,2],[44,31,5,2],[46,33,3,2],[20,39,5,2],[21,41,3,2],[41,53,6,2],[6,29,5,2],[8,31,3,2]]);
  // Mud is traversable but slow and cannot support construction.
  paint(3,[[27,18,7,3],[34,19,3,2],[42,27,5,3],[43,35,5,2],[29,37,4,2],[27,39,6,2],
   [20,24,4,5],[22,33,4,3],[48,25,4,4],[45,44,5,3],[34,50,5,3],[11,20,4,4],[10,48,5,3]]);
 }
 terrain(x:number,y:number){if(x<0||y<0||x>=SIZE||y>=SIZE)return 1;return this.tiles[Math.floor(y)*SIZE+Math.floor(x)];}
 blockedTerrain(x:number,y:number){const t=this.terrain(x,y);return t===1||t===2;}
 moveFactor(x:number,y:number){return this.terrain(x,y)===3?.7:1;}
  canStand(x:number,y:number,r=.25,blocked?:Set<number>){
  for(const [dx,dy] of [[-r,-r],[r,-r],[-r,r],[r,r],[0,0]])if(this.blockedTerrain(x+dx,y+dy)||blocked?.has(cell({x:x+dx,y:y+dy})))return false;
  return true;
 }
 los(a:Point,b:Point){const n=Math.ceil(distance(a,b)*6);for(let i=1;i<n;i++)if(this.terrain(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n)===1)return false;return true;}
}
// One shared flow field per target, computed from attack-adjacent tiles. No enemy-per-frame A*.
export function flow(map:WorldMap,target:Point,blocked:Set<number>,breakCost?:Map<number,number>,clearance=.25){
 const dist=new Float32Array(SIZE*SIZE);dist.fill(Infinity);
 const heap:[number,number][]=[];
 const push=(id:number,d:number)=>{heap.push([id,d]);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p][1]<=d)break;heap[i]=heap[p];i=p;}heap[i]=[id,d];};
 const pop=()=>{const top=heap[0],last=heap.pop()!;if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&heap[j+1][1]<heap[j][1])j++;if(heap[j][1]>=last[1])break;heap[i]=heap[j];i=j;}heap[i]=last;}return top;};
 const id=cell(target);dist[id]=0;push(id,0);
 while(heap.length){const [at,d]=pop();if(d!==dist[at])continue;const x=at%SIZE,y=Math.floor(at/SIZE);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=SIZE||ny>=SIZE)continue;const ni=ny*SIZE+nx,tile=map.tiles[ni];if(tile===1||tile===2)continue;if(blocked.has(ni)&&ni!==id&&!breakCost)continue;if(clearance>.5&&ni!==id&&!map.canStand(nx+.5,ny+.5,clearance))continue;const nd=Math.fround(d+1+(tile===3?.45:0)+(breakCost?.get(ni)||0));if(nd<dist[ni]){dist[ni]=nd;push(ni,nd);}}
 }
 return dist;
}
