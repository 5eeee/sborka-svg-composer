export const OBJECTS=[
 {id:'puzzle',name:'Пазлы',tags:['решен','команд','собра','вместе','сложн','задач','связ']},
 {id:'book',name:'Книга',tags:['учеб','обуч','знан','учить','книг','образован','развит']},
 {id:'phone',name:'Телефон',tags:['связ','общен','цифр','онлайн','мобил','информац','звон']},
 {id:'headphones',name:'Наушники',tags:['музык','слуш','аудио','фокус','отвлеч','тишин','подкаст']},
 {id:'lamp',name:'Лампа',tags:['иде','свет','творч','вдохнов','новое','найти']},
 {id:'wallet',name:'Кошелёк',tags:['деньг','бюджет','финанс','покуп','сбереж','расход']},
 {id:'pen',name:'Ручка',tags:['пис','запис','план','договор','документ','замет']},
 {id:'folder',name:'Папка',tags:['работ','поряд','организ','документ','офис','проект']},
 {id:'coin',name:'Монета',tags:['накоп','прибыл','деньг','мечт','инвест','оплат','доход']},
 {id:'flowers',name:'Цветы',tags:['цвет','подар','забот','рост','красот','весн','праздник']}
];
export function pickObjects(text){const t=String(text).toLowerCase().replace(/ё/g,'е');const ranked=OBJECTS.map((o,index)=>({...o,index,score:o.tags.reduce((n,k)=>n+(t.includes(k)?1:0),0)})).filter(o=>o.score>0).sort((a,b)=>b.score-a.score||a.index-b.index);return {ids:ranked.slice(0,4).map(o=>o.id),matched:ranked.length>0};}
export function fitObjects(ids,width,height,variant=0){const layouts=[[[.48,.50,.44],[.72,.67,.28],[.23,.72,.27],[.72,.27,.22]],[[.61,.48,.43],[.30,.70,.30],[.26,.28,.25],[.75,.78,.23]],[[.70,.58,.43],[.42,.75,.30],[.79,.22,.22],[.47,.35,.24]]];const slots=layouts[variant%layouts.length];return ids.map((id,i)=>({uid:'o'+Math.random().toString(36).slice(2,10),id,x:width*slots[i%4][0],y:height*slots[i%4][1],w:Math.min(width,height*1.6)*slots[i%4][2],r:0,background:false}));}
export function clamp(v,min,max){return Math.min(max,Math.max(min,Number(v)||0));}
export function validPalette(data){const hex=/^#[0-9a-f]{6}$/i;if(!data||!hex.test(data.background)||!Array.isArray(data.objects)||data.objects.length<3||data.objects.length>12||!data.objects.every(c=>hex.test(c)))throw Error('Палитра: background и objects (от 3 до 12 цветов #RRGGBB)');if(data.backgroundObjects&&!data.backgroundObjects.every(c=>hex.test(c)))throw Error('Некорректные фоновые цвета');return data;}
