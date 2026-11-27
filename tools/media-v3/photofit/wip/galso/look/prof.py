import numpy as np
from PIL import Image
def prof(name, y0, y1, x0, x1, label):
    a=np.asarray(Image.open(name).convert('L')).astype(float)
    p=a[y0:y1, x0:x1].mean(0)
    print(label, f'rows {y0}-{y1}')
    print('  '+' '.join(f'{x}:{int(v)}' for x,v in zip(range(x0,x1), p)))
for (y0,y1) in ((630,660),(690,720),(750,780),(790,810)):
    prof('p-armchair-20-d1.png', y0,y1, 276,350,'front L')
    prof('p-armchair-20-d1.png', y0,y1, 920,994,'front R')
for (y0,y1) in ((620,650),(660,700),(710,740)):
    prof('p-armchair-20.png', y0,y1, 740,830,'main R ear')
    prof('p-armchair-20.png', y0,y1, 268,330,'main L ear')
for (y0,y1) in ((830,870),(900,950),(1000,1040)):
    prof('p-armchair-20.png', y0,y1, 850,910,'main seam')
    prof('p-armchair-20-d1.png', y0,y1, 280,330,'front L low')
    prof('p-armchair-20-d1.png', y0,y1, 940,990,'front R low')
