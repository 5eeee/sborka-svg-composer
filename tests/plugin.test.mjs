import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';

test('плагин ограничивает импорт и создаёт результат без изменения чужих слоёв',async()=>{
 const messages=[],created=[],page={children:[],selection:[],appendChild(n){this.children.push(n);}};
 const figma={root:{setRelaunchData(){}},showUI(){},ui:{postMessage:m=>messages.push(m)},viewport:{center:{x:500,y:400},scrollAndZoomIntoView(){}},currentPage:page,createNodeFromSvg(svg){const n={width:1200,height:630,svg,setRelaunchData(){},setPluginData(){},remove(){this.removed=true;}};created.push(n);return n;}};
 const code=await fs.readFile(new URL('../plugin/code.js',import.meta.url),'utf8');
 vm.runInNewContext(code,{figma,__html__:'<html></html>'});
 await figma.ui.onmessage({type:'insert',svg:'<svg><script>alert(1)</script></svg>',width:1200,height:630});
 assert.equal(created.length,0);assert.match(messages.at(-1).text,/безопасный/);
 await figma.ui.onmessage({type:'insert',svg:'<svg/>',width:10,height:630});assert.equal(created.length,0);
 await figma.ui.onmessage({type:'insert',svg:'<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0L10 10"/></svg>',name:'Проверка',width:1200,height:630});
 assert.equal(created.length,1);assert.equal(page.children.length,1);assert.equal(page.selection[0],created[0]);assert.equal(created[0].x,-100);assert.equal(created[0].y,85);assert.match(messages.at(-1).text,/векторными слоями/);
 await figma.ui.onmessage({type:'boot'});assert.equal(messages.at(-1).type,'assets');assert.ok(messages.at(-1).tail.length>1000);
});

test('оба UI содержат синтаксически корректный скрипт и полную библиотеку',async()=>{
 for(const name of ['ui.html','ui-cloud.html']){const html=await fs.readFile(new URL('../plugin/'+name,import.meta.url),'utf8');const script=html.match(/<script>([\s\S]*)<\/script>/)[1];assert.doesNotThrow(()=>new Function(script));assert.ok(html.includes('Добавить в Figma'));assert.ok(!html.includes('src="app.js"'));}
 const library=JSON.parse(await fs.readFile(new URL('../plugin/library.json',import.meta.url),'utf8'));assert.equal(Object.keys(library).length,40);assert.ok(Object.keys(library).some(k=>k.startsWith('S:background:')));
});
