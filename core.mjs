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
const METAPHORS=[
 {terms:['свет в конце','озарение','эврика','искр','bright idea','inspiration'],ids:['lamp']},
 {terms:['знания сила','открыть новые горизонты','пища для ума','learning','education','knowledge'],ids:['book','lamp']},
 {terms:['плечом к плечу','части целого','одна команда','teamwork','together'],ids:['puzzle']},
 {terms:['держать руку на пульсе','на одной волне','быть на связи','communication'],ids:['phone','headphones']},
 {terms:['время деньги','деньги на ветер','финансовая подушка','копейка рубль','money','saving','budget'],ids:['coin','wallet']},
 {terms:['разложить по полочкам','все под контролем','чистый лист','workflow','documents','organize'],ids:['folder','pen']},
 {terms:['расцвести','пустить корни','плоды труда','бизнес растет','growth','care','gift'],ids:['flowers']},
 {terms:['услышать себя','не слышать шум','погрузиться в музыку','music','focus','podcast'],ids:['headphones']}
];

const CONTEXTS=[
 {name:'Обучение и концентрация',words:['обуч','учеб','экзамен','студент','знан','курс','учить','learning','education','knowledge'],main:['book'],support:['headphones'],background:['lamp','pen'],reason:'Книга передаёт обучение, лампа поддерживает тему знаний'},
 {name:'Командная работа',words:['команд','вместе','сотруднич','партнер','плечом к плечу','части целого','teamwork','together'],main:['puzzle'],support:['phone'],background:['folder','pen'],reason:'Пазлы связывают части в целое, папка поддерживает рабочий контекст'},
 {name:'Финансы и накопления',words:['финанс','деньг','накоп','бюджет','сбереж','доход','прибыл','money','saving','budget'],main:['coin','wallet'],support:[],background:['pen','folder'],reason:'Монета и кошелёк передают финансы, ручка поддерживает планирование'},
 {name:'Порядок в работе',words:['документ','работ','организ','поряд','договор','офис','проект','по полочкам','workflow','documents','organize'],main:['folder','pen'],support:[],background:['lamp','phone'],reason:'Папка и ручка передают работу с документами, лампа задаёт рабочую среду'},
 {name:'Музыка и фокус',words:['музык','тишин','концентрац','фокус','отвлеч','подкаст','аудио','music','focus','podcast'],main:['headphones'],support:[],background:['lamp','book'],reason:'Наушники передают концентрацию, лампа поддерживает спокойную рабочую среду'},
 {name:'Идеи и поиск решения',words:['иде','вдохнов','эврика','озарен','решен','свет в конце','bright idea','inspiration'],main:['lamp'],support:['puzzle'],background:['pen','book'],reason:'Лампа передаёт идею, ручка связывает её с воплощением'},
 {name:'Общение и связь',words:['общен','связ','звон','коммуникац','на одной волне','communication'],main:['phone'],support:['headphones'],background:['puzzle','pen'],reason:'Телефон передаёт общение, пазлы поддерживают тему связи'},
 {name:'Рост и забота',words:['забот','рост','растет','расцвест','корни','плоды труда','подар','праздник','growth','care','gift'],main:['flowers'],support:[],background:['lamp','book'],reason:'Цветы передают рост и заботу, лампа поддерживает тему развития'}
];
const ALIASES={puzzle:['пазл','puzzle'],book:['книг','book'],phone:['телефон','смартфон','phone'],headphones:['наушник','headphone'],lamp:['ламп','lamp'],wallet:['кошел','wallet'],pen:['ручк','pen'],folder:['папк','folder'],coin:['монет','coin'],flowers:['цветы','цветок','букет','flower']};
const normalize=t=>String(t).toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9]+/g,' ').trim();
export function analyzeIdea(text){
 const t=normalize(text),excluded=new Set(),explicit=[];
 for(const [id,words] of Object.entries(ALIASES))for(const word of words){if(new RegExp('(?:^| )(?:без|не добавляй|исключи|without|no) (?:\\S+ ){0,1}'+word).test(t))excluded.add(id);else if(t.split(' ').some(token=>token.startsWith(word)))explicit.push(id);}
 const contexts=CONTEXTS.map((c,index)=>({...c,index,score:c.words.reduce((n,k)=>n+(t.includes(k)?1:0),0)})).filter(c=>c.score>0).sort((a,b)=>b.score-a.score||a.index-b.index);
 const boosts=new Map();for(const m of METAPHORS)if(m.terms.some(term=>t.includes(term)))m.ids.forEach((id,i)=>boosts.set(id,(boosts.get(id)||0)+5-i));
 const ranked=OBJECTS.map((o,index)=>({...o,index,score:(boosts.get(o.id)||0)+(explicit.includes(o.id)?8:0)+o.tags.reduce((n,k)=>n+(t.includes(k)?1:0),0)})).filter(o=>o.score>0&&!excluded.has(o.id)).sort((a,b)=>b.score-a.score||a.index-b.index);
 let ids=ranked.slice(0,3).map(o=>o.id);const context=contexts[0];
 if(!ids.length&&context)ids=context.main.filter(id=>!excluded.has(id)).slice(0,2);
 if(ids.length===1&&context&&explicit.length===0){const support=[...context.main,...context.support].find(id=>!ids.includes(id)&&!excluded.has(id));if(support)ids.push(support);}
 if(!ids.length)return {ids:[],matched:false,backgroundIds:[],reason:'Для этой идеи нет уверенного соответствия в библиотеке'};
 const backgroundIds=context?context.background.filter(id=>!ids.includes(id)&&!excluded.has(id)):[];
 return {ids,matched:true,backgroundIds,reason:context?context.reason:'Выбраны предметы, прямо названные в идее'};
}
export function pickObjects(text){const {ids,matched}=analyzeIdea(text);return {ids,matched};}

