import { build, transform } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
const root = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFile(path.join(root, p), "utf8");
const manifest = JSON.parse(await read("assets/manifest.json"));
const embedded = {};
for (const a of manifest)
  embedded[
    a.size + ":" + (a.role === "background" ? "background:" : "") + a.id
  ] = await read(a.path);
for (const size of ["S", "L"])
  for (const name of ["lilac", "apricot", "aqua"])
    embedded["canvas:" + size + ":" + name] = await read(
      "assets/backgrounds/" + size + "-" + name + ".svg",
    );
const editor = await read("src/editor.mjs");
const shim = `try{localStorage.getItem('test')}catch{Object.defineProperty(window,'localStorage',{value:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},configurable:true})}`;
const bridge = `
const insert=document.createElement('button');insert.className='primary';insert.id='insertFigma';insert.textContent='Добавить в Figma';document.querySelector('.header-actions').append(insert);
const designButton=document.createElement('button');designButton.textContent='Компоненты макета';designButton.id='designFigma';document.querySelector('.header-actions').append(designButton);designButton.onclick=()=>{const svg=$('#canvas').cloneNode(true);svg.querySelectorAll('[data-selection]').forEach(n=>n.remove());svg.removeAttribute('style');svg.setAttribute('width',state.w);svg.setAttribute('height',state.h);parent.postMessage({pluginMessage:{type:'design',svg:new XMLSerializer().serializeToString(svg),library:Object.fromEntries(OBJECTS.map(o=>[o.id,assets.get('L:'+o.id)]))}},'*');toast('Создаю редактируемые макеты и компоненты…');};
insert.onclick=()=>{try{const out=$('#canvas').cloneNode(true);out.querySelectorAll('[data-selection]').forEach(n=>n.remove());out.removeAttribute('id');out.removeAttribute('style');out.setAttribute('width',state.w);out.setAttribute('height',state.h);insert.disabled=true;parent.postMessage({pluginMessage:{type:'insert',svg:new XMLSerializer().serializeToString(out),name:state.idea||'Композиция',width:state.w,height:state.h}},'*');toast('Создаю векторные слои…');}catch(e){toast(e.message);insert.disabled=false;}};
window.addEventListener('message',e=>{const m=e.data.pluginMessage;if(m?.type==='status'){toast(m.text);insert.disabled=false;}});
`;
let html = (await read("index.html"))
  .replace(/\n\s*/g, " ")
  .replace(/>\s+</g, "><");
const css = (
  await transform(await read("src/styles/editor.css"), {
    loader: "css",
    minify: true,
  })
).code;
const bundled = await build({
  stdin: {
    contents: editor + "\n" + bridge,
    resolveDir: path.join(root, "src"),
    sourcefile: "plugin-entry.mjs",
    loader: "js",
  },
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2017",
  charset: "utf8",
  write: false,
});
const app = bundled.outputFiles[0].text;
html = html.replace(
  /<link\s+rel="stylesheet"\s+href="src\/styles\/editor\.css"\s*\/?>/,
  `<style>${css}\nheader{padding:14px 20px;min-height:80px}.workbench{padding:0 16px 16px;gap:12px;grid-template-columns:220px minmax(0,1fr) 220px}.studio{padding:18px}.library,.inspector{padding:22px 16px}.header-actions button{font-size:12px;padding:10px 14px;min-height:44px}.document-name{display:none}footer{padding:0 20px 15px}.canvas-shell{min-height:0}.inspector{display:block;grid-column:auto}#insertFigma{order:2}.asset{height:auto;min-height:88px}.asset img,.palette-shape{flex-shrink:0}.palette-options button{height:auto;min-height:58px}</style>`,
);
html = html.replace(
  "url(/assets/fonts/Inter-ui.woff2)",
  "url('data:font/woff2;base64," +
    (
      await fs.readFile(path.join(root, "assets/fonts/Inter-ui.woff2"))
    ).toString("base64") +
    "')",
);
const packed = gzipSync(JSON.stringify(embedded)).toString("base64");
const split = Math.ceil(packed.length / 2),
  head = packed.slice(0, split),
  tail = packed.slice(split);
