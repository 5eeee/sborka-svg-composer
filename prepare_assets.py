from pathlib import Path
import xml.etree.ElementTree as ET
import copy,io,json,hashlib,sys
from svgelements import SVG
sys.stdout.reconfigure(encoding='utf-8')
ROOT=Path(__file__).parent
NS='http://www.w3.org/2000/svg'
ET.register_namespace('',NS)
names=['puzzle','book','phone','headphones','lamp','wallet','pen','folder','coin','flowers']
ru=['Пазлы','Книга','Телефон','Наушники','Лампа','Кошелёк','Ручка','Папка','Монета','Цветы']
maps={'L':['Пазлы','Книга','Телефон','Наушники','Лампа','Кошелек','Ручка','Папка','Монета','Group 2136136344'],'S':['Пазлы','Group 2136136335','Телефон','Наушники','Лампа','Кошелек','Group 2136136336','Group 2136136337','Монета','Group 2136136345']}
backgrounds={'L':['Пазлы_2','Книга_2','Телефон_2','Наушники_2','Лампа_2','Кошелек_2','Ручка_2','Папка_2','Монета_2','Group 2136136347'],'S':['Пазлы_2','Group 2136136341','Телефон_2','Наушники_2','Лампа_2','Кошелек_2','Group 2136136343','Group 2136136342','Монета_2','Group 2136136346']}
manifest=[]
for size in ['L','S']:
 source=ROOT/'sources'/f'library-{size}.svg'
 (ROOT/'sources').mkdir(exist_ok=True)
 tree=ET.parse(source).getroot()
 def fixed(s):
  try:return s.encode('latin1').decode('utf-8')
  except:return s
 for el in tree.iter():
  if 'id' in el.attrib:el.set('id',fixed(el.get('id')))
 groups={c.get('id'):c for c in tree[0] if c.tag.endswith('g')}
 for role,keys in [('main',maps[size]),('background',backgrounds[size])]:
  for i,key in enumerate(keys):
   node=groups[key];out=ET.Element('{'+NS+'}svg',{'viewBox':tree.get('viewBox')})
   for d in tree:
    if d.tag.endswith('defs'):out.append(copy.deepcopy(d))
   out.append(copy.deepcopy(node))
   raw=ET.tostring(out,encoding='unicode')
   bounds=SVG.parse(io.StringIO(raw)).bbox()
   x,y,x2,y2=bounds;w=x2-x;h=y2-y
   out.set('viewBox',f'{x} {y} {w} {h}');out.set('width',str(w));out.set('height',str(h))
   rel=f'assets/{size}/'+('background/' if role=='background' else '')+f'{names[i]}.svg'
   target=ROOT/rel;target.parent.mkdir(parents=True,exist_ok=True)
   target.write_text(ET.tostring(out,encoding='unicode'),encoding='utf-8')
   manifest.append({'id':names[i], 'name':ru[i],'size':size,'role':role,'path':rel,'viewBox':[x,y,w,h],'sourceGroup':key,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
(ROOT/'assets'/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(manifest,ensure_ascii=False))