const RATIOS={puzzle:.58,book:.68,phone:.58,headphones:.78,lamp:1.19,wallet:.63,pen:.56,folder:.53,coin:.66,flowers:1.27};
const intersection=(a,b)=>Math.max(0,Math.min(a.x+a.w/2,b.x+b.w/2)-Math.max(a.x-a.w/2,b.x-b.w/2))*Math.max(0,Math.min(a.y+a.h/2,b.y+b.h/2)-Math.max(a.y-a.h/2,b.y-b.h/2));
export function fitObjects(ids,width,height,variant=0,ratios={}){
 const margin=Math.min(width,height)*.07,placed=[],phase=((variant%11)+11)%11;
 for(const [i,id] of ids.slice(0,4).entries()){
  const ratio=ratios[id]||RATIOS[id]||1;
  const w=Math.min(width*(i===0?.46:.28),height*(i===0?.58:.31)/ratio),h=w*ratio;
  const item={uid:'o'+Math.random().toString(36).slice(2,10),id,x:width*.51,y:height*.55,w,r:0,background:false};
  if(i===0){item.x+=Math.sin(phase*1.7)*width*.035;item.y+=Math.cos(phase*1.3)*height*.025;}
  else{
   let best=null;
   for(let step=0;step<48;step++){
    const angle=(step+phase*2+i*7)*Math.PI/24;
    const x=width*.5+Math.cos(angle)*width*.31,y=height*.51+Math.sin(angle)*height*.29;
    const candidate={x:Math.min(width-margin-w/2,Math.max(margin+w/2,x)),y:Math.min(height-margin-h/2,Math.max(margin+h/2,y)),w,h};
    const overlap=placed.reduce((n,p)=>n+intersection(candidate,p)/Math.min(w*h,p.w*p.h),0);
    const balance=Math.abs(candidate.y/height-(i===1?.68:.27))*.08;
    const score=overlap*20+balance+((step+phase*5)%48)*.0003;
    if(!best||score<best.score)best={...candidate,score};
   }
   item.x=best.x;item.y=best.y;
  }
  item.x=Math.min(width-margin-w/2,Math.max(margin+w/2,item.x));item.y=Math.min(height-margin-h/2,Math.max(margin+h/2,item.y));
  placed.push({...item,h});
 }
 return placed.map(({h,...o})=>o);
}
export function fitBackground(id,width,height,objects,variant=0,ratio=RATIOS[id]||1){
 const w=Math.min(width*.30,height*.43/ratio),h=w*ratio;
 const candidates=[[.20,.24],[.80,.22],[.20,.75],[.80,.75]].map(([x,y],i)=>({x:Math.max(w/2+width*.05,Math.min(width-w/2-width*.05,width*x)),y:Math.max(h/2+height*.05,Math.min(height-h/2-height*.05,height*y)),w,h,i}));
 candidates.sort((a,b)=>{const score=c=>objects.reduce((n,o)=>n+intersection(c,{...o,h:o.w*(RATIOS[o.id]||1)}),0)/(w*h)+((c.i+variant)%4)*.025;return score(a)-score(b);});
 return {uid:'bg'+Math.random().toString(36).slice(2,10),id,x:candidates[0].x,y:candidates[0].y,w,r:0,background:true};
}
export function clamp(v,min,max){return Math.min(max,Math.max(min,Number(v)||0));}
const hex=/^#[0-9a-f]{6}$/i;
const rgb=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
const toHex=a=>'#'+a.map(n=>Math.round(n).toString(16).padStart(2,'0')).join('').toUpperCase();
export function backgroundTones(canvas){const a=rgb(canvas);return [toHex(a.map(v=>v*.65+255*.35)),toHex(a.map(v=>v*.48+40*.52))];}
function hue(c){const [r,g,b]=rgb(c).map(v=>v/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;if(d<.04)return null;return ((max===r?(g-b)/d:max===g?2+(b-r)/d:4+(r-g)/d)*60+360)%360;}
export function validPalette(data){
 if(!data||!hex.test(data.background)||!Array.isArray(data.objects)||data.objects.length<3||data.objects.length>12||!data.objects.every(c=>typeof c==='string'&&hex.test(c)))throw Error('Палитра: background и objects (от 3 до 12 цветов #RRGGBB)');
 const out={background:data.background.toUpperCase(),objects:data.objects.map(c=>c.toUpperCase())};
 const supplied=data.backgroundObjects;
 if(supplied!==undefined&&(!Array.isArray(supplied)||supplied.length<1||supplied.length>2||!supplied.every(c=>typeof c==='string'&&hex.test(c))))throw Error('Для заднего плана нужны 1–2 цвета #RRGGBB в backgroundObjects');
 out.backgroundObjects=(supplied||backgroundTones(data.background)).map(c=>c.toUpperCase());
 const accents=new Set((out.objects.length===8?[1,2,3,5].map(i=>out.objects[i]):out.objects).filter(c=>!['#181817','#000000','#FFFFFF'].includes(c)));
 if(out.backgroundObjects.some(c=>accents.has(c)))throw Error('Цвет заднего плана совпадает с акцентом основных объектов. Выделите отдельные тона в backgroundObjects');
 const hues=out.backgroundObjects.map(hue).filter(h=>h!==null);if(hues.length>1&&Math.min(Math.abs(hues[0]-hues[1]),360-Math.abs(hues[0]-hues[1]))>18)throw Error('Задний план должен быть монохромным: выберите два тона одного оттенка');
 return out;
}
export function recolor(color,palette,background=false){
 if(!palette||!color||color==='none'||color.startsWith('url('))return color;
 const c=color==='white'?'#FFFFFF':color==='black'?'#000000':color.toUpperCase();
 if(background){if(['#FFFFFF','#000000','#181817'].includes(c))return c;const dark=['#7864D7','#D27532','#5ABEBE'].includes(c);const tones=palette.backgroundObjects||backgroundTones(palette.background);return tones[Math.min(dark?1:0,tones.length-1)];}
 const rows=[['#D7CDF5','#F9ECB0','#AA9BF0','#F9A3AA','#7864D7','#FFE3E1','#181817','#FFFFFF'],['#FDD7B9','#F9ECB0','#FAC896','#80DADA','#D27532','#BEEBEB','#181817','#FFFFFF'],['#BEEBEB','#FFD4F2','#80DADA','#6D7BFC','#5ABEBE','#B6C6FE','#181817','#FFFFFF']];
 for(const row of rows){const i=row.indexOf(c);if(i>=0)return i>=6&&palette.objects.length<8?row[i]:palette.objects[i%palette.objects.length];}return color;
}
