from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib, json
root=Path(__file__).resolve().parent
out=root.parent.parent/'outputs'/'Amira_Sborka_FINAL_2026-11-03.zip'
folders=['assets','src','plugin','examples','tests','sources','.github']
files=['app.js','core.mjs','index.html','demo.html','server.mjs','start.cmd','package.json','package-lock.json','build-plugin.mjs','design-generator.ts','responsive-flows.ts','capture-build.mjs','validate-components.py','package-final.py','prepare_assets.py','requirements-assets.txt']
files += [p.name for p in root.glob('*.md')]
paths=[root/f for f in files]
for folder in folders: paths += [p for p in (root/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts]

paths += [p for p in (root/'screenshots'/'components').glob('*.png') if p.name.startswith('final-')]
paths += [root/'CURRENT.json',root/'SPEC-AUDIT.txt',root/'FUNCTIONAL-AUDIT.txt',root/'START-HERE.txt']
paths += list((root/'figma').glob('*.fig')) if (root/'figma').exists() else []
# Exclude engineering inspection dumps and deliberately unsafe test fixtures from the client archive.
paths=[p for p in paths if p.is_file() and p.name not in {'exact-component-inspection.json','security-input.svg','components-all-pixel-proof.json','components-pixel-proof.json','modal-metrics.json','final-archive-verification.json','responsive-structure.json','figma-handoff.json'}]
with ZipFile(out,'w',ZIP_DEFLATED,compresslevel=9) as z:
 for p in sorted(set(paths)): z.write(p,Path('Sborka')/p.relative_to(root))
with ZipFile(out) as z:
 assert z.testzip() is None
 names=z.namelist()
 for required in ['plugin/manifest.json','plugin/code.js','plugin/ui.html','plugin/library.json','sources/task-original.pdf','sources/exact-components-report.json','DESIGN.md']:
  assert 'Sborka/'+required in names,required
 assert not any('/node_modules/' in n or '/.git/' in n or '/.env' in n for n in names)
report={'archive':str(out),'files':len(names),'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'external_submission':'not_sent'}
(root/'sources'/'final-archive-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(report,ensure_ascii=False))
