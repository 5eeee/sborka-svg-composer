import fs from 'node:fs/promises';
const script = `<script type="module">
const pause=ms=>new Promise(r=>setTimeout(r,ms));
for(let i=0;i<100;i++){if(document.images.length>=13&&[...document.images].every(i=>i.complete&&i.naturalWidth>0))break;await pause(100);}
await document.fonts.ready;
let serial=0;
for(const img of [...document.images]){
 const raw=await (await fetch(img.src)).text();
 const svg=new DOMParser().parseFromString(raw,'image/svg+xml').documentElement;
 const style=getComputedStyle(img); for(const p of style)svg.style.setProperty(p,style.getPropertyValue(p));
 const prefix='capture'+serial+++'_';
 for(const n of [svg,...svg.querySelectorAll('*')]){for(const a of [...n.attributes]){let v=a.value;if(a.name==='id')v=prefix+v;else v=v.replace(/url\\(#([^)]*)\\)/g,(_,id)=>'url(#'+prefix+id+')');if(v!==a.value)n.setAttribute(a.name,v);}}
 svg.setAttribute('aria-label',img.alt||img.parentElement.textContent.trim());img.replaceWith(document.importNode(svg,true));
}
const modal=new URLSearchParams(location.search).get('modal');if(modal){const ids={svg:'importBtn',palette:'paletteFileBtn',project:'loadProjectBtn'};document.getElementById(ids[modal])?.click();}
const capture=document.createElement('script');capture.src='https://mcp.figma.com/mcp/html-to-design/capture.js';capture.async=true;document.body.append(capture);
</script>`;
let html=await fs.readFile('index.html','utf8');await fs.writeFile('capture.html',html.replace('</body>',script+'</body>'));