html = html.replace(
  '<script type="module" src="app.js"></script>',
  `<script>${shim}\n(async()=>{try{const tail=await new Promise(resolve=>{const receive=e=>{if(e.data.pluginMessage?.type==='assets'){window.removeEventListener('message',receive);resolve(e.data.pluginMessage.tail);}};window.addEventListener('message',receive);parent.postMessage({pluginMessage:{type:'boot'}},'*');});const bytes=Uint8Array.from(atob('${head}'+tail),c=>c.charCodeAt(0));globalThis.__SBORKA_LIBRARY__=JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());\nglobalThis.__SBORKA_MANIFEST__=Object.entries(globalThis.__SBORKA_LIBRARY__).filter(([key])=>!key.startsWith('canvas:')).map(([key,raw])=>({id:key.split(':').pop(),size:key[0],role:key.includes(':background:')?'background':'main',viewBox:new DOMParser().parseFromString(raw,'image/svg+xml').documentElement.getAttribute('viewBox').split(/[ ,]+/).map(Number)}));\n${app}\n}catch(e){document.getElementById('sceneInfo').textContent='Ошибка загрузки: '+e.message;}})();</script>`,
);
// Docs are bundled with the project; no dead navigation inside a plugin iframe.
html = html.replace(/<a href="(?:README.md|plugin\/README.md)">.*?<\/a>/g, "");
const componentPanel = `<details style="margin:12px 20px;padding:16px;border:1px solid #39393e;border-radius:20px"><summary>Компоненты точного макета</summary><p>Проверка и сборка из перенесённых экранов. Исходный макет сохраняется.</p><button id="componentInspect">Проверить структуру</button><button id="componentBuild">Собрать компоненты</button><button id="componentFinalize">Подготовить сдачу</button><pre id="componentsReport" style="max-height:220px;overflow:auto;white-space:pre-wrap;font:11px monospace"></pre></details><script>for(const [id,type] of [['componentInspect','components-inspect'],['componentBuild','components-build'],['componentFinalize','components-finalize']])document.getElementById(id).onclick=()=>{document.getElementById('componentsReport').textContent='Выполняю…';parent.postMessage({pluginMessage:{type}},'*')};window.addEventListener('message',e=>{if(e.data.pluginMessage?.type==='components-report')document.getElementById('componentsReport').textContent=JSON.stringify(e.data.pluginMessage.report,null,2)});</script>`;
html = html.replace("<body>", "<body>" + componentPanel);
const designGenerator = await read("design-generator.ts");
const code = `${designGenerator}
const PACKED_TAIL='${tail}';
const COMMAND='2137a770-4ae4-432e-8fb5-81003c111a93';
figma.showUI(__html__,{width:1180,height:780,themeColors:true});
figma.root.setRelaunchData({[COMMAND]:'Собрать новую иллюстрацию'});
let busy=false;let componentBusy=false;
figma.ui.onmessage=async(message:{type:string;svg?:string;name?:string;width?:number;height?:number;library?:Record<string,string>})=>{
 if(message.type==='components-inspect'||message.type==='components-build'||message.type==='components-finalize'){if(componentBusy)return;componentBusy=true;try{const report=message.type==='components-inspect'?await inspectExactDesign():message.type==='components-finalize'?await finalizeExactHandoff():await buildExactComponents();figma.ui.postMessage({type:'components-report',report});}catch(e){figma.ui.postMessage({type:'components-report',report:{error:String(e)}});}finally{componentBusy=false;}return;}
 if(message.type==='design'){try{const result=await createResponsiveDesign(String(message.svg||''),message.library||{});figma.ui.postMessage({type:'status',text:'Макеты готовы: desktop, tablet, mobile и отдельные компоненты. '+JSON.stringify(result)});}catch(e){figma.ui.postMessage({type:'status',text:'Ошибка создания макетов: '+String(e)});}return;}
 if(message.type==='boot'){figma.ui.postMessage({type:'assets',tail:PACKED_TAIL});return;}
 if(message.type!=='insert'||busy)return;
 busy=true;
 let node:FrameNode|null=null;
 try{
  const raw=message.svg;
  if(typeof raw!=='string'||raw.length>2000000||!raw.includes('<svg')||/<(?:script|image|foreignObject)\\b|\\bon[a-z]+\\s*=/i.test(raw))throw Error('Нужен безопасный векторный SVG до 2 МБ');
  const w=Number(message.width),h=Number(message.height);
  if(!Number.isFinite(w)||!Number.isFinite(h)||w<200||h<200||w>5000||h>5000)throw Error('Размер холста от 200 до 5000 px');
  const center={...figma.viewport.center};
  node=figma.createNodeFromSvg(raw);
  node.name='Сборка / '+String(message.name||'Композиция').slice(0,100);
  figma.currentPage.appendChild(node);
  node.x=Math.round(center.x-node.width/2);node.y=Math.round(center.y-node.height/2);
  node.setRelaunchData({[COMMAND]:'Открыть Сборку'});
  node.setPluginData('sborka','1');
  figma.currentPage.selection=[node];
  figma.viewport.scrollAndZoomIntoView([node]);
  figma.ui.postMessage({type:'status',text:'Готово. Композиция добавлена редактируемыми векторными слоями.'});
 }catch(e){if(node)node.remove();figma.ui.postMessage({type:'status',text:'Не удалось добавить: '+(e instanceof Error?e.message:String(e))});}
 finally{busy=false;}
};`;
await fs.mkdir(path.join(root, "plugin"), { recursive: true });
await fs.writeFile(path.join(root, "plugin/ui.html"), html);
await fs.writeFile(path.join(root, "plugin/code.ts"), code);
await fs.writeFile(
  path.join(root, "plugin/library.json"),
  JSON.stringify(embedded),
);
const cloudLoader = `const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.hidden=true;const label=document.createElement('section');label.className='library-loader';label.innerHTML='<div class="loader-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/></svg></div><span class="loader-eyebrow">ПЕРВЫЙ ЗАПУСК</span><h1>Ваша библиотека.<br>Всё готово к сборке.</h1><p>Выберите <strong>library.json</strong> из комплекта плагина.<br>40 иллюстраций и 6 фонов останутся внутри Figma.</p><button class="primary" type="button">Загрузить библиотеку</button><span class="loader-status" role="status">JSON · до 3 МБ</span>';label.append(input);label.querySelector('button').onclick=()=>input.click();document.body.prepend(label);document.querySelector('.workbench').style.display='none';document.querySelector('header').style.display='none';globalThis.__SBORKA_LIBRARY__=await new Promise(resolve=>{input.onchange=async()=>{try{const file=input.files[0];if(!file||file.size>3000000)throw Error('Выберите library.json до 3 МБ');label.querySelector('.loader-status').textContent='Проверяю библиотеку…';const data=JSON.parse(await file.text());if(Object.keys(data).length!==46||!Object.values(data).every(s=>typeof s==='string'&&s.includes('<svg')))throw Error('Нужна исходная библиотека library.json');label.remove();document.querySelector('.workbench').style.display='';document.querySelector('header').style.display='';resolve(data);}catch(e){label.querySelector('.loader-status').textContent=e.message;label.querySelector('.loader-status').classList.add('error');input.value='';}};});`;

