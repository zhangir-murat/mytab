'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUpDown, X } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { createMotionState, feedTilt, gravitySample, orientationSample, stepMotion } from '@/lib/marker-motion';

type SensorAccess='checking'|'prompt'|'listening'|'live'|'denied'|'unavailable';
type PermissionEvent={requestPermission?:()=>Promise<string>};
const PERMISSION_KEY='tab-smart-display-permission';
export function SmartDisplay({children,status,copy,tabTotal,onTab,simulator,onSimulatorChange}:{children:ReactNode;status:string;copy:string;tabTotal:string;onTab:()=>void;simulator:boolean;onSimulatorChange:(enabled:boolean)=>void}){
 const stage=useRef<HTMLDivElement>(null),moving=useRef<HTMLDivElement>(null),engine=useRef(createMotionState());
 const [access,setAccess]=useState<SensorAccess>('checking');const [reverse,setReverse]=useState(false);const [tilt,setTilt]=useState(90);const [simReverse,setSimReverse]=useState(false);
 const liveSampleAt=useRef(0),orientationAt=useRef(0),lastStable=useRef(true);const lastSide=useRef<1|-1>(1);const requested=useRef(false);
 const options=useRef({reverse,simulator,tilt,simReverse,access});options.current={reverse,simulator,tilt,simReverse,access};
 const remember=(value:string)=>{try{localStorage.setItem(PERMISSION_KEY,value)}catch{}};
 useEffect(()=>{
  const O=(window as unknown as {DeviceOrientationEvent?:PermissionEvent}).DeviceOrientationEvent;
  const M=(window as unknown as {DeviceMotionEvent?:PermissionEvent}).DeviceMotionEvent;
  if(!window.isSecureContext||(!O&&!M)){setAccess('unavailable');return}
  let saved:string|null=null;try{saved=localStorage.getItem(PERMISSION_KEY)}catch{}
  if(saved==='denied'||saved==='dismissed'){setAccess('denied');return}
  if(saved!=='granted'&&(O?.requestPermission||M?.requestPermission)){setAccess('prompt');return}
  setAccess('listening');
 },[]);
 const enable=useCallback(async()=>{
  if(requested.current)return;requested.current=true;
  const O=(window as unknown as {DeviceOrientationEvent?:PermissionEvent}).DeviceOrientationEvent;
  const M=(window as unknown as {DeviceMotionEvent?:PermissionEvent}).DeviceMotionEvent;
  try{
   // Both requests are invoked synchronously inside the same user gesture on iOS.
   const tasks:Promise<string>[]=[];
   if(O)tasks.push(O.requestPermission?O.requestPermission() : Promise.resolve('granted'));
   if(M)tasks.push(M.requestPermission?M.requestPermission() : Promise.resolve('granted'));
   const result=await Promise.allSettled(tasks);
   const granted=result.some(x=>x.status==='fulfilled'&&x.value==='granted');
   remember(granted?'granted':'denied');setAccess(granted?'listening':'denied');
  }catch{remember('denied');setAccess('denied')}
 },[]);
 useEffect(()=>{
  if(access!=='listening'&&access!=='live'&&access!=='unavailable')return;
  const angle=()=>screen.orientation?.angle??(window as unknown as {orientation?:number}).orientation??0;
  const receive=(sample:NonNullable<ReturnType<typeof orientationSample>>)=>{
   liveSampleAt.current=performance.now();if(sample.degrees>18)lastSide.current=sample.side;
   if(!options.current.simulator)feedTilt(engine.current,sample,liveSampleAt.current);
   if(options.current.access!=='live')setAccess('live');
  };
  const orientation=(event:DeviceOrientationEvent)=>{if(event.beta===null||event.gamma===null)return;const sample=orientationSample(event.beta,event.gamma,angle());if(sample){orientationAt.current=performance.now();receive({...sample,stationary:lastStable.current})}};
  const motion=(event:DeviceMotionEvent)=>{
   const rotation=event.rotationRate;const user=event.acceleration;
   lastStable.current=Math.hypot(rotation?.alpha||0,rotation?.beta||0,rotation?.gamma||0)<12&&Math.hypot(user?.x||0,user?.y||0,user?.z||0)<1.2;
   if(performance.now()-orientationAt.current<750)return;
   const g=event.accelerationIncludingGravity;if(g?.x==null||g.y==null||g.z==null)return;
   const sample=gravitySample(g.x,g.y,g.z,angle());if(sample)receive({...sample,stationary:sample.stationary&&lastStable.current});
  };
  window.addEventListener('deviceorientation',orientation,{passive:true});window.addEventListener('devicemotion',motion,{passive:true});
  const timeout=setTimeout(()=>{if(!liveSampleAt.current)setAccess('unavailable')},5000);
  return()=>{clearTimeout(timeout);window.removeEventListener('deviceorientation',orientation);window.removeEventListener('devicemotion',motion)};
 },[access]);
 useEffect(()=>{
  let raf=0,last=0,travel=0,inner:HTMLElement|null=null,innerScale=1;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const measure=()=>{if(!stage.current||!moving.current)return;travel=Math.max(0,stage.current.clientHeight-moving.current.clientHeight);inner=moving.current.querySelector('.marker-content');if(inner)innerScale=Math.min(1,(moving.current.clientHeight-30)/inner.clientWidth)};
  const resize=new ResizeObserver(measure);if(stage.current)resize.observe(stage.current);if(moving.current)resize.observe(moving.current);measure();
  const frame=(time:number)=>{
   const cfg=options.current;const dt=last?(time-last)/1000:1/60;last=time;
   if(cfg.simulator)feedTilt(engine.current,{degrees:cfg.tilt,side:cfg.simReverse?-1:1,stationary:true},time);
   else if(cfg.access!=='live')feedTilt(engine.current,{degrees:cfg.access==='prompt'||cfg.access==='listening'?90:0,side:1,stationary:true},time);
   const elapsed=Math.min(dt,.15),steps=Math.max(1,Math.ceil(elapsed/(1/60)));
   let result=stepMotion(engine.current,elapsed/steps,cfg.reverse,reduced.matches);
   for(let i=1;i<steps;i++)result=stepMotion(engine.current,elapsed/steps,cfg.reverse,reduced.matches);
   if(moving.current){moving.current.style.transform=`translate3d(0,${(travel*result.position).toFixed(2)}px,0)`;moving.current.dataset.position=result.position.toFixed(3);moving.current.dataset.rotation=result.rotation.toFixed(1);moving.current.dataset.settled=String(result.settled)}
   if(inner){const scale=1-(1-innerScale)*Math.abs(Math.sin(result.rotation*Math.PI/180));inner.style.transform=`rotate(${result.rotation.toFixed(2)}deg) scale(${scale.toFixed(3)})`}
   raf=requestAnimationFrame(frame);
  };
  raf=requestAnimationFrame(frame);return()=>{cancelAnimationFrame(raf);resize.disconnect()};
 },[]);
 useEffect(()=>{if(!simulator){engine.current.flatSince=null;engine.current.settled=false;engine.current.side=lastSide.current}},[simulator]);
 return <div className={`smart-display ${simulator?'with-simulator':''}`}>
  <div className="smart-stage" ref={stage} aria-label="Tilt-responsive order marker"><div className="smart-moving" ref={moving}>{children}</div></div>
  {access==='prompt'&&!simulator&&<div className="smart-permission"><button className="icon-button" aria-label="Use manual display" onClick={()=>{remember('dismissed');setAccess('denied')}}><X size={18}/></button><h2>Enable Smart Display</h2><p>TAB uses motion sensors to automatically position your order for your server.</p><button className="button" onClick={enable}>ENABLE</button></div>}
  <div className="smart-status" aria-live="polite"><strong>{status}</strong><p>{copy}</p></div>
  {simulator&&<div className="tilt-simulator"><header><span>PHONE TILT <b>{tilt}°</b></span><button className="icon-button" aria-label="Hide tilt simulator" onClick={()=>onSimulatorChange(false)}><X size={16}/></button></header><Slider aria-label="Phone tilt" aria-valuetext={`${tilt} degrees from flat`} value={[90-tilt]} min={0} max={90} step={1} onValueChange={([v])=>setTilt(90-v)}/><div className="tilt-labels"><span>90° UPRIGHT</span><span>0° FLAT</span></div><label className="reverse-simulator">Reverse server side<Switch aria-label="Reverse server side" checked={simReverse} onCheckedChange={v=>{setSimReverse(v);engine.current.side=v?-1:1}}/></label></div>}
  <div className="smart-toolbar"><div className="smart-support"><span>{simulator?'Tilt simulator':access==='live'?'Smart Display on':access==='listening'?'Connecting motion sensors…':'Manual display'}</span><button className="text-button" onClick={()=>setReverse(r=>!r)} aria-pressed={reverse}><ArrowUpDown size={15}/> Flip server side</button></div><button className="button secondary" onClick={onTab}>TAB · {tabTotal}</button></div>
 </div>
}
