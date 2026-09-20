// Device axes follow the W3C/MDN device-orientation coordinate frame.
// https://developer.mozilla.org/en-US/docs/Web/API/Device_orientation_events/Orientation_and_motion_data_explained
export const clamp=(n:number,lo=0,hi=1)=>Math.max(lo,Math.min(hi,n));
export type TiltSample={degrees:number;side:1|-1;stationary:boolean};
export type MotionState={raw:number;filtered:number;position:number;velocity:number;rotation:number;rotationVelocity:number;side:1|-1;flatSince:number|null;settled:boolean;previousRaw:number};
export const createMotionState=():MotionState=>({raw:90,filtered:90,position:1,velocity:0,rotation:0,rotationVelocity:0,side:1,flatSince:null,settled:false,previousRaw:90});
export function orientationSample(beta:number,gamma:number,screenAngle=0):TiltSample|null{
 if(![beta,gamma,screenAngle].every(Number.isFinite))return null;
 const b=beta*Math.PI/180,g=gamma*Math.PI/180,a=screenAngle*Math.PI/180;
 const x=-Math.cos(b)*Math.sin(g),y=Math.sin(b),z=Math.cos(b)*Math.cos(g);
 if(z<-.15)return null; // Face-down readings must not flip the visible sign.
 const screenY=y*Math.cos(a)-x*Math.sin(a);
 return {degrees:clamp(Math.atan2(Math.hypot(x,y),Math.max(0,z))*180/Math.PI,0,90),side:screenY<0?-1:1,stationary:true};
}
export function gravitySample(x:number,y:number,z:number,screenAngle=0):TiltSample|null{
 const length=Math.hypot(x,y,z);if(!Number.isFinite(length)||length<3||length>17)return null;
 const a=screenAngle*Math.PI/180;
 return {degrees:clamp(Math.atan2(Math.hypot(x,y),Math.abs(z))*180/Math.PI,0,90),side:y*Math.cos(a)-x*Math.sin(a)<0?-1:1,stationary:Math.abs(length-9.81)<1.2};
}
export function feedTilt(state:MotionState,sample:TiltSample,now:number){
 const angle=clamp(sample.degrees,0,90);
 if(angle>18)state.side=sample.side; // Latch direction before placing it flat; yaw cannot identify a server.
 const stable=sample.stationary&&Math.abs(angle-state.previousRaw)<1.1;
 if(state.settled){
  if(angle>12||!sample.stationary){state.flatSince=null;state.settled=false}
 }else if(angle<6&&stable){
  state.flatSince??=now;if(now-state.flatSince>650)state.settled=true;
 }else state.flatSince=null;
 state.previousRaw=angle;
 if(!state.settled&&Math.abs(angle-state.raw)>.35)state.raw=angle;
 if(state.settled)state.raw=0;
}
function spring(position:number,velocity:number,target:number,dt:number){
 velocity+=(110*(target-position)-22*velocity)*dt;
 position+=velocity*dt;
 if(Math.abs(target-position)<.0003&&Math.abs(velocity)<.003)return [target,0];
 return [position,velocity];
}
export function stepMotion(state:MotionState,dt:number,reverse=false,reducedMotion=false){
 dt=clamp(dt,.001,.032);
 state.filtered+=(state.raw-state.filtered)*(1-Math.exp(-dt/0.09));
 const upright=clamp(state.filtered/90);
 const reversed=(state.side===-1)!==reverse;
 const target=reversed?1-upright:upright;
 [state.position,state.velocity]=spring(state.position,state.velocity,target,dt);
 const targetRotation=reversed?180*upright:180*(1-upright);
 [state.rotation,state.rotationVelocity]=spring(state.rotation,state.rotationVelocity,targetRotation,dt);
 return {position:clamp(state.position),rotation:reducedMotion?(targetRotation<90?0:180):state.rotation,settled:state.settled};
}
