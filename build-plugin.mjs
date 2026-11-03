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
document.body.classList.add('sborka-plugin');
const insert=document.createElement('button');insert.className='primary';insert.id='insertFigma';insert.textContent='Добавить в Figma';document.querySelector('.header-actions').append(insert);
const designButton=document.createElement('button');designButton.textContent='Компоненты макета';designButton.id='designFigma';designButton.hidden=true;document.querySelector('.header-actions').append(designButton);designButton.onclick=()=>{const svg=$('#canvas').cloneNode(true);svg.querySelectorAll('[data-selection]').forEach(n=>n.remove());svg.removeAttribute('style');svg.setAttribute('width',state.w);svg.setAttribute('height',state.h);parent.postMessage({pluginMessage:{type:'design',svg:new XMLSerializer().serializeToString(svg),library:Object.fromEntries(OBJECTS.map(o=>[o.id,assets.get('L:'+o.id)]))}},'*');toast('Создаю редактируемые макеты и компоненты…');};
insert.onclick=()=>{try{const out=$('#canvas').cloneNode(true);out.querySelectorAll('[data-selection]').forEach(n=>n.remove());out.removeAttribute('id');out.removeAttribute('style');out.setAttribute('width',state.w);out.setAttribute('height',state.h);insert.disabled=true;parent.postMessage({pluginMessage:{type:'insert',svg:new XMLSerializer().serializeToString(out),name:state.idea||'Композиция',width:state.w,height:state.h}},'*');toast('Создаю векторные слои…');}catch(e){toast(e.message);insert.disabled=false;}};
window.addEventListener('message',e=>{const m=e.data.pluginMessage;if(m?.type==='status'){toast(m.text);insert.disabled=false;}});
`;
let html = (await read("index.html"))
  .replace(
    /<link\s+rel="stylesheet"\s+href="src\/styles\/workspace-polish\.css"\s*\/?>/,
    "",
  )
  .replace(/\n\s*/g, " ")
  .replace(/>\s+</g, "><");
const css = (
  await transform(
    (await read("src/styles/editor.css")) +
      "\n" +
      (await read("src/styles/workspace-polish.css")),
    {
      loader: "css",
      minify: true,
    },
  )
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
  `<style>${css}</style>`,
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
  `<script>${shim}\n(async()=>{try{const tail=await new Promise(resolve=>{const receive=e=>{if(e.data.pluginMessage?.type==='assets'){window.removeEventListener('message',receive);resolve(e.data.pluginMessage.tail);}};window.addEventListener('message',receive);parent.postMessage({pluginMessage:{type:'boot'}},'*');});const bytes=Uint8Array.from(atob('${head}'+tail),c=>c.charCodeAt(0));globalThis.__SBORKA_LIBRARY__=JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());\nglobalThis.__SBORKA_MANIFEST__=Object.entries(globalThis.__SBORKA_LIBRARY__).filter(([key])=>!key.startsWith('canvas:')).map(([key,raw])=>({id:key.split(':').pop(),size:key[0],role:key.includes(':background:')?'background':'main',viewBox:new DOMParser().parseFromString(raw,'image/svg+xml').documentElement.getAttribute('viewBox').split(/[ ,]+/).map(Number)}));\n${app}\n}catch(e){document.getElementById('sceneInfo').textContent='Ошибка загрузки: '+e.message;const boot=document.getElementById('startup');if(boot){boot.classList.add('startup-error');boot.querySelector('[role=status]').textContent='Не удалось запустить редактор. Проверьте соединение.';const retry=document.createElement('button');retry.textContent='Повторить запуск';retry.onclick=()=>location.reload();boot.append(retry);}}})();</script>`,
);
// Docs are bundled with the project; no dead navigation inside a plugin iframe.
html = html.replace(/<a href="(?:README.md|plugin\/README.md)">.*?<\/a>/g, "");
const componentPanel = `<details hidden id="developerTools" style="margin:12px 20px;padding:16px;border:1px solid #39393e;border-radius:20px"><summary>Компоненты точного макета</summary><p>Проверка и сборка из перенесённых экранов. Исходный макет сохраняется.</p><button id="componentInspect">Проверить структуру</button><button id="componentBuild">Собрать компоненты</button><button id="responsiveBuild">Собрать все сценарии</button><button id="responsiveInspect">Сценарии: структура</button><button id="componentFinalize">Подготовить сдачу</button><pre id="componentsReport" style="max-height:220px;overflow:auto;white-space:pre-wrap;font:11px monospace"></pre></details><script>for(const [id,type] of [['responsiveBuild','responsive-build'],['responsiveInspect','responsive-inspect'],['componentInspect','components-inspect'],['componentBuild','components-build'],['componentFinalize','components-finalize']])document.getElementById(id).onclick=()=>{document.getElementById('componentsReport').textContent='Выполняю…';parent.postMessage({pluginMessage:{type}},'*')};window.addEventListener('message',e=>{if(e.data.pluginMessage?.type==='components-report')document.getElementById('componentsReport').textContent=JSON.stringify(e.data.pluginMessage.report,null,2)});</script>`;
html = html.replace(
  "<body>",
  "<body>" +
    componentPanel +
    `<script>document.addEventListener("keydown",e=>{if(e.altKey&&e.shiftKey&&e.code==="KeyD"){const p=document.getElementById("developerTools");p.hidden=!p.hidden;}});if(new URLSearchParams(location.search).has("tools"))document.getElementById("developerTools").hidden=false;</script>`,
);
const designGenerator =
  (await read("design-generator.ts")) +
  "\n" +
  (await read("responsive-flows.ts"));
const code = `${designGenerator}
const PACKED_TAIL='${tail}';
const COMMAND='2137a770-4ae4-432e-8fb5-81003c111a93';
figma.showUI(__html__,{width:1180,height:700,themeColors:true});
figma.root.setRelaunchData({[COMMAND]:'Собрать новую иллюстрацию'});
let busy=false;let componentBusy=false;
figma.ui.onmessage=async(message:{type:string;svg?:string;name?:string;width?:number;height?:number;library?:Record<string,string>})=>{
 if(message.type==='responsive-build'||message.type==='responsive-inspect'||message.type==='components-inspect'||message.type==='components-build'||message.type==='components-finalize'){if(componentBusy)return;componentBusy=true;try{const report=message.type==='responsive-build'?await buildResponsiveFlows():message.type==='responsive-inspect'?await inspectResponsiveStates():message.type==='components-inspect'?await inspectExactDesign():message.type==='components-finalize'?await finalizeExactHandoff():await buildExactComponents();figma.ui.postMessage({type:'components-report',report});}catch(e){figma.ui.postMessage({type:'components-report',report:{error:String(e)}});}finally{componentBusy=false;}return;}
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
await fs.writeFile(path.join(root, "plugin/ui.html"), html.trimEnd());
await fs.writeFile(path.join(root, "plugin/code.ts"), code);
await fs.writeFile(
  path.join(root, "plugin/library.json"),
  JSON.stringify(embedded),
);
const cloudLoader = `await globalThis.__SBORKA_STYLES_READY__;const response=await fetch('https://raw.githubusercontent.com/5eeee/sborka-svg-composer/c0f04ca/plugin/library.json');if(!response.ok)throw Error('Не удалось загрузить библиотеку');const data=await response.json();if(Object.keys(data).length!==46||!Object.values(data).every(s=>typeof s==='string'&&s.includes('<svg')))throw Error('Библиотека повреждена');globalThis.__SBORKA_LIBRARY__=data;`;

const start = html.indexOf("const tail=await new Promise"),
  end = html.indexOf("globalThis.__SBORKA_MANIFEST__=", start);
if (start < 0 || end < 0) throw Error("Cloud loader boundary missing");
let cloudHtml = (html.slice(0, start) + cloudLoader + html.slice(end)).replace(
  /data:font\/woff2;base64,[^']+/g,
  "https://raw.githubusercontent.com/5eeee/sborka-svg-composer/c0f04ca/assets/fonts/Inter-ui.woff2",
);
// Compress the stylesheet to stay within the account-library upload limit.
cloudHtml = cloudHtml.replace(
  /<style>([\s\S]*?)<\/style>/,
  (_match, styles) => {
    const packedCss = gzipSync(styles).toString("base64");
    return `<style>body{margin:0;background:#19191c;color:#f4f3f6}.startup{position:fixed;inset:0;display:grid;place-content:center;background:#19191c;z-index:10000}</style><script>globalThis.__SBORKA_STYLES_READY__=(async()=>{const b=Uint8Array.from(atob('${packedCss}'),c=>c.charCodeAt(0));const css=await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).text();const s=document.createElement('style');s.textContent=css;document.head.append(s);})();</script>`;
  },
);
await fs.writeFile(
  path.join(root, "plugin/ui-cloud.html"),
  cloudHtml.trimEnd(),
);
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
