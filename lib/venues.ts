import type {Item} from './tab-state';

export type VenueId = 'elsewhere' | 'house-of-yes' | 'babys-all-right';
export type Venue = {id:VenueId; name:string; location:string; area:string; index:string; heading:string[]; categories:string[]; menu:Item[]};

const elsewhereMenu:Item[] = [
 {id:'margarita',name:'Spicy Margarita',short:'Margarita',description:'Tequila, lime, agave, jalapeño',price:16,category:'Cocktails',popular:true},
 {id:'espresso',name:'Espresso Martini',short:'Espresso Martini',description:'Vodka, espresso, coffee liqueur',price:17,category:'Cocktails',popular:true},
 {id:'old-fashioned',name:'Old Fashioned',short:'Old Fashioned',description:'Bourbon, bitters, demerara, orange',price:16,category:'Cocktails'},
 {id:'negroni',name:'Negroni',short:'Negroni',description:'Gin, Campari, sweet vermouth',price:16,category:'Cocktails'},
 {id:'mule',name:'Moscow Mule',short:'Moscow Mule',description:'Vodka, ginger beer, fresh lime',price:15,category:'Cocktails'},
 {id:'modelo',name:'Modelo',short:'Modelo',description:'Mexican lager · 12 oz',price:8,category:'Beer',popular:true},
 {id:'ipa',name:'IPA',short:'IPA',description:'Hoppy, citrus-forward · 16 oz draft',price:9,category:'Beer'},
 {id:'lager',name:'Lager',short:'Lager',description:'Crisp & refreshing · 16 oz draft',price:8,category:'Beer'},
 {id:'pilsner',name:'Pilsner',short:'Pilsner',description:'Light, clean, golden · 16 oz draft',price:9,category:'Beer'},
 {id:'sauvignon',name:'Sauvignon Blanc',short:'Sauvignon Blanc',description:'Bright citrus, fresh & dry · 6 oz',price:13,category:'Wine'},
 {id:'pinot',name:'Pinot Noir',short:'Pinot Noir',description:'Red berries, soft finish · 6 oz',price:14,category:'Wine'},
 {id:'prosecco',name:'Prosecco',short:'Prosecco',description:'Crisp Italian sparkling · 6 oz',price:13,category:'Wine'},
 {id:'fries',name:'Fries',short:'Fries',description:'Sea salt, house sauce',price:8,category:'Food',popular:true},
 {id:'burger',name:'Burger',short:'Burger',description:'Beef patty, cheddar, pickles, house sauce',price:17,category:'Food'},
 {id:'tenders',name:'Chicken Tenders',short:'Tenders',description:'Crispy chicken, honey mustard',price:14,category:'Food'},
 {id:'pretzel',name:'Pretzel',short:'Pretzel',description:'Warm soft pretzel, whole-grain mustard',price:9,category:'Food'},
];
const byId=(id:string)=>elsewhereMenu.find(item=>item.id===id)!;

export const venues:Venue[] = [
 {id:'elsewhere',name:'Elsewhere',location:'Brooklyn, NY',area:'BROOKLYN',index:'01',heading:['ELSE','WHERE'],categories:['Bars','Cocktails'],menu:elsewhereMenu},
 {id:'house-of-yes',name:'House of Yes',location:'Brooklyn, NY',area:'BROOKLYN',index:'02',heading:['HOUSE OF','YES'],categories:['Bars','Cocktails'],menu:[
  {id:'disco-paloma',name:'Disco Paloma',short:'Paloma',description:'Tequila, grapefruit, lime, soda',price:16,category:'Cocktails',popular:true},
  byId('espresso'),byId('negroni'),byId('modelo'),byId('ipa'),byId('sauvignon'),byId('prosecco'),byId('fries'),byId('pretzel')
 ]},
 {id:'babys-all-right',name:"Baby's All Right",location:'Brooklyn, NY',area:'BROOKLYN',index:'03',heading:["BABY'S ALL",'RIGHT'],categories:['Bars','Food'],menu:[
  {id:'babys-espresso',name:"Baby's Espresso",short:"Baby's Espresso",description:'Vodka, espresso, coffee liqueur',price:17,category:'Cocktails',popular:true},
  byId('old-fashioned'),byId('mule'),byId('lager'),byId('pilsner'),byId('pinot'),byId('fries'),byId('burger'),byId('tenders')
 ]},
];

export const venueById=(id:string):Venue|undefined=>venues.find(venue=>venue.id===id);
export const venuePath=(venue:Venue)=>`/venue/${venue.id}`;
