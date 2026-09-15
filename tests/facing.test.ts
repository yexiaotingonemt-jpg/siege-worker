import {describe,expect,it} from 'vitest';
import {facingFromInput,walkingFrame} from '../src/facing';

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
});
