'use client';

import {useEffect,useRef,useState} from 'react';
import {ArrowRight,History,QrCode,Search,Settings2,UsersRound,X} from 'lucide-react';
import {STORAGE,fresh,restoreSession,totals,type Session} from '@/lib/tab-state';

const VENUE={id:'elsewhere',name:'Elsewhere',location:'Brooklyn, NY',area:'BROOKLYN',type:'Bars'};
const venueUrl='/venue/elsewhere';
const money=(cents:number)=>`$${(cents/100).toFixed(2)}`;

export default function TabHome(){
 const [session,setSession]=useState<Session>(fresh);
 const [search,setSearch]=useState(''),[searchOpen,setSearchOpen]=useState(false);
 const [filter,setFilter]=useState<'All'|'Bars'>('All');
 const [settingsOpen,setSettingsOpen]=useState(false),[qrOpen,setQrOpen]=useState(false),[qrMessage,setQrMessage]=useState(''),[cameraActive,setCameraActive]=useState(false);
 const [discoverExpanded,setDiscoverExpanded]=useState(false);
 const video=useRef<HTMLVideoElement>(null),stream=useRef<MediaStream|null>(null),scanFrame=useRef<number>(0);
 const latest=session.receipts.at(-1);
 const running=session.tabId?totals(session.orders.filter(o=>o.tabId===session.tabId)).total:0;
 const matches=VENUE.name.toLowerCase().includes(search.trim().toLowerCase())||VENUE.location.toLowerCase().includes(search.trim().toLowerCase());

 useEffect(()=>{
  const refresh=()=>{try{const raw=localStorage.getItem(STORAGE)||localStorage.getItem('tab-elsewhere-v1');setSession(raw?restoreSession(JSON.parse(raw)):fresh())}catch{setSession(fresh())}};
  refresh();window.addEventListener('storage',refresh);window.addEventListener('pageshow',refresh);
  return()=>{window.removeEventListener('storage',refresh);window.removeEventListener('pageshow',refresh)};
 },[]);
 const openVenue=()=>{window.location.assign(venueUrl)};
 const goHistory=()=>{window.location.assign(`${venueUrl}?view=history`)};
 const closeScanner=()=>{cancelAnimationFrame(scanFrame.current);stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;setQrOpen(false);setQrMessage('');setCameraActive(false)};
 useEffect(()=>()=>{cancelAnimationFrame(scanFrame.current);stream.current?.getTracks().forEach(track=>track.stop())},[]);
 async function openScanner(){
  setQrOpen(true);setQrMessage('Starting camera…');
  const api=window as typeof window&{BarcodeDetector?:new(options:{formats:string[]})=>{detect:(source:HTMLVideoElement)=>Promise<Array<{rawValue:string}> >}};
  if(!api.BarcodeDetector||!navigator.mediaDevices?.getUserMedia){setQrMessage('Camera scanning is unavailable here. You can still open Elsewhere below.');return}
  try{
   const camera=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});stream.current=camera;
   if(!video.current){camera.getTracks().forEach(track=>track.stop());return}
   video.current.srcObject=camera;await video.current.play();setCameraActive(true);setQrMessage('Point your camera at a TAB venue code.');
   const detector=new api.BarcodeDetector({formats:['qr_code']});
   const scan=async()=>{
    if(!stream.current||!video.current)return;
    try{for(const result of await detector.detect(video.current)){
      const raw=result.rawValue.trim();let venue='';
      try{const url=new URL(raw,location.origin);if(url.origin===location.origin&&url.pathname.replace(/\/$/,'')===venueUrl)venue=VENUE.id}catch{}
      if(raw.toLowerCase()==='elsewhere'||raw.toLowerCase()==='tab://venue/elsewhere')venue=VENUE.id;
      if(venue===VENUE.id){closeScanner();openVenue();return}
      setQrMessage('This code does not match an available TAB venue.');
    }}catch{setQrMessage('The camera could not read this code. Try searching for the venue.')}
    scanFrame.current=requestAnimationFrame(scan);
   };scanFrame.current=requestAnimationFrame(scan);
  }catch{setQrMessage('Camera access is unavailable. You can still open Elsewhere below.')}
 }

 return <div className="app home-app">
  <header className="topbar home-topbar"><a className="wordmark" href="/" aria-label="TAB Home">TAB<span className="logo-dot">●</span></a><div className="header-right">{session.tabId&&<a className="tab-nav home-tab-nav" href={`${venueUrl}?view=tab`}>TAB · {money(running)}</a>}<button className="demo-trigger icon-button" aria-label="Home controls" onClick={()=>setSettingsOpen(true)}><Settings2 size={18}/></button></div></header>
  <main className="home-main">
   <div className="home-primary-row"><div className="home-search-wrap"><label className="home-search"><Search size={21} strokeWidth={1.8}/><input value={search} onChange={event=>{setSearch(event.target.value);setSearchOpen(true)}} onFocus={()=>setSearchOpen(true)} onBlur={()=>window.setTimeout(()=>setSearchOpen(false),120)} onKeyDown={event=>{if(event.key==='Escape')setSearchOpen(false);if(event.key==='Enter'&&matches&&search.trim())openVenue()}} placeholder="Search bars" aria-label="Search bars" autoComplete="off"/></label>{searchOpen&&search.trim()&&<div className="home-results" role="listbox" aria-label="Venue search results">{matches?<button role="option" aria-selected="false" onPointerDown={event=>event.preventDefault()} onClick={openVenue}><strong>{VENUE.name}</strong><span>{VENUE.area}</span></button>:<p>No TAB venues match “{search}”.</p>}</div>}</div><button className="home-qr" aria-label="Scan venue QR code" onClick={openScanner}><QrCode size={25} strokeWidth={1.6}/></button></div>

   <section className="home-section home-friends" aria-labelledby="home-friends-title"><div className="home-section-heading"><h2 id="home-friends-title">Friends</h2></div><div className="home-friends-empty"><span className="home-friends-icon"><UsersRound size={21} strokeWidth={1.5}/></span><div><strong>No friends connected yet.</strong><p>They’ll appear here when available.</p></div></div></section>

   <section className="home-section" aria-labelledby="home-favorites-title"><div className="home-section-heading"><h2 id="home-favorites-title">Favorites</h2></div><div className="home-favorites-row"><button className="home-favorite-card" onClick={openVenue}><span className="home-favorite-index">01 / VENUE</span><strong>{VENUE.name}</strong><span>{VENUE.location}</span><ArrowRight size={17} className="home-favorite-arrow"/></button></div></section>

   <section className="home-section" aria-labelledby="home-discover-title"><div className="home-section-heading"><h2 id="home-discover-title">Discover</h2><button className="home-see-all" onClick={()=>setDiscoverExpanded(value=>!value)} aria-expanded={discoverExpanded}>{discoverExpanded?'Show less':'See all'} <ArrowRight size={15}/></button></div><div className="home-filters">{(['All','Bars'] as const).map(choice=><button key={choice} className={filter===choice?'selected':''} aria-pressed={filter===choice} onClick={()=>setFilter(choice)}>{choice}</button>)}</div><button className="home-discover-result" onClick={openVenue}><span><strong>{VENUE.name}</strong><small>{VENUE.location}</small></span><ArrowRight size={17}/></button>{discoverExpanded&&<p className="home-discover-note">More TAB venues will appear here when available.</p>}</section>

   <section className="home-section home-history" aria-labelledby="home-history-title"><div className="home-section-heading"><h2 id="home-history-title">History</h2><button className="home-see-all" onClick={goHistory}>See all <ArrowRight size={15}/></button></div>{latest?<button className="home-history-row" onClick={goHistory}><span className="home-history-icon"><History size={20}/></span><span className="home-history-copy"><strong>{latest.venue}</strong><small>{new Date(latest.closedAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})} · {latest.orders.length} round{latest.orders.length===1?'':'s'}</small></span><b>{money(latest.total)}</b></button>:<div className="home-history-empty"><History size={19}/><span>Your closed tabs will appear here.</span></div>}</section>
  </main>
  {settingsOpen&&<div className="home-overlay" onClick={()=>setSettingsOpen(false)}><div className="home-panel" role="dialog" aria-modal="true" aria-label="Home controls" onClick={event=>event.stopPropagation()}><div className="home-panel-heading"><h2>Controls</h2><button className="icon-button" aria-label="Close controls" onClick={()=>setSettingsOpen(false)}><X size={20}/></button></div><button className="home-panel-action" onClick={openVenue}>Open Elsewhere <ArrowRight size={18}/></button><button className="home-panel-action" onClick={()=>window.location.assign(`${venueUrl}?mode=staff`)}>Staff mode <ArrowRight size={18}/></button></div></div>}
  {qrOpen&&<div className="home-overlay" onClick={closeScanner}><div className="home-panel home-scanner-panel" role="dialog" aria-modal="true" aria-label="Scan venue QR code" onClick={event=>event.stopPropagation()}><div className="home-panel-heading"><h2>Scan a venue</h2><button className="icon-button" aria-label="Close scanner" onClick={closeScanner}><X size={20}/></button></div><div className="home-camera"><video ref={video} playsInline muted aria-label="QR camera preview"/>{!cameraActive&&<QrCode size={45} strokeWidth={1}/>}</div><p className="home-scanner-message" role="status">{qrMessage}</p><button className="home-panel-action" onClick={()=>{closeScanner();openVenue()}}>Open Elsewhere <ArrowRight size={18}/></button></div></div>}
 </div>
}
