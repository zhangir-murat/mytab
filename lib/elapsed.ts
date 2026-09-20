export function formatElapsed(createdAt:number,now=Date.now()){
 const seconds=Math.max(0,Math.floor((now-createdAt)/1000));
 const hours=Math.floor(seconds/3600),minutes=Math.floor(seconds/60)%60,remainder=seconds%60;
 const two=(value:number)=>String(value).padStart(2,'0');
 return hours?`${hours}:${two(minutes)}:${two(remainder)}`:`${two(minutes)}:${two(remainder)}`;
}
