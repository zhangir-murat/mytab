'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { gravitySample, orientationSample } from '@/lib/marker-motion';
import { createFlow, manualFlow, nextDestination, receiveTilt, resinPath, scrubFlow, stepFlow, textVisibility } from '@/lib/resin-motion';

type Permission='checking'|'prompt'|'granted'|'denied'|'unsupported';
type SensorAPI={requestPermission?:()=>Promise<string>};
const KEY='tab-smart-display-permission';
// Preserve the experimental sensor implementation for a later release. The live UI is manual-only.
export const SMART_MOTION_ENABLED=false;
export function SmartDisplay({children,orderId,status,copy,tabTotal,onTab,simulator,onSimulatorChange}:{children:ReactNode;orderId:number;status:string;copy:string;tabTotal:string;onTab:()=>void;simulator:boolean;onSimulatorChange:(enabled:boolean)=>void}){
 const flow=useRef(createFlow()),stage=useRef<HTMLDivElement>(null),path=useRef<SVGPathElement>(null),svg=useRef<SVGSVGElement>(null),bottom=useRef<HTMLDivElement>(null),top=useRef<HTMLDivElement>(null),instruction=useRef<HTMLParagraphElement>(null),debug=useRef<HTMLPreElement>(null),manual=useRef<HTMLButtonElement>(null),upIcon=useRef<SVGSVGElement>(null),downIcon=useRef<SVGSVGElement>(null);
 const manualStartedAt=useRef<number|null>(null);
 const liveLabel=useRef<HTMLSpanElement>(null),lastEvent=useRef(0);const [timedOut,setTimedOut]=useState(false);
 const [permission,setPermission]=useState<Permission>('checking'),[available,setAvailable]=useState(false),[events,setEvents]=useState(false),[requesting,setRequesting]=useState(false),[useSimulator,setUseSimulator]=useState(false),[slider,setSlider]=useState(0);
 const opts=useRef({permission,useSimulator,simulator});opts.current={permission,useSimulator,simulator};
 const pending=useRef<{degrees:number;time:number}|null>(null),seen=useRef(false),orientationAt=useRef(-Infinity),lastMotion=useRef('—'),beta=useRef<number|null>(null),gamma=useRef<number|null>(null),orientationSeen=useRef(false),motionSeen=useRef(false),instructionGone=useRef(false);
 const remember=(value:string)=>{try{localStorage.setItem(KEY,value)}catch{}};
 useEffect(()=>{if(!SMART_MOTION_ENABLED)return;
  const O=(window as unknown as {DeviceOrientationEvent?:SensorAPI}).DeviceOrientationEvent,M=(window as unknown as {DeviceMotionEvent?:SensorAPI}).DeviceMotionEvent;
  const supported=window.isSecureContext&&!!(O||M);setAvailable(supported);if(!supported){setPermission('unsupported');return}
  let saved:string|null=null;try{saved=localStorage.getItem(KEY)}catch{}
  setPermission(saved==='granted'?'granted':saved==='denied'?'denied':O?.requestPermission||M?.requestPermission?'prompt':'granted');
 },[]);
 useEffect(()=>{if(!SMART_MOTION_ENABLED||permission!=='granted')return;const timer=setInterval(()=>setTimedOut(performance.now()-lastEvent.current>3000),1000);return()=>clearInterval(timer)},[permission]);
 async function enableMotion(){
  if(requesting)return;setRequesting(true);setTimedOut(false);
  const O=(window as unknown as {DeviceOrientationEvent?:SensorAPI}).DeviceOrientationEvent,M=(window as unknown as {DeviceMotionEvent?:SensorAPI}).DeviceMotionEvent;
  try{
   // Request both permissions synchronously inside the button's direct user gesture.
   const requests:Promise<string>[]=[];
   if(O)requests.push(O.requestPermission?O.requestPermission():Promise.resolve('granted'));
   if(M)requests.push(M.requestPermission?M.requestPermission():Promise.resolve('granted'));
   const answers=await Promise.allSettled(requests),granted=answers.some(x=>x.status==='fulfilled'&&x.value==='granted');
   remember(granted?'granted':'denied');setPermission(granted?'granted':'denied');
   // Deliberately do not change flow.target or play anything here.
  }catch{remember('denied');setPermission('denied')}finally{setRequesting(false)}
 }
 useEffect(()=>{
  if(!SMART_MOTION_ENABLED||permission!=='granted')return;
  const screenAngle=()=>screen.orientation?.angle??(window as unknown as {orientation?:number}).orientation??0;
  const queue=(sample:ReturnType<typeof orientationSample>)=>{if(!sample)return;lastEvent.current=performance.now();pending.current={degrees:sample.degrees,time:performance.now()};if(!seen.current){seen.current=true;setEvents(true)}};
  const orientation=(e:DeviceOrientationEvent)=>{if(e.beta===null||e.gamma===null)return;orientationSeen.current=true;beta.current=e.beta;gamma.current=e.gamma;const sample=orientationSample(e.beta,e.gamma,screenAngle());if(sample){orientationAt.current=performance.now();queue(sample)}};
  const motion=(e:DeviceMotionEvent)=>{const g=e.accelerationIncludingGravity;if(g?.x==null||g.y==null||g.z==null)return;motionSeen.current=true;lastMotion.current=`x ${g.x.toFixed(2)} / y ${g.y.toFixed(2)} / z ${g.z.toFixed(2)}`;if(performance.now()-orientationAt.current>750)queue(gravitySample(g.x,g.y,g.z,screenAngle()))};
  window.addEventListener('deviceorientation',orientation,{passive:true});window.addEventListener('devicemotion',motion,{passive:true});
  return()=>{window.removeEventListener('deviceorientation',orientation);window.removeEventListener('devicemotion',motion)};
 },[permission]);
 useEffect(()=>{
  let raf=0,last=0,lastDebug=0,width=360,height=680,card=270,lastP=-1;

  try{if(sessionStorage.getItem(`tab-marker-instructed-${orderId}`)){instructionGone.current=true;if(instruction.current)instruction.current.style.opacity='0'}}catch{}
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const measure=()=>{if(!stage.current)return;width=stage.current.clientWidth;height=stage.current.clientHeight;card=Math.min(window.innerHeight*.34,300,height*.44);stage.current.style.setProperty('--resin-card',`${card}px`);svg.current?.setAttribute('viewBox',`0 0 ${width} ${height}`);const marker=stage.current.querySelector('.marker');if(marker)stage.current.style.setProperty('--resin-color',getComputedStyle(marker).getPropertyValue('--marker'));lastP=-1};
  const resize=new ResizeObserver(measure);if(stage.current)resize.observe(stage.current);measure();
  const render=(time:number)=>{
   const dt=last?(time-last)/1000:1/60;last=time;const cfg=opts.current,s=flow.current;
   // Coalesce arbitrarily frequent sensor events to one latest sample per frame.
   if(SMART_MOTION_ENABLED&&pending.current){const sample=pending.current;pending.current=null;if(!cfg.useSimulator)receiveTilt(s,sample.degrees,sample.time)}
   const frameDt=manualStartedAt.current===null?dt:Math.max(0,Math.min(dt,(time-manualStartedAt.current)/1000));manualStartedAt.current=null;
   const progress=stepFlow(s,frameDt),paint=reduced.matches?(progress<.5?0:1):progress;
   if(Math.abs(progress-lastP)>.00001){
    path.current?.setAttribute('d',resinPath(paint,width,height,card));
    const opacity=textVisibility(paint);if(bottom.current)bottom.current.style.opacity=String(opacity.bottom);if(top.current)top.current.style.opacity=String(opacity.top);
    stage.current?.setAttribute('data-flow-progress',progress.toFixed(4));stage.current?.setAttribute('data-target',s.target.toFixed(4));lastP=progress;
   }
   if(!instructionGone.current&&s.target>.045){instructionGone.current=true;if(instruction.current)instruction.current.style.opacity='0';try{sessionStorage.setItem(`tab-marker-instructed-${orderId}`,'1')}catch{}}
   const next=nextDestination(s);manual.current?.setAttribute('aria-label',next?'Move order up':'Move order down');manual.current?.setAttribute('title',next?'Move order up':'Move order down');manual.current?.setAttribute('data-destination',String(next));if(upIcon.current)upIcon.current.style.display=next?'block':'none';if(downIcon.current)downIcon.current.style.display=next?'none':'block';const label=manual.current?.querySelector('.resin-manual-label');if(label)label.textContent=next?'SHOW SERVER':'BRING BACK';
   stage.current?.setAttribute('data-manual-override',String(s.manual));
   if(SMART_MOTION_ENABLED&&time-lastDebug>120){lastDebug=time;const active=seen.current&&time-lastEvent.current<3000;if(liveLabel.current)liveLabel.current.textContent=cfg.useSimulator?'Tilt simulator':s.manual?'Manual position':active?'Motion: Active':'Motion data unavailable';if(debug.current)debug.current.textContent=`Motion: ${active?'Active':'Motion data unavailable'}\nSensor available: ${window.isSecureContext&&('DeviceOrientationEvent' in window||'DeviceMotionEvent' in window)?'YES':'NO'}\nPermission: ${cfg.permission.toUpperCase()}\nDeviceOrientation events: ${orientationSeen.current?'YES':'NO'}\nDeviceMotion events: ${motionSeen.current?'YES':'NO'}\nBeta: ${beta.current?.toFixed(2)??'—'}\nGamma: ${gamma.current?.toFixed(2)??'—'}\nGravity: ${lastMotion.current}\nRaw tilt: ${s.rawTilt?.toFixed(2)??'—'}°\nRaw flowProgress: ${s.rawFlow.toFixed(3)}\nTarget flowProgress: ${s.target.toFixed(3)}\nSmoothed flowProgress: ${progress.toFixed(3)}\nManual override: ${s.manual?'ON':'OFF'}\nInput: ${cfg.useSimulator?'SLIDER':s.manual?'MANUAL':s.armed?'SENSOR':'WAITING FOR MOVEMENT'}`}
   raf=requestAnimationFrame(render);
  };
  raf=requestAnimationFrame(render);return()=>{cancelAnimationFrame(raf);resize.disconnect()};
 },[]);
 function moveManually(){manualFlow(flow.current,nextDestination(flow.current));manualStartedAt.current=performance.now()}
 return <div className="resin-display">
  <div className={`resin-stage ${status==='COMING TO YOU'?'resin-coming':''}`} ref={stage} aria-label="Live physical order marker">
   <svg className="resin-svg" ref={svg} aria-hidden="true" preserveAspectRatio="none"><path ref={path}/></svg>
   <div className="resin-text resin-bottom" ref={bottom}>{children}</div><div className="resin-text resin-top" ref={top} aria-hidden="true">{children}</div>
   <p className="resin-instruction" ref={instruction}>Tilt your phone to show<br/>your order to the server</p>
   <button className="resin-manual" ref={manual} aria-label="Move order up" title="Move order up" onClick={moveManually}>
    <span className="resin-manual-icon"><svg ref={upIcon} width="30" height="36" viewBox="0 0 30 36" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M15 15V3m-5 5 5-5 5 5"/><rect x="4" y="21" width="22" height="11" rx="3"/></svg>
    <svg ref={downIcon} style={{display:'none'}} width="30" height="36" viewBox="0 0 30 36" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="4" y="4" width="22" height="11" rx="3"/><path d="M15 21v12m-5-5 5 5 5-5"/></svg></span><span className="resin-manual-label">SHOW SERVER</span>
   </button>
   {SMART_MOTION_ENABLED&&(permission==='prompt'||permission==='denied'||(permission==='granted'&&timedOut&&available))&&<div className="resin-permission"><button disabled={requesting} onClick={enableMotion}>{requesting?'Enabling…':'Enable Motion'}</button><p>{permission==='denied'?'Motion access is off. The arrow always works.':'Lets TAB respond when you tilt your phone.'}</p></div>}
  </div>
  <div className="resin-footer"><div className="resin-status" aria-live="polite"><strong>{status}</strong><p>{copy}</p></div><div className="resin-footer-row"><button onClick={onTab}>TAB · {tabTotal}</button></div></div>
  {SMART_MOTION_ENABLED&&simulator&&<aside className="motion-debug"><header><strong>Motion Debug</strong><button className="icon-button" aria-label="Hide Motion Debug" onClick={()=>{setUseSimulator(false);flow.current.baseline=null;flow.current.armed=false;onSimulatorChange(false)}}><X size={16}/></button></header><pre ref={debug}/><label>Use tilt simulator<Switch aria-label="Use tilt simulator" checked={useSimulator} onCheckedChange={v=>{setUseSimulator(v);if(v){setSlider(Math.round(flow.current.flowProgress*100));scrubFlow(flow.current,flow.current.flowProgress)}else{flow.current.baseline=null;flow.current.armed=false}}}/></label>{useSimulator&&<><p className="debug-slider-title">PHONE TILT · {(slider/100).toFixed(2)}</p><Slider aria-label="Phone tilt" value={[slider]} min={0} max={100} step={1} onValueChange={([v])=>{setSlider(v);scrubFlow(flow.current,v/100)}}/><div className="tilt-labels"><span>UPRIGHT</span><span>FLAT</span></div></>}</aside>}
 </div>
}
