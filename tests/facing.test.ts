import {describe,expect,it} from 'vitest';
import {directionFrame,enemyAttackFrame,facingFromInput,loopFrame,walkingFrame} from '../src/facing';

describe('worker facing',()=>{
 it('chooses all four directions and keeps the last direction while idle',()=>{
  expect(facingFromInput({x:0,y:1})).toBe('down');
  expect(facingFromInput({x:1,y:0})).toBe('right');
  expect(facingFromInput({x:0,y:-1})).toBe('up');
  expect(facingFromInput({x:-1,y:0})).toBe('left');
  expect(facingFromInput({x:0,y:0},'up')).toBe('up');
 });

 it('animates only while the worker is moving',()=>{
  expect(walkingFrame(.2,{x:0,y:0})).toBe(0);
 expect(walkingFrame(.2,{x:1,y:0})).toBe(1);
 expect(walkingFrame(.3,{x:1,y:0})).toBe(0);
 expect([0,1]).toContain(walkingFrame(-9.8,{x:0,y:-1}));
 });

 it('maps the four directions onto the approved two-frame atlas order',()=>{
  expect(directionFrame('down',0)).toBe(0);
  expect(directionFrame('right',1)).toBe(3);
  expect(directionFrame('up',0)).toBe(4);
  expect(directionFrame('left',1)).toBe(7);
  expect(loopFrame(-.1,8,4)).toBeGreaterThanOrEqual(0);
 });

 it('aligns six attack frames around the simulation windup and cooldown',()=>{
  expect(enemyAttackFrame(10,11.2,10.3,.3,1.2)).toBe(0);
  expect(enemyAttackFrame(10.29,11.2,10.3,.3,1.2)).toBe(2);
  expect(enemyAttackFrame(10.3,11.2,0,.3,1.2)).toBe(3);
  expect(enemyAttackFrame(11.19,11.2,0,.3,1.2)).toBe(5);
  expect(enemyAttackFrame(11.2,11.2,0,.3,1.2)).toBeNull();
  expect(enemyAttackFrame(10,Number.NaN,10.3,.3,1.2)).toBe(0);
  expect(enemyAttackFrame(10.4,Number.NaN,0,.3,1.2)).toBeNull();
 });
});
