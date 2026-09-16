import {SIZE} from './data';

export type CellEffectKey='meadow'|'stone'|'water'|'mud'|'cliff'|'ramp';
export interface CellEffect{
 key:CellEffectKey;name:string;terrain:0|1|2|3|4;walkable:boolean;buildable:boolean;
 moveFactor:number;blocksGround:boolean;blocksSight:boolean;airPassable:boolean;description:string;
}

// This is the authored battlefield. Each character is one of the 32 x 32 cells:
// . low meadow, # low stone, ~ low water, m low mud, G/B/W/M high equivalents,
// C raised cliff edge, A high ramp mouth, a low ramp mouth.
export const FIXED_MAP_ROWS=[
 '################################',
 '#..............................#',
 '#..............................#',
 '#.......~~..###................#',
 '#..##...~~..###......###.......#',
 '#..##....mCCCCCCCC...###.......#',
 '#..##....mCMMGGGGCmmm..~~~.....#',
 '#........~CWGGGGGCmmm..~~~.....#',
 '#.......~~CWGGGGGAammCCCCCCC#..#',
 '#...~~~.~~CGGGGGGC...CGGGGGC#..#',
 '#...~~~~~.CGGGGGGC...CGMMMGC#..#',
 '#......~~.CCCACCCC..aAGMMMGC...#',
 '#...mmm~~..##a......#CGGGGGC...#',
 '#...mmm~~..##.......#CGGGGGC...#',
 '#..##................CCCACCC#..#',
 '#..##....mmm............a.###..#',
 '#..##....mmm.........mmm~~~....#',
 '#....................mmm~~~....#',
 '#.........###.......##.........#',
 '#...~~~~..###.......##...###...#',
 '#...~~~~ammm........##.a.###...#',
 '#....CCCACCCC..mmm..CCCACCCC...#',
 '#....CGWWGGBC#.mmm..CGGGGGGC...#',
 '#..##CGWWGGBC#~~~...CMMMGGGC...#',
 '#..##CGWWGGGAa~~~..aAMMMGWWC...#',
 '#....CGGGGGGC.....##CMMMGWWC...#',
 '#....CGGGGGGC.....##CGGGGGGC...#',
 '#...mCCCCCCCC.###...CCCCCCCC...#',
 '#...mmmm~~....###....###.......#',
 '#..............................#',
 '#..............................#',
 '################################',
] as const;

export const CELL_EFFECTS:Record<CellEffectKey,CellEffect>={
 meadow:{key:'meadow',name:'草地',terrain:0,walkable:true,buildable:true,moveFactor:1,blocksGround:false,blocksSight:false,airPassable:true,description:'可通行、可建造，移动速度100%'},
 stone:{key:'stone',name:'岩石',terrain:1,walkable:false,buildable:false,moveFactor:0,blocksGround:true,blocksSight:true,airPassable:true,description:'阻挡地面移动、建造与视线'},
 water:{key:'water',name:'河流',terrain:2,walkable:false,buildable:false,moveFactor:0,blocksGround:true,blocksSight:false,airPassable:true,description:'阻挡地面移动与建造'},
 mud:{key:'mud',name:'泥地',terrain:3,walkable:true,buildable:false,moveFactor:.7,blocksGround:false,blocksSight:false,airPassable:true,description:'可通行、不可建造，移动速度70%'},
 cliff:{key:'cliff',name:'高地边缘',terrain:4,walkable:false,buildable:false,moveFactor:0,blocksGround:true,blocksSight:false,airPassable:true,description:'阻挡地面移动与建造，空军可跨越'},
 ramp:{key:'ramp',name:'坡道',terrain:0,walkable:true,buildable:false,moveFactor:1,blocksGround:false,blocksSight:false,airPassable:true,description:'连接高低地，可通行、不可建造'},
};

export interface DecodedCell{terrain:0|1|2|3|4;elevation:0|1;ramp:0|1;effect:CellEffectKey}
export const CELL_CODE:Record<string,DecodedCell>={
 '.':{terrain:0,elevation:0,ramp:0,effect:'meadow'},'#':{terrain:1,elevation:0,ramp:0,effect:'stone'},'~':{terrain:2,elevation:0,ramp:0,effect:'water'},m:{terrain:3,elevation:0,ramp:0,effect:'mud'},
 G:{terrain:0,elevation:1,ramp:0,effect:'meadow'},B:{terrain:1,elevation:1,ramp:0,effect:'stone'},W:{terrain:2,elevation:1,ramp:0,effect:'water'},M:{terrain:3,elevation:1,ramp:0,effect:'mud'},
 C:{terrain:4,elevation:1,ramp:0,effect:'cliff'},A:{terrain:0,elevation:1,ramp:1,effect:'ramp'},a:{terrain:0,elevation:0,ramp:1,effect:'ramp'},
};

if(FIXED_MAP_ROWS.length!==SIZE||FIXED_MAP_ROWS.some(row=>row.length!==SIZE))throw new Error(`Fixed map must be ${SIZE} x ${SIZE}`);
