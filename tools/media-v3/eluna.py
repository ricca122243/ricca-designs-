import subprocess, sys
from PIL import Image
src='/home/user/ricca-designs-/ricca/img/eluna/seq/f%02d.webp'
W,H,fps=1280,720,25
fr=[Image.open(src%i).convert('RGB').resize((W,H),Image.LANCZOS) for i in range(1,25)]
def sm(x): x=max(0,min(1,x)); return x*x*(3-2*x)
import numpy as np
g=[np.asarray(f.convert('L').resize((320,180)),float) for f in fr]
d=[np.abs(g[i+1]-g[i]).mean() for i in range(23)]
m=sum(d)/23
wts=[(x+m)/2 for x in d]
cum=[0]
for x in wts: cum.append(cum[-1]+x)
def idx(e):
    target=e*cum[-1]
    for k in range(23):
        if cum[k+1]>=target:
            return k+(target-cum[k])/(cum[k+1]-cum[k])
    return 23.0
hold, move = 0.5, 1.5
T = 2*hold + 2*move  # 4.0 s
seq=[]
n=round(T*fps)
for i in range(n):
    t=i/fps
    if t<hold: p=0
    elif t<hold+move: p=idx(sm((t-hold)/move))
    elif t<2*hold+move: p=23
    else: p=idx(1-sm((t-2*hold-move)/move))
    seq.append(p)
out=sys.argv[1]
cmd=['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(fps),'-i','-',
     '-vf','scale=out_color_matrix=bt709:out_range=tv,format=yuv420p','-c:v','libx264','-crf','6','-preset','medium',
     '-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-color_range','tv',out]
pr=subprocess.Popen(cmd,stdin=subprocess.PIPE)
for p in seq:
    a=int(p); f=p-a
    im=fr[a] if f<1e-6 or a>=23 else Image.blend(fr[a],fr[a+1],f)
    pr.stdin.write(im.tobytes())
pr.stdin.close(); pr.wait()
print('frames',n,'T',T)
