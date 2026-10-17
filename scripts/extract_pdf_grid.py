"""Optional: re-derive the slot grid directly from the three PDFs (needs: pip install pdfplumber).
Usage: python3 scripts/extract_pdf_grid.py path/to/pdf_folder  -> prints date, period, code (N=Not Available, P=name written, O=blank/open).
No student names are printed or stored."""
import pdfplumber,re,glob,sys,json
folder=sys.argv[1] if len(sys.argv)>1 else '.'
order=['9_28','10_5','10_13'];files=sorted(glob.glob(folder+'/*.pdf'),key=lambda f:next(i for i,o in enumerate(order) if f.split('/')[-1].startswith(o)))
out=[]
for f in files:
  rows=[]
  with pdfplumber.open(f) as pdf:
    for pg in pdf.pages:
      for tb in pg.extract_tables():
        for r in tb:
          m=re.match(r'\s*\w+day,\s*(\d+)/(\d+)/(\d+)',(r[0] or '').replace('\n',' '))
          if m:
            cells=[(c or '').replace('\n',' ').strip() for c in r[1:4]]
            rows.append((f"20{m.group(3)}-{int(m.group(1)):02d}-{int(m.group(2)):02d}",''.join('N' if re.search(r'not\s*available',c,re.I) else 'O' if not c else 'P' for c in cells)))
  for i,(d,c) in enumerate(rows): out.append({'date':d,'period':[3,5,7,9][i//5],'code':c})
print(json.dumps(out))