const start = html.indexOf("const tail=await new Promise"),
  end = html.indexOf("globalThis.__SBORKA_MANIFEST__=", start);
if (start < 0 || end < 0) throw Error("Cloud loader boundary missing");
const cloudHtml = (
  html.slice(0, start) +
  cloudLoader +
  html.slice(end)
).replace(/@font-face\s*\{[^}]*data:font[^}]*\}/g, "");
await fs.writeFile(path.join(root, "plugin/ui-cloud.html"), cloudHtml);
await fs.writeFile(
  path.join(root, "plugin/code-cloud.ts"),
  code.replace(`const PACKED_TAIL='${tail}';`, 'const PACKED_TAIL="";'),
);
await fs.writeFile(
  path.join(root, "plugin/manifest.json"),
  JSON.stringify(
    {
      name: "Сборка",
      id: "2137a770-4ae4-432e-8fb5-81003c111a93",
      api: "1.0.0",
      main: "code.js",
      ui: "ui.html",
      editorType: ["figma"],
      documentAccess: "dynamic-page",
      networkAccess: { allowedDomains: ["none"] },
      relaunchButtons: [
        { command: "2137a770-4ae4-432e-8fb5-81003c111a93", name: "Сборка" },
      ],
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    uiBytes: Buffer.byteLength(html),
    assets: Object.keys(embedded).length,
  }),
);
