import {describe,expect,it} from 'vitest';
import {validCommand,validInput,validNetworkState,validSelect} from '../src/protocol';
import {Simulation} from '../src/sim';

describe('realtime protocol validation',()=>{
 it('accepts normal controls and rejects out-of-range or unknown controls',()=>{
  expect(validInput({x:1,y:-1})).toBe(true);expect(validInput({x:1.1,y:0})).toBe(false);expect(validInput({x:NaN,y:0})).toBe(false);
  expect(validCommand('build')).toBe(true);expect(validCommand('exchange:1')).toBe(true);expect(validCommand('grant:gold')).toBe(false);
  expect(validSelect(4)).toBe(true);expect(validSelect(5)).toBe(false);
 });
 it('validates authoritative snapshot bounds and connected player count',()=>{
  const sim=new Simulation(3);sim.start();const state=JSON.parse(JSON.stringify(sim.networkState()));
  expect(validNetworkState(state,3)).toBe(true);state.players[2].x=999;expect(validNetworkState(state,3)).toBe(false);state.players[2].x=32.5;expect(validNetworkState(state,4)).toBe(false);
 });
});

describe('client prediction reconciliation',()=>{
 it('smoothly corrects a small local error and snaps a large error',()=>{
  const host=new Simulation(2);host.start();const guest=new Simulation(2);guest.start();
  guest.players[1].x=host.players[1].x+.6;guest.players[1].input={x:1,y:0};const small=guest.reconcileNetworkState(JSON.parse(JSON.stringify(host.networkState())),1);
  expect(small).toBeCloseTo(.6);expect(guest.players[1].x).toBeGreaterThan(host.players[1].x);expect(guest.players[1].x).toBeLessThan(host.players[1].x+.6);expect(guest.players[1].input.x).toBe(1);
  guest.players[1].x=host.players[1].x+2;const large=guest.reconcileNetworkState(JSON.parse(JSON.stringify(host.networkState())),1);
  expect(large).toBeCloseTo(2);expect(guest.players[1].x).toBe(host.players[1].x);
 });
});
