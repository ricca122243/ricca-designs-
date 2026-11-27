import sys, json, numpy as np, lab
import photofit as F
from PIL import Image, ImageDraw
h=0.004
xs=np.arange(-0.60,0.60+1e-9,h); ys=np.arange(-0.60,0.70+1e-9,h); zs=np.arange(0.0,0.80,h)
X,Y,Z=np.meshgrid(xs,ys,zs,indexing='ij'); P=np.stack([X.ravel(),Y.ravel(),Z.ravel()],1)
keep=np.ones(len(P),bool)
for n in lab.NAMES:
    m=lab.clean(n); cam=lab.CAL[n]
    u,v,z=F.project(P,cam); ui=np.round(u).astype(int); vi=np.round(v).astype(int)
    ok=(ui>=0)&(ui<1280)&(vi>=0)&(vi<1280); k=np.zeros(len(P),bool); k[ok]=m[vi[ok],ui[ok]]; keep&=k
H=keep.reshape(X.shape); np.savez_compressed('hull2.npz',H=H,xs=xs,ys=ys,zs=zs)
tiles=[]
for z in (0.12,0.16,0.20,0.24,0.30,0.36,0.42,0.46,0.50,0.56,0.62,0.68,0.70,0.72,0.73,0.736):
    k=int(round(z/h)); s=H[:,:,k]
    im=np.full((len(ys),len(xs),3),255,np.uint8); im[s.T[::-1]]=(120,120,200)
    sc=1.4; t=Image.fromarray(im).resize((int(len(xs)*sc),int(len(ys)*sc)),Image.NEAREST); d=ImageDraw.Draw(t)
    for g in np.arange(-0.6,0.71,0.1):
        px=(g-xs[0])/h*sc; py=(ys[-1]-g)/h*sc
        d.line([(px,0),(px,t.height)],fill=(0,200,200) if abs(g)>1e-6 else (255,0,0)); d.line([(0,py),(t.width,py)],fill=(0,200,200) if abs(g)>1e-6 else (255,0,0))
    d.text((4,4),f'z={z:.3f}',fill=(0,0,0)); tiles.append(t)
w,hh=tiles[0].size; sh=Image.new('RGB',(4*(w+4),4*(hh+4)),'white')
for i,t in enumerate(tiles): sh.paste(t,((i%4)*(w+4),(i//4)*(hh+4)))
sh.save('hull2.jpg',quality=90)
