import {SIZE} from '../src/data';
import {flow,WorldMap} from '../src/map';

const map=new WorldMap(),counts=[0,0,0,0,0];for(const tile of map.tiles)counts[tile]++;
const field=flow(map,{x:SIZE/2+.5,y:SIZE/2+.5},new Set());
console.log(JSON.stringify({size:SIZE,counts,high:[...map.elevation].filter(Boolean).length,ramps:[...map.ramps].filter(Boolean).length,unreachable:[...map.tiles].filter((tile,i)=>(tile===0||tile===3)&&!Number.isFinite(field[i])).length}));
