export type NpcId = 'pipa' | 'blue' | 'grey' | 'huashen' | 'keeper' | 'waiter';
export type Point = { x: number; y: number };
export const WORLD_SIZE = 1254;
export const START: Point = { x: 628, y: 1040 };
export const NPCS = [
  { id: 'pipa' as NpcId, name: '琵琶女', subtitle: '抱着琵琶，欲言又止', x: 972, y: 686, character: 'char-pipa-girl', greeting: '王妃……小女子只想安生弹曲。', prompts: ['方才到底发生了什么？', '你希望我如何处理这件事？'] },
  { id: 'blue' as NpcId, name: '蓝衣人', subtitle: '拱手相候，话语留有余地', x: 858, y: 642, character: 'char-blue-man', greeting: '王妃，这事还请容在下分说。', prompts: ['你们为何出手相助？', '你身旁那人与你是什么关系？'] },
  { id: 'grey' as NpcId, name: '灰衣人', subtitle: '抱臂而立，神色不善', x: 310, y: 676, character: 'char-grey-man', greeting: '王妃也是来替华家撑腰的？', prompts: ['你亲眼看到了什么？', '为何认定我会替兄长撑腰？'] },
  {id:'huashen' as NpcId,name:'华深',subtitle:'急着替自己辩解',x:620,y:840,character:'char-huashen',greeting:'妹妹，你可要替我说话！',prompts:['你说发生了什么？','她愿不愿意，你问过吗？']},
  {id:'keeper' as NpcId,name:'掌柜',subtitle:'只说自己所见',x:600,y:443,character:'char-qianzhuang-zhanggui',greeting:'争执堵住了大堂。',prompts:['你亲眼看见了哪一段？','哪些事你不能确认？']},
  {id:'waiter' as NpcId,name:'店小二',subtitle:'听到喧哗才赶来',x:1120,y:485,character:'char-zhouyong',greeting:'小的没看清前因。',prompts:['你是从何时注意到争执的？','你知道他们的身份吗？']},
] as const;
export const RECT_OBSTACLES = [
  [70, 360, 155, 278], [250, 440, 65, 159], [365, 413, 113, 150],
  [745, 485, 113, 84], [866, 313, 208, 160],
  [90, 718, 194, 220], [349, 741, 161, 194],
  [703, 742, 151, 194], [919, 748, 235, 191],
  [287, 632, 30, 30], [526, 706, 53, 202], [769, 659, 54, 48],
] as const;
export const CIRCLE_OBSTACLES = [ [638, 551, 92], [436, 664, 68], [1064, 616, 94] ] as const;
export function canWalk(p: Point, radius = 12): boolean {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return false;
  const floor = p.x >= 83 + radius && p.x <= 1183 - radius && p.y >= 430 + radius && p.y <= 955 - radius;
  const entry = p.x >= 549 + radius && p.x <= 708 - radius && p.y >= 910 && p.y <= 1100 - radius;
  if (!floor && !entry) return false;
  if (RECT_OBSTACLES.some(([x,y,w,h]) => p.x > x-radius && p.x < x+w+radius && p.y > y-radius && p.y < y+h+radius)) return false;
  if (CIRCLE_OBSTACLES.some(([x,y,r]) => Math.hypot(p.x-x,p.y-y) < r+radius)) return false;
  return true;
}
export function moveStep(p: Point, dx: number, dy: number): Point {
  // Small swept steps prevent crossing furniture when a frame stalls.
  const steps = Math.max(1, Math.ceil(Math.hypot(dx,dy)/5));
  const q = { ...p };
  for (let i=0; i<steps; i++) {
    if (canWalk({x:q.x+dx/steps,y:q.y})) q.x += dx/steps;
    if (canWalk({x:q.x,y:q.y+dy/steps})) q.y += dy/steps;
  }
  return q;
}
export function closestNpc(p: Point) {
  return [...NPCS].sort((a,b) => Math.hypot(p.x-a.x,p.y-a.y)-Math.hypot(p.x-b.x,p.y-b.y))[0];
}
export function inTalkRange(p: Point, id: NpcId) {
  const npc=NPCS.find(n=>n.id===id)!;
  return canWalk(p) && Math.hypot(p.x-npc.x,p.y-npc.y)<=138;
}
export function findPath(from:Point,to:Point):Point[]|null {
  const step=16;const key=(x:number,y:number)=>`${x},${y}`;
  const start={x:Math.round(from.x/step),y:Math.round(from.y/step)};
  const target={x:Math.round(to.x/step),y:Math.round(to.y/step)};
  if(!canWalk({x:target.x*step,y:target.y*step}))return null;
  const queue=[start];const parents=new Map<string,string|null>([[key(start.x,start.y),null]]);
  for(let i=0;i<queue.length&&i<10000;i++){
    const p=queue[i];const k=key(p.x,p.y);
    if(p.x===target.x&&p.y===target.y){
      const route:Point[]=[];let cur:string|null=k;
      while(cur){const [x,y]=cur.split(',').map(Number);route.push({x:x*step,y:y*step});cur=parents.get(cur)??null;}
      return route.reverse();
    }
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=p.x+dx,ny=p.y+dy,nk=key(nx,ny);
      if(!parents.has(nk)&&canWalk({x:nx*step,y:ny*step})&&canWalk({x:(p.x+nx)*step/2,y:(p.y+ny)*step/2})){parents.set(nk,k);queue.push({x:nx,y:ny});}
    }
  }
  return null;
}
