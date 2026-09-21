'use client';

import {useEffect,useRef,useState} from 'react';
import {ArrowRight,History,Plus,QrCode,Search,Settings2,UsersRound,X} from 'lucide-react';
import {fresh,restoreSession,storageKey,totals,type Session} from '@/lib/tab-state';
import {venues,venueById,venuePath,type Venue,type VenueId} from '@/lib/venues';

const money=(cents:number)=>`$${(cents/100).toFixed(2)}`;
type VenueSessions=Record<VenueId,Session>;
const emptySessions=():VenueSessions=>({elsewhere:fresh(),'house-of-yes':fresh(),'babys-all-right':fresh()});

export default function TabHome(){
 const [sessions,setSessions]=useState<VenueSessions>(emptySessions);
 const [search,setSearch]=useState(''),[searchOpen,setSearchOpen]=useState(false);
 const [discoverFilter,setDiscoverFilter]=useState('Bars'),[discoverOpen,setDiscoverOpen]=useState(false);
 const [settingsOpen,setSettingsOpen]=useState(false),[friendsOpen,setFriendsOpen]=useState(false);
 const [qrOpen,setQrOpen]=useState(false),[qrMessage,setQrMessage]=useState(''),[cameraActive,setCameraActive]=useState(false);
 const searchInput=useRef<HTMLInputElement>(null),video=useRef<HTMLVideoElement>(null),stream=useRef<MediaStream|null>(null),scanFrame=useRef<number>(0);
 const query=search.trim().toLowerCase();
 const matches=venues.filter(venue=>`${venue.name} ${venue.location}`.toLowerCase().includes(query));
 const receipts=venues.flatMap(venue=>sessions[venue.id].receipts.map(receipt=>({receipt,venue}))).sort((a,b)=>b.receipt.closedAt-a.receipt.closedAt);
 const latest=receipts[0];
 const activeVenues=venues.filter(venue=>sessions[venue.id].tabId).sort((a,b)=>{
  const activity=(venue:Venue)=>{const session=sessions[venue.id];return session.orders.filter(order=>order.tabId===session.tabId).at(-1)?.createdAt||Number(session.tabId?.split('-')[1])||0};
  return activity(b)-activity(a);
 });
 const activeVenue=activeVenues[0],activeSession=activeVenue&&sessions[activeVenue.id];
 const running=activeSession?totals(activeSession.orders.filter(order=>order.tabId===activeSession.tabId)).total:0;
 const discovered=venues.filter(venue=>venue.categories.includes(discoverFilter));

 useEffect(()=>{
  const refresh=()=>{
   const next=emptySessions();
   for(const venue of venues){
    try{const raw=localStorage.getItem(storageKey(venue.id))||(venue.id==='elsewhere'?localStorage.getItem('tab-elsewhere-v1'):null);if(raw)next[venue.id]=restoreSession(JSON.parse(raw))}catch{}
   }
   setSessions(next);
  };
  refresh();window.addEventListener('storage',refresh);window.addEventListener('pageshow',refresh);
  return()=>{window.removeEventListener('storage',refresh);window.removeEventListener('pageshow',refresh)};
 },[]);
 const openVenue=(venue:Venue)=>window.location.assign(venuePath(venue));
 const goHistory=()=>window.location.assign(`${venuePath(latest?.venue||venues[0])}?view=history`);
 const closeScanner=()=>{cancelAnimationFrame(scanFrame.current);stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;setQrOpen(false);setQrMessage('');setCameraActive(false)};
 useEffect(()=>()=>{cancelAnimationFrame(scanFrame.current);stream.current?.getTracks().forEach(track=>track.stop())},[]);
 async function openScanner(){
  setQrOpen(true);setQrMessage('Starting camera…');
  const api=window as typeof window&{BarcodeDetector?:new(options:{formats:string[]})=>{detect:(source:HTMLVideoElement)=>Promise<Array<{rawValue:string}> >}};
  if(!api.BarcodeDetector||!navigator.mediaDevices?.getUserMedia){setQrMessage('Camera scanning is unavailable here. Choose a venue below.');return}
  try{
   const camera=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});stream.current=camera;
   if(!video.current){camera.getTracks().forEach(track=>track.stop());stream.current=null;return}
   video.current.srcObject=camera;await video.current.play();setCameraActive(true);setQrMessage('Point your camera at a TAB venue code.');
   const detector=new api.BarcodeDetector({formats:['qr_code']});
   const scan=async()=>{
    if(!stream.current||!video.current)return;
    try{for(const result of await detector.detect(video.current)){
     const raw=result.rawValue.trim();let selected:Venue|undefined;
     try{const url=new URL(raw,location.origin);if(url.origin===location.origin){const match=url.pathname.match(/^\/venue\/([^/]+)\/?$/);if(match)selected=venueById(match[1])}}catch{}
     if(!selected&&raw.toLowerCase().startsWith('tab://venue/'))selected=venueById(raw.slice('tab://venue/'.length));
     if(!selected)selected=venues.find(venue=>venue.name.toLowerCase()===raw.toLowerCase());
     if(selected){closeScanner();openVenue(selected);return}
     setQrMessage('This code does not match an available TAB venue.');
    }}catch{setQrMessage('The camera could not read this code. Choose a venue below.')}
    scanFrame.current=requestAnimationFrame(scan);
   };scanFrame.current=requestAnimationFrame(scan);
  }catch{setQrMessage('Camera access is unavailable. Choose a venue below.')}
 }

 return <div className="app home-app">
  <header className="topbar home-topbar"><a className="wordmark" href="/" aria-label="TAB Home">TAB<span className="logo-dot">●</span></a><div className="header-right">{activeVenue&&<a className="tab-nav home-tab-nav" href={`${venuePath(activeVenue)}?view=tab`} aria-label={`${activeVenue.name} tab · ${money(running)}`}>TAB · {money(running)}</a>}<button className="demo-trigger icon-button" aria-label="Home controls" onClick={()=>setSettingsOpen(true)}><Settings2 size={18}/></button></div></header>
  <main className="home-main">
   <div className="home-primary-row"><div className="home-search-wrap"><label className="home-search"><Search size={21} strokeWidth={1.8}/><input ref={searchInput} value={search} onChange={event=>{setSearch(event.target.value);setSearchOpen(true)}} onFocus={()=>setSearchOpen(true)} onBlur={()=>window.setTimeout(()=>setSearchOpen(false),120)} onKeyDown={event=>{if(event.key==='Escape')setSearchOpen(false);if(event.key==='Enter'&&query&&matches.length===1)openVenue(matches[0])}} placeholder="Search bars" aria-label="Search bars" autoComplete="off"/></label>{searchOpen&&query&&<div className="home-results" role="listbox" aria-label="Venue search results">{matches.length?matches.map(venue=><button role="option" aria-selected="false" key={venue.id} onPointerDown={event=>event.preventDefault()} onClick={()=>openVenue(venue)}><strong>{venue.name}</strong><span>{venue.area}</span></button>):<p>No TAB venues match “{search}”.</p>}</div>}</div><button className="home-qr" aria-label="Scan venue QR code" onClick={openScanner}><QrCode size={25} strokeWidth={1.6}/></button></div>

   <section className="home-section home-friends" aria-labelledby="home-friends-title"><div className="home-section-heading"><h2 id="home-friends-title">My friends</h2></div><button className="home-friend-action" onClick={()=>setFriendsOpen(true)}><span className="home-friends-icon"><UsersRound size={19} strokeWidth={1.5}/></span><span>No friends connected</span><strong>Add friends <Plus size={15}/></strong></button></section>

   <section className="home-section" aria-labelledby="home-favorites-title"><div className="home-section-heading"><h2 id="home-favorites-title">Favorites</h2></div><div className="home-shortcuts">{venues.map(venue=><button className="home-shortcut" key={venue.id} onClick={()=>openVenue(venue)}>{venue.name}</button>)}<button className="home-shortcut home-shortcut-add" aria-label="Find another venue" onClick={()=>{searchInput.current?.focus();searchInput.current?.scrollIntoView({behavior:'smooth',block:'start'})}}><Plus size={18}/></button></div></section>

   <section className="home-section" aria-labelledby="home-discover-title"><div className="home-section-heading"><h2 id="home-discover-title">Discover</h2><button className="home-see-all" onClick={()=>setDiscoverOpen(value=>!value)} aria-expanded={discoverOpen}>{discoverOpen?'Hide':'See all'} <ArrowRight size={16}/></button></div><div className="home-filters">{['Bars','Cocktails','Food'].map(choice=><button key={choice} className={discoverFilter===choice?'selected':''} aria-pressed={discoverFilter===choice} onClick={()=>{setDiscoverFilter(choice);setDiscoverOpen(true)}}>{choice}</button>)}</div>{discoverOpen&&<div className="home-discover-links">{discovered.map(venue=><button key={venue.id} onClick={()=>openVenue(venue)}>{venue.name}<ArrowRight size={15}/></button>)}</div>}</section>

   <section className="home-section home-history" aria-labelledby="home-history-title"><div className="home-section-heading"><h2 id="home-history-title">History</h2><button className="home-see-all" onClick={goHistory}>See all <ArrowRight size={16}/></button></div>{latest?<button className="home-history-preview" onClick={goHistory}><History size={17}/><span>{latest.receipt.venue} · {new Date(latest.receipt.closedAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span><strong>{money(latest.receipt.total)}</strong></button>:<button className="home-history-preview" onClick={goHistory}><History size={17}/><span>Your past tabs will appear here.</span><ArrowRight size={15}/></button>}</section>
  </main>
  {settingsOpen&&<div className="home-overlay" onClick={()=>setSettingsOpen(false)}><div className="home-panel" role="dialog" aria-modal="true" aria-label="Home controls" onClick={event=>event.stopPropagation()}><div className="home-panel-heading"><h2>Controls</h2><button className="icon-button" aria-label="Close controls" onClick={()=>setSettingsOpen(false)}><X size={20}/></button></div>{venues.map(venue=><button key={venue.id} className="home-panel-action" onClick={()=>openVenue(venue)}>{venue.name} <ArrowRight size={18}/></button>)}<button className="home-panel-action" onClick={()=>window.location.assign(`${venuePath(venues[0])}?mode=staff`)}>Staff mode <ArrowRight size={18}/></button></div></div>}
  {friendsOpen&&<div className="home-overlay" onClick={()=>setFriendsOpen(false)}><div className="home-panel" role="dialog" aria-modal="true" aria-label="Friends" onClick={event=>event.stopPropagation()}><div className="home-panel-heading"><h2>Friends</h2><button className="icon-button" aria-label="Close friends" onClick={()=>setFriendsOpen(false)}><X size={20}/></button></div><p className="home-panel-note">Friend connections aren’t available in this local demo yet.</p></div></div>}
  {qrOpen&&<div className="home-overlay" onClick={closeScanner}><div className="home-panel home-scanner-panel" role="dialog" aria-modal="true" aria-label="Scan venue QR code" onClick={event=>event.stopPropagation()}><div className="home-panel-heading"><h2>Scan a venue</h2><button className="icon-button" aria-label="Close scanner" onClick={closeScanner}><X size={20}/></button></div><div className="home-camera"><video ref={video} playsInline muted aria-label="QR camera preview"/>{!cameraActive&&<QrCode size={45} strokeWidth={1}/>}</div><p className="home-scanner-message" role="status">{qrMessage}</p><div className="home-scanner-choices">{venues.map(venue=><button className="home-panel-action" key={venue.id} onClick={()=>{closeScanner();openVenue(venue)}}>{venue.name} <ArrowRight size={18}/></button>)}</div></div></div>}
 </div>
}
