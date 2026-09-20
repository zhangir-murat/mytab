const clamp=(n:number,lo=0,hi=1)=>Math.max(lo,Math.min(hi,n));
export const smooth=(a:number,b:number,n:number)=>{const t=clamp((n-a)/(b-a));return t*t*(3-2*t)};
export type FlowState={target:number;filtered:number;flowProgress:number;velocity:number;rawTilt:number|null;rawFlow:number;baseline:number|null;armed:boolean;manual:boolean;manualTarget:0|1;manualFrom:number;manualElapsed:number;manualBaseline:number|null;intentSince:number|null;endpoint:0|1|null};
export const createFlow=():FlowState=>({target:0,filtered:0,flowProgress:0,velocity:0,rawTilt:null,rawFlow:0,baseline:null,armed:false,manual:false,manualTarget:1,manualFrom:0,manualElapsed:0,manualBaseline:null,intentSince:null,endpoint:0});
export function receiveTilt(s:FlowState,degrees:number,time:number){
 if(!Number.isFinite(degrees))return;
 const tilt=clamp(degrees,0,90);s.rawTilt=tilt;s.rawFlow=1-tilt/90;
 // The first real reading establishes a baseline. Permission never sets a target.
 if(s.baseline===null){s.baseline=tilt;return}
 if(s.manual){
  s.manualBaseline??=tilt;
  if(Math.abs(tilt-s.manualBaseline)>12){s.intentSince??=time;if(time-s.intentSince<160)return;s.manual=false;s.armed=true;s.intentSince=null}
  else{s.intentSince=null;return}
 }
 if(!s.armed){if(Math.abs(tilt-s.baseline)<4)return;s.armed=true}
 let target=s.rawFlow;
 // Endpoint hysteresis absorbs flat/upright noise, releasing on intentional tilt.
 if(s.endpoint===0&&target<.065)target=0;
 else if(s.endpoint===1&&target>.935)target=1;
 else {s.endpoint=target<.025?0:target>.975?1:null;if(s.endpoint!==null)target=s.endpoint}
 if(Math.abs(target-s.target)>.004||target===0||target===1)s.target=target;
}
export function manualFlow(s:FlowState,destination:0|1){s.manual=true;s.manualTarget=destination;s.manualFrom=s.flowProgress;s.manualElapsed=0;s.manualBaseline=s.rawTilt;s.intentSince=null;s.target=destination;s.endpoint=destination}
export function scrubFlow(s:FlowState,value:number){s.manual=false;s.intentSince=null;s.target=clamp(value);s.rawFlow=s.target;s.endpoint=null}
export function stepFlow(s:FlowState,elapsed:number){
 if(s.manual){
  // The same scrubbable resin outline travels to either edge in 300 ms.
  s.manualElapsed=Math.min(.3,s.manualElapsed+Math.max(0,elapsed));
  const t=s.manualElapsed/.3,eased=.15*t+.85*t*t*(3-2*t);
  s.flowProgress=s.manualFrom+(s.manualTarget-s.manualFrom)*eased;
  s.filtered=s.flowProgress;s.velocity=0;
  return s.flowProgress;
 }
 const dt=Math.min(Math.max(elapsed,.001),.15),steps=Math.ceil(dt/(1/60)),h=dt/steps;
 for(let i=0;i<steps;i++){
  s.filtered+=(s.target-s.filtered)*(1-Math.exp(-h/(s.manual?.12:.075)));
  const k=s.manual?48:110,damping=s.manual?14:22;
  s.velocity+=(k*(s.filtered-s.flowProgress)-damping*s.velocity)*h;s.flowProgress=clamp(s.flowProgress+s.velocity*h);
 }
 if(Math.abs(s.flowProgress-s.target)<.0002&&Math.abs(s.velocity)<.002&&Math.abs(s.filtered-s.target)<.0002){s.flowProgress=s.target;s.velocity=0;s.filtered=s.target}
 return s.flowProgress;
}
export function nextDestination(s:FlowState):0|1 {return s.manual?(s.manualTarget===1?0:1):s.flowProgress>=.5?0:1}
// One closed, symmetrical cubic outline. No filters, droplets, moving rectangle, or raster textures.
// Each key is [progress, top/H, bottom/H, top half-width/W, bottom half-width/W, neck half-width/W, waist/H].
export function resinPath(progress:number,width:number,height:number,cardHeight:number){
 const p=clamp(progress),h=Math.min(cardHeight,height*.44),r=Math.min(34,width*.1),w=width/2,c=width/2;
 const keys=[
  [0,1-h/height,1,1,1,1,1-h/height/2],
  [.15,1-h/height-.08,1,.30,.99,.38,1-h/height*.72],
  [.35,.065,1,.61,.91,.075,.50],
  [.5,0,1,.82,.82,.065,.5],
  [.65,0,.935,.91,.61,.075,.50],
  [.85,0,h/height+.08,.99,.30,.38,h/height*.72],
  [1,0,h/height,1,1,1,h/height/2]
 ];
 let i=0;while(i<keys.length-2&&p>keys[i+1][0])i++;
 const a=keys[i],b=keys[i+1],t=smooth(a[0],b[0],p),v=a.map((x,j)=>x+(b[j]-x)*t);
 const y0=v[1]*height,y1=v[2]*height,wt=v[3]*w,wb=v[4]*w,wn=v[5]*w,ym=v[6]*height;
 const rt=Math.min(r,wt*.55,(ym-y0)*.4),rb=Math.min(r,wb*.55,(y1-ym)*.4),top=ym-y0,bot=y1-ym;
 const f=(n:number)=>n.toFixed(2);
 return `M ${f(c-wt+rt)} ${f(y0)} H ${f(c+wt-rt)} Q ${f(c+wt)} ${f(y0)} ${f(c+wt)} ${f(y0+rt)} C ${f(c+wt)} ${f(y0+top*.68)} ${f(c+wn)} ${f(ym-top*.34)} ${f(c+wn)} ${f(ym)} C ${f(c+wn)} ${f(ym+bot*.34)} ${f(c+wb)} ${f(y1-bot*.68)} ${f(c+wb)} ${f(y1-rb)} Q ${f(c+wb)} ${f(y1)} ${f(c+wb-rb)} ${f(y1)} H ${f(c-wb+rb)} Q ${f(c-wb)} ${f(y1)} ${f(c-wb)} ${f(y1-rb)} C ${f(c-wb)} ${f(y1-bot*.68)} ${f(c-wn)} ${f(ym+bot*.34)} ${f(c-wn)} ${f(ym)} C ${f(c-wn)} ${f(ym-top*.34)} ${f(c-wt)} ${f(y0+top*.68)} ${f(c-wt)} ${f(y0+rt)} Q ${f(c-wt)} ${f(y0)} ${f(c-wt+rt)} ${f(y0)} Z`;
}
export function textVisibility(progress:number){return {bottom:1-smooth(.015,.14,progress),top:smooth(.86,.985,progress)}};
