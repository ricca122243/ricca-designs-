import sys, os
from PIL import Image, ImageChops
import numpy as np
R='/home/user/ricca-designs-/ricca'
C=R+'/content/client-photos'
OUT=sys.argv[1]
os.makedirs(OUT,exist_ok=True)
W,H=1200,1500

def save(im,name):
    im=im.convert('RGB')
    assert im.size==(W,H)
    im.save(f'{OUT}/{name}.webp',quality=82,method=6)
    im.resize((600,750),Image.LANCZOS).save(f'{OUT}/{name}-600.webp',quality=80,method=6)

def photo(src,box,name):
    im=Image.open(src).convert('RGB').crop(box)
    assert abs(im.size[0]/im.size[1]-0.8)<0.002, im.size
    save(im.resize((W,H),Image.LANCZOS),name)

def render(src,obj_h=None,obj_w=None,cy=0.52,name=None,bg=None,thr=8):
    im=Image.open(src).convert('RGB')
    bgc=bg or im.getpixel((im.size[0]-4,im.size[1]-4))
    a=np.asarray(im).astype(int); d=np.abs(a-np.array(bgc)).max(axis=2)
    ys,xs=np.where(d>thr); x0,x1,y0,y1=xs.min(),xs.max()+1,ys.min(),ys.max()+1
    ow,oh=x1-x0,y1-y0
    s = (obj_h*H/oh) if obj_h else (obj_w*W/ow)
    im2=im.resize((round(im.size[0]*s),round(im.size[1]*s)),Image.LANCZOS)
    cxo=(x0+x1)/2*s; cyo=(y0+y1)/2*s
    canvas=Image.new('RGB',(W,H),tuple(bgc))
    canvas.paste(im2,(round(W/2-cxo),round(H*cy-cyo)))
    print(name,'obj',ow,oh,'scale %.2f'%s,'-> obj %dx%d (%.0f%% w, %.0f%% h)'%(ow*s,oh*s,100*ow*s/W,100*oh*s/H))
    save(canvas,name)

photo(C+'/05-sofa-boucle-chaise-white.jpg',(0,40,960,1240),'cover-sofas')
photo(C+'/partner/LIKELY-comocasa-barolo-bedroom-b.jpg',(0,0,2048,2560),'cover-beds')
photo(C+'/26-armchair-round-cream-ball.jpg',(0,80,960,1280),'cover-armchairs')
photo(C+'/39-fabrics-swatch-books.jpg',(0,80,1920,2480),'cover-fabrics')
render(R+'/img/catalog/p-chair-arre.webp',obj_h=0.46,name='cover-chairs')
render(R+'/img/catalog/p-table-albino.webp',obj_w=0.80,name='cover-tables')
render(R+'/img/catalog/p-table-meda.webp',obj_w=0.62,name='cover-tables-meda')
render(R+'/img/catalog/p-storage-aquino.webp',obj_w=0.70,name='cover-storage')
render(R+'/img/eluna/seq/f24.webp',obj_w=0.80,cy=0.5,name='cover-mattresses',bg=(0,0,0),thr=12)
render(R+'/img/eluna/seq/f01.webp',obj_w=0.84,cy=0.5,name='cover-mattresses-closed',bg=(0,0,0),thr=12)
