import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pickObjects,fitObjects,validPalette,OBJECTS} from '../core.mjs';
test('метафора обучения выбирает книгу и наушники',()=>{const r=pickObjects('Обучение без отвлечений');assert.equal(r.matched,true);assert.deepEqual(r.ids,['book','headphones']);});
test('денежный сюжет выбирает исходные денежные объекты',()=>{const r=pickObjects('Накопить на мечту');assert.ok(r.ids.includes('coin'));assert.ok(r.ids.every(id=>OBJECTS.some(o=>o.id===id)));});
test('неизвестный смысл не подменяется случайными объектами',()=>assert.deepEqual(pickObjects('космодром и динозавры'),{ids:[],matched:false}));
test('метафоры интерпретируются в пределах исходной библиотеки',()=>{assert.equal(pickObjects('Свет в конце тоннеля').ids[0],'lamp');assert.equal(pickObjects('Плоды труда').ids[0],'flowers');assert.ok(pickObjects('Финансовая подушка').ids.includes('wallet'));assert.ok(pickObjects('Learning without distractions').ids.includes('book'));});
test('раскладка всех поддержанных форматов остаётся числовой',()=>{for(const [w,h] of [[1200,630],[1080,1080],[1080,1350]])for(let v=0;v<3;v++){const items=fitObjects(['book','lamp','pen','phone'],w,h,v);assert.equal(items.length,4);assert.equal(new Set(items.map(o=>o.uid)).size,4);items.forEach(o=>{assert.ok(o.x>0&&o.x<w);assert.ok(o.y>0&&o.y<h);assert.ok(o.w>0);});}});
test('палитра допускает только ограниченный список hex цветов',()=>{assert.throws(()=>validPalette({background:'url(https://evil)',objects:['red']}));assert.throws(()=>validPalette({background:'#ffffff',objects:['#ffffff','#123456','javascript:bad']}));assert.doesNotThrow(()=>validPalette({background:'#ffffff',objects:['#eeeeee','#aaaaaa','#111111']}));});
