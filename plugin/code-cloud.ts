const PACKED_TAIL="";
const COMMAND='2137a770-4ae4-432e-8fb5-81003c111a93';
figma.showUI(__html__,{width:1180,height:780,themeColors:true});
figma.root.setRelaunchData({[COMMAND]:'Собрать новую иллюстрацию'});
let busy=false;
figma.ui.onmessage=async(message:{type:string;svg?:string;name?:string;width?:number;height?:number})=>{
 if(message.type==='boot'){figma.ui.postMessage({type:'assets',tail:PACKED_TAIL});return;}
 if(message.type!=='insert'||busy)return;
 busy=true;
 let node:FrameNode|null=null;
 try{
  const raw=message.svg;
  if(typeof raw!=='string'||raw.length>2000000||!raw.includes('<svg')||/<(?:script|image|foreignObject)\b|\bon[a-z]+\s*=/i.test(raw))throw Error('Нужен безопасный векторный SVG до 2 МБ');
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
};