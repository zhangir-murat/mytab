export type Item = { id:string; name:string; short:string; description:string; price:number; category:string; popular?:boolean };
export type Line = Item & { qty:number; modifier?:string; key:string };
export type Status = 'new'|'making'|'ready'|'delivering'|'delivered';
export type Color = { name:string; hex:string; ink:string };
export type Order = { id:number; number:number; venue:string; items:Line[]; subtotal:number; tax:number; tip:number; total:number; paymentStatus:'paid'|'on-tab'; paymentMethod:string; createdAt:number; status:Status; color:Color; deliveryItems:Line[]; deliveredCount:number; tabId:string };
export type Receipt = { id:string; venue:string; closedAt:number; orders:Order[]; subtotal:number; tax:number; tip:number; total:number; paidBefore:number; charged:number; paymentMethod:string };
export type Session = { version:2; orders:Order[]; cart:Line[]; tabId:string|null; authorizedMethod:string|null; nextId:number; nextNumber:number; receipts:Receipt[]; lastClosedId:string|null };
export const STORAGE='tab-elsewhere-v2';
export const COLORS:Color[]=[{name:'Lime',hex:'#c0fb42',ink:'#111707'},{name:'Orange',hex:'#ff781f',ink:'#151008'},{name:'Blue',hex:'#2464f2',ink:'#ffffff'},{name:'Yellow',hex:'#ffe447',ink:'#171504'},{name:'Pink',hex:'#ff57b1',ink:'#240818'},{name:'Cyan',hex:'#43e5ed',ink:'#072022'},{name:'Purple',hex:'#8953e7',ink:'#ffffff'}];
export const fresh=():Session=>({version:2,orders:[],cart:[],tabId:null,authorizedMethod:null,nextId:47,nextNumber:47,receipts:[],lastClosedId:null});
export const sum=(lines:Line[])=>lines.reduce((n,i)=>n+i.price*100*i.qty,0);
export function totals(orders:Order[]){
 const subtotal=orders.reduce((n,o)=>n+o.subtotal,0);
 const unpaid=orders.filter(o=>o.paymentStatus!=='paid');
 const paid=orders.filter(o=>o.paymentStatus==='paid');
 const tipBase=unpaid.reduce((n,o)=>n+o.subtotal,0);
 const tax=Math.round(tipBase*.08875)+paid.reduce((n,o)=>n+o.tax,0);
 const legacyTips=paid.reduce((n,o)=>n+(o.tip||0),0);
 const paidBefore=paid.reduce((n,o)=>n+o.total,0);
 const total=subtotal+tax+legacyTips;
 return {subtotal,tax,total,paidBefore,legacyTips,tipBase,due:Math.max(0,total-paidBefore)};
}
export function authorize(s:Session,method:string,now=Date.now()):Session{
 if(!['Apple Pay','Google Pay','Card'].includes(method))throw new Error('Choose a payment method.');
 if(s.authorizedMethod&&s.tabId)return s;
 return {...s,tabId:s.tabId||`tab-${now}-${s.nextId}`,authorizedMethod:method,lastClosedId:null};
}
export function placeOrder(s:Session,lines:Line[],fromCart:boolean,now=Date.now()){
 if(!s.tabId||!s.authorizedMethod)throw new Error('Open your tab first.');
 if(!lines.length||lines.some(i=>!Number.isInteger(i.qty)||i.qty<1||i.qty>99||!Number.isFinite(i.price)||i.price<0))throw new Error('Check your order quantities.');
 const usedNumbers=new Set(s.orders.filter(o=>o.status!=='delivered'||o.tabId===s.tabId).map(o=>o.number));
 let number=s.nextNumber;let tries=0;
 while(usedNumbers.has(number)&&tries<990){number=number>=999?10:number+1;tries++}
 if(usedNumbers.has(number))throw new Error('All order numbers are in use. Please try again later.');
 const usedColors=new Set(s.orders.filter(o=>o.status!=='delivered').map(o=>o.color.name));
 const preferred=COLORS.map((_,i)=>COLORS[((s.nextId-47)%COLORS.length+i+COLORS.length)%COLORS.length]);
 const color=preferred.find(c=>!usedColors.has(c.name))||preferred[0];
 const subtotal=sum(lines),tax=Math.round(subtotal*.08875);
 const items=lines.map(i=>({...i}));
 const order:Order={id:s.nextId,number,venue:'Elsewhere',items,subtotal,tax,tip:0,total:subtotal+tax,paymentStatus:'on-tab',paymentMethod:s.authorizedMethod,createdAt:now,status:'new',color,deliveryItems:items.slice(0,2),deliveredCount:0,tabId:s.tabId};
 return {order,session:{...s,orders:[...s.orders,order],nextId:s.nextId+1,nextNumber:number>=99?10:number+1,cart:fromCart?[]:s.cart}};
}
export function tipAmount(choice:string|null,custom:string,base:number):number|null{
 if(choice===null)return null;
 if(choice==='custom')return /^(?:\d{1,4})(?:\.\d{1,2})?$/.test(custom)?Math.round(Number(custom)*100):null;
 return ['0','18','20','25'].includes(choice)?Math.round(base*Number(choice)/100):null;
}
export function settleTab(s:Session,tip:number,now=Date.now()){
 if(!s.tabId||!s.authorizedMethod)throw new Error('No open tab.');
 const orders=s.orders.filter(o=>o.tabId===s.tabId);
 if(orders.some(o=>o.status!=='delivered'))throw new Error('Wait until every round is delivered.');
 if(s.cart.length)throw new Error('Send or remove your unplaced items first.');
 if(!Number.isSafeInteger(tip)||tip<0||tip>999999)throw new Error('Enter a valid tip amount.');
 const t=totals(orders);
 const closedOrders=orders.map(o=>({...o,paymentStatus:'paid' as const}));
 const receipt:Receipt={id:s.tabId,venue:'Elsewhere',closedAt:now,orders:closedOrders,subtotal:t.subtotal,tax:t.tax,tip:t.legacyTips+tip,total:t.total+tip,paidBefore:t.paidBefore,charged:t.due+tip,paymentMethod:s.authorizedMethod};
 return {receipt,session:{...s,orders:s.orders.map(o=>o.tabId===s.tabId?{...o,paymentStatus:'paid' as const}:o),receipts:[...s.receipts,receipt],cart:[],tabId:null,authorizedMethod:null,lastClosedId:receipt.id}};
}
// Preserve v1 paid rounds and credit them at closeout: an update must never charge them twice.
export function restoreSession(value:unknown):Session{
 const s=value as Partial<Session>&{closed?:boolean};
 if(!s||!Array.isArray(s.orders)||!Array.isArray(s.cart))return fresh();
 if(s.version===2&&Array.isArray(s.receipts))return s as Session;
 const initial=fresh();
 const orders=s.orders.map(o=>({...o,number:o.number??o.id,paymentStatus:'paid' as const}));
 const groups=new Map<string,Order[]>();orders.forEach(o=>groups.set(o.tabId,[...(groups.get(o.tabId)||[]),o]));
 const currentId=!s.closed&&s.tabId?s.tabId:null;
 const receipts:Receipt[]=[];
 for(const [id,rows] of groups){if(id===currentId)continue;const t=totals(rows);receipts.push({id,venue:'Elsewhere',closedAt:Math.max(...rows.map(o=>o.createdAt)),orders:rows,subtotal:t.subtotal,tax:t.tax,tip:t.legacyTips,total:t.total,paidBefore:t.total,charged:0,paymentMethod:rows[0].paymentMethod})}
 return {...initial,orders,cart:s.cart,tabId:currentId,authorizedMethod:currentId?(groups.get(currentId)?.[0]?.paymentMethod||null):null,receipts,nextId:s.nextId||47,nextNumber:(s.nextId||47)<=99?(s.nextId||47):10,lastClosedId:s.closed?(receipts.at(-1)?.id||null):null};
}
