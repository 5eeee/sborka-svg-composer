"""Compare the visible PNG output from exact Figma components with their source nodes."""
import base64, io, json
from pathlib import Path
from PIL import Image, ImageChops
root=Path(__file__).resolve().parent
raw=json.loads((root/'sources/components-all-pixel-proof.json').read_text(encoding='utf-8'))
checks=[]
for sample in raw['samples']:
 a=Image.open(io.BytesIO(base64.b64decode(sample['sourceBase64']))).convert('RGBA')
 b=Image.open(io.BytesIO(base64.b64decode(sample['componentBase64']))).convert('RGBA')
 dimensions=a.size==b.size
 if dimensions:
  background=Image.new('RGBA',a.size,(25,25,28,255))
  difference=ImageChops.difference(Image.alpha_composite(background,a).convert('RGB'),Image.alpha_composite(background,b).convert('RGB'))
  different=sum(any(px) for px in difference.get_flattened_data())
  significant=sum(max(px)>2 for px in difference.get_flattened_data())
  maximum=max(high for low,high in difference.getextrema())
 else:different=significant=-1;maximum=255
 checks.append({'id':sample['id'],'source':sample['source'],'name':sample['name'],'source_size':a.size,'component_size':b.size,'dimensions_equal':dimensions,'visible_pixels_equal':dimensions and different==0,'different_pixels':different,'significant_pixels':significant,'max_channel_difference':maximum,'accepted':dimensions and (significant<=80 and maximum<=28)})
result={'component_count':len(checks),'exact_visible_matches':sum(c['visible_pixels_equal'] for c in checks),'accepted':sum(c['accepted'] for c in checks),'method':'RGBA composited on application background; bounds at scale 1. Up to 80 antialiasing pixels with channel difference <=28 are allowed. Structural/text differences fail.','checks':checks}
(root/'sources/components-pixel-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in result.items() if k!='checks'},ensure_ascii=False))
for c in checks:
 if not c['accepted']:print(json.dumps(c,ensure_ascii=False))
