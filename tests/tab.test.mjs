import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,authorize,placeOrder,settleTab,tipAmount,totals,restoreSession} from '../lib/tab-state.ts';
import {createMotionState,feedTilt,stepMotion,orientationSample,gravitySample} from '../lib/marker-motion.ts';
const drink={id:'margarita',name:'Spicy Margarita',short:'Margarita',description:'',price:16,category:'Cocktails',qty:2,key:'margarita'};
test('Authorize once, send rounds without payment, close once and retain numbered history',()=>{
 let s=authorize(fresh(),'Apple Pay',1);const id=s.tabId;
 assert.equal(authorize(s,'Card',2),s);
 const first=placeOrder(s,[drink],false,3);s=first.session;
 assert.equal(first.order.number,47);assert.equal(first.order.color.name,'Orange');assert.equal(first.order.paymentStatus,'on-tab');assert.equal(first.order.tip,0);
 const second=placeOrder(s,[{...drink,id:'martini',key:'martini',price:17,qty:1},{...drink,id:'beer',key:'beer',price:8,qty:2}],false,4);s=second.session;
 assert.notEqual(second.order.number,47);assert.notEqual(second.order.color.name,'Orange');assert.equal(second.order.tabId,id);
 assert.throws(()=>settleTab(s,0),/delivered/);
 s={...s,orders:s.orders.map(o=>({...o,status:'delivered'}))};
 assert.deepEqual(totals(s.orders),{subtotal:6500,tax:577,total:7077,paidBefore:0,legacyTips:0,tipBase:6500,due:7077});
 assert.equal(tipAmount(null,'',6500),null);assert.equal(tipAmount('20','',6500),1300);assert.equal(tipAmount('0','',6500),0);
 const closed=settleTab(s,1300,5);assert.equal(closed.receipt.total,8377);assert.equal(closed.receipt.charged,8377);assert.equal(closed.session.tabId,null);assert.equal(closed.session.authorizedMethod,null);assert.equal(closed.receipt.orders[0].number,47);assert.equal(closed.receipt.orders[0].paymentStatus,'paid');assert.throws(()=>settleTab(closed.session,0),/No open tab/);
 const reopened=authorize(closed.session,'Google Pay',6);assert.notEqual(reopened.tabId,id);assert.equal(reopened.receipts.length,1);assert.equal(totals(reopened.orders.filter(o=>o.tabId===reopened.tabId)).total,0);
 assert.deepEqual(restoreSession(JSON.parse(JSON.stringify(reopened))),reopened);
});
test('Custom tips validate cents and legacy paid rounds are credited',()=>{
 for(const bad of ['','-2','1.234','NaN','10000','1e2'])assert.equal(tipAmount('custom',bad,100),null);
 assert.equal(tipAmount('custom','12.34',100),1234);
 let s=placeOrder(authorize(fresh(),'Card'),[drink],false).session;
 s={...s,orders:s.orders.map(o=>({...o,status:'delivered',paymentStatus:'paid',tip:640,total:4124}))};
 const migrated=restoreSession({...s,version:undefined,receipts:undefined});
 assert.equal(totals(migrated.orders).due,0);assert.equal(settleTab(migrated,0).receipt.charged,0);
 assert.throws(()=>settleTab({...s,cart:[drink]},0),/unplaced/);
});
function settle(engine,degrees,side=1,reverse=false,start=0){let result;for(let i=0;i<240;i++){feedTilt(engine,{degrees,side,stationary:true},start+i*16.667);result=stepMotion(engine,1/60,reverse)}return result}
test('Marker travels continuously through upright, 45°, flat, and pickup',()=>{
 const e=createMotionState();let r=settle(e,90);assert.ok(r.position>.999);assert.ok(r.rotation<.01);
 r=settle(e,45);assert.ok(Math.abs(r.position-.5)<.001);assert.ok(Math.abs(r.rotation-90)<.01);
 r=settle(e,0,1,false,5000);assert.ok(r.position<.001);assert.ok(Math.abs(r.rotation-180)<.01);assert.equal(r.settled,true);
 feedTilt(e,{degrees:3,side:-1,stationary:true},10000);assert.equal(e.raw,0);assert.equal(e.side,1);
 r=settle(e,90,1,false,11000);assert.equal(r.settled,false);assert.ok(r.position>.999);assert.ok(r.rotation<.01);
 r=settle(e,90,1,true,16000);assert.ok(r.position<.001);assert.ok(Math.abs(r.rotation-180)<.01);
 settle(e,90,-1,false,20000);r=settle(e,0,-1,false,25000);assert.ok(r.position>.999);assert.ok(r.rotation<.01);
});
test('Sensor geometry handles portrait, landscape, opposite placement and invalid input',()=>{
 assert.ok(Math.abs(orientationSample(45,0).degrees-45)<.001);assert.equal(orientationSample(-90,0).side,-1);assert.ok(Math.abs(orientationSample(0,45,90).degrees-45)<.001);assert.equal(orientationSample(180,0),null);assert.equal(orientationSample(NaN,0),null);assert.equal(gravitySample(0,0,0),null);assert.equal(gravitySample(0,9.81,0).degrees,90);assert.equal(gravitySample(0,0,9.81).degrees,0);
});

test('Flat settling requires uninterrupted stationary readings',()=>{
 const e=createMotionState();
 for(const [time,angle] of [[0,3],[100,3],[400,3],[500,8],[800,8],[900,3],[1000,3]])feedTilt(e,{degrees:angle,side:1,stationary:true},time);
 assert.equal(e.settled,false);
 feedTilt(e,{degrees:3,side:1,stationary:true},1700);assert.equal(e.settled,true);
 feedTilt(e,{degrees:4,side:1,stationary:false},1800);assert.equal(e.settled,false);
});
