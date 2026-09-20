import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlow,receiveTilt,manualFlow,scrubFlow,stepFlow,resinPath,textVisibility,nextDestination} from '../lib/resin-motion.ts';
const advance=(s,n=300)=>{for(let i=0;i<n;i++)stepFlow(s,1/60);return s.flowProgress};
test('Initial sensor data and permission do not initiate motion; real tilt scrubs and reverses',()=>{
 for(const initial of [0,45,90]){const s=createFlow();receiveTilt(s,initial,0);advance(s);assert.equal(s.flowProgress,0);receiveTilt(s,initial+1,200);assert.equal(s.target,0)}
 const s=createFlow();receiveTilt(s,90,0);receiveTilt(s,45,100);advance(s);assert.equal(s.flowProgress,.5);advance(s);assert.equal(s.flowProgress,.5);receiveTilt(s,40,200);advance(s);assert.ok(Math.abs(s.flowProgress-50/90)<.001);receiveTilt(s,60,300);advance(s);assert.ok(Math.abs(s.flowProgress-1/3)<.001);receiveTilt(s,0,400);advance(s);assert.equal(s.flowProgress,1);receiveTilt(s,90,500);advance(s);assert.equal(s.flowProgress,0);
});
test('Manual destination survives sensor noise; sustained intentional movement resumes sensors',()=>{
 const s=createFlow();receiveTilt(s,90,0);receiveTilt(s,72,100);advance(s);manualFlow(s,1);assert.equal(nextDestination(s),1);
 for(let i=0;i<200;i++){receiveTilt(s,72+Math.sin(i)*3,200+i*16);stepFlow(s,1/60)}advance(s);assert.equal(s.flowProgress,1);assert.equal(s.manual,true);assert.equal(nextDestination(s),0);
 receiveTilt(s,45,4000);receiveTilt(s,45,4100);assert.equal(s.manual,true);receiveTilt(s,45,4200);assert.equal(s.manual,false);advance(s);assert.equal(s.flowProgress,.5);
 manualFlow(s,0);advance(s);assert.equal(s.flowProgress,0);assert.equal(nextDestination(s),1);
});
test('Slider, manual, and sensor share identical geometry for the same flowProgress',()=>{
 const manual=createFlow(),slider=createFlow(),sensor=createFlow();manualFlow(manual,1);scrubFlow(slider,1);receiveTilt(sensor,90,0);receiveTilt(sensor,0,100);[manual,slider,sensor].forEach(s=>advance(s));assert.equal(resinPath(manual.flowProgress,362,700,280),resinPath(slider.flowProgress,362,700,280));assert.equal(resinPath(sensor.flowProgress,362,700,280),resinPath(slider.flowProgress,362,700,280));
});
test('Every intermediate outline is finite, bounded, connected and reversible; text never spins',()=>{
 for(let i=0;i<=1000;i++){const p=i/1000,d=resinPath(p,362,700,280);assert.equal((d.match(/M /g)||[]).length,1);assert.ok(d.endsWith(' Z'));assert.ok(!/NaN|Infinity/.test(d));for(const n of d.match(/-?\d+\.\d+/g).map(Number))assert.ok(n>=0&&n<=700);assert.equal(d,resinPath(p,362,700,280));const text=textVisibility(p);assert.ok(!(text.bottom>0&&text.top>0));if(p>=.14&&p<=.86)assert.deepEqual(text,{bottom:0,top:0})}
 assert.deepEqual(textVisibility(0),{bottom:1,top:0});assert.deepEqual(textVisibility(1),{bottom:0,top:1});
});
test('Endpoint hysteresis suppresses jitter without permanent locking',()=>{
 const s=createFlow();receiveTilt(s,90,0);receiveTilt(s,0,100);advance(s);for(let i=0;i<100;i++)receiveTilt(s,2+Math.sin(i),200+i*16);advance(s);assert.equal(s.flowProgress,1);receiveTilt(s,20,2000);advance(s);assert.ok(s.flowProgress<.8);
});
