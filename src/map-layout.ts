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

// Per-cell art choice is authored too, so reloading or joining from another device
// produces exactly the same ground details instead of selecting texture variants at runtime.
export const FIXED_VARIANT_ROWS=[
 '01230123012301230123012301230123','12301230123012301230123012301230','23012301230123012301230123012301','30123012011230123012301230123012',
 '01230123122301230123012301230123','12301230102301230130123012301230','23012301213302301223030230012301','30123012310323012330101301123012',
 '01230123121030123021201230120123','12302300232301230130112301231230','23013012333012301201223301302301','30123013000123012312330012013012',
 '01232300112301230123001230120123','12303011223012301230112301231230','23012301230123012301223012302301','30123012323030123012301230123012',
 '01230123030101230123030112330123','12301230123012301230101223001230','23012301230123012301230123012301','30120123301230123012301230123012',
 '01231230030101230123012301230123','12301123012302323030012301231230','23012232323113030101123012302301','30123303030220230012223023013012',
 '01230010101231301123330132320123','12301123012302301230001203031230','23012230123013012301123012302301','30121301230120123012230123013012',
 '01232301122301230123012301230123','12301230123012301230123012301230','23012301230123012301230123012301','30123012301230123012301230123012',
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

if(FIXED_MAP_ROWS.length!==SIZE||FIXED_VARIANT_ROWS.length!==SIZE||FIXED_MAP_ROWS.some(row=>row.length!==SIZE)||FIXED_VARIANT_ROWS.some(row=>row.length!==SIZE))throw new Error(`Fixed map must be ${SIZE} x ${SIZE}`);
