# Ручные модели пуфов и банкеток одним файлом: python3 tools/media-v3/free/poufs-make.py — пишет ricca/models3d/free/pouf-*.json и bench-*.json
import json, math
OUT='/home/user/ricca-designs-/ricca/models3d/free/'
def save(s):
    json.dump(s,open(OUT+s['id']+'.json','w'),ensure_ascii=False,indent=1); print(s['id'],'записан,',len(s['items']),'деталей')
V=lambda az=28,el=12,fov=20,zoom=1.1: dict(az=az,el=el,fov=fov,zoom=zoom)
Lg=lambda az=30,contrast=0.5,exposure=1.0: dict(az=az,contrast=contrast,exposure=exposure)
def ring(id, cx, y, cz, rx, rz, n=20, d=0.012, m='fabric'):
    return dict(id=id,k='tube',m=m,d=d,round=0.0,closed=True,pts=[[round(cx+rx*math.cos(2*math.pi*i/n),4),y,round(cz+rz*math.sin(2*math.pi*i/n),4)] for i in range(n)])

# Kvado: квадратная подушка на тонком металлическом основании
save(dict(id='pouf-01',size=[0.90,0.90,0.38],view=V(32,17,22,1.1),light=Lg(exposure=0.92),fab='sambia:9',legs=dict(kind='metal',finish='black'),
 measure=dict(seatH=0.38,legH=0.13),items=[
  dict(id='cushion',p=[0,0.255,0.45],s=[0.90,0.25,0.90],rx=0.07,rz=0.07,rTop=0.07,rBottom=0.05,crown=0.022,bulge=0.008,seamLine=True),
  dict(id='plate',m='legs',p=[0,0.122,0.45],s=[0.82,0.012,0.82],r=0.004),
  dict(id='post',m='legs',p=[-0.30,0.065,0.45],s=[0.022,0.11,0.07],r=0.003,mirror='x'),
  dict(id='runner',m='legs',p=[-0.30,0.007,0.45],s=[0.024,0.014,0.86],r=0.004,mirror='x')]))

# Ovalo: овальный мягкий пуф-«тыква», швы с кантом
save(dict(id='pouf-02',size=[0.80,0.60,0.42],view=V(0,3.5,20,1.1),light=Lg(az=20,exposure=0.95,contrast=0.45),fab='noble:10',
 measure=dict(seatH=0.42),items=[
  dict(id='body',k='cyl',p=[0,0.21,0.30],s=[0.80,0.42,0.60],rTop=0.21,rBottom=0.19,barrel=0.035,crown=0.012,seamLine=True)]))

# Rondo: три круглые подушки стопкой — жёлтая, жёлтая поменьше, серо-зелёная
save(dict(id='pouf-03',size=[0.50,0.50,0.42],view=V(20,12,20,1.0),light=Lg(exposure=1.3,contrast=0.4),fab='coco:9',fab2='coco:10',
 measure=dict(seatH=0.42),items=[
  dict(id='bottom',k='cyl',m='fabric2',p=[0,0.085,0.25],s=[0.50,0.17,0.50],rTop=0.08,rBottom=0.075,barrel=0.02,crown=0.008),
  dict(id='middle',k='cyl',p=[0,0.215,0.25],s=[0.40,0.11,0.40],rTop=0.05,rBottom=0.05,barrel=0.015),
  dict(id='top',k='cyl',p=[0,0.345,0.25],s=[0.50,0.155,0.50],rTop=0.07,rBottom=0.07,barrel=0.02,crown=0.012)]))

# Lineo: банкетка, простёганная в шесть секций, на тёмном цоколе
secs=[dict(id='sec%d'%i,p=[round(-0.625+0.25*i,4),0.24,0.25],s=[0.262,0.36,0.50],rx=0.022 if 0<i<5 else 0.05,rz=0.05,rTop=0.045,rBottom=0.03,crown=0.004,noOcc=True) for i in range(6)]
save(dict(id='bench-01',size=[1.50,0.50,0.42],view=V(28,10,20,1.12),light=Lg(exposure=1.15,contrast=0.45),fab='torrens-plain:12',
 measure=dict(seatH=0.42,legH=0.06,legLabel='Цоколь'),items=[dict(id='plinth',m='matte',p=[0,0.03,0.25],s=[1.34,0.06,0.38],r=0.005)]+secs))

# Sfero: мягкая банкетка со скруглёнными углами на четырёх круглых тёмных опорах
save(dict(id='bench-02',size=[1.50,0.55,0.42],view=V(28,10,20,1.12),light=Lg(exposure=1.05),fab='pique:4',
 measure=dict(seatH=0.42,legH=0.07),items=[
  dict(id='body',p=[0,0.245,0.275],s=[1.50,0.35,0.55],rx=0.13,rz=0.13,rTop=0.10,rBottom=0.09,crown=0.015,bulge=0.008),
  dict(id='ballF',k='cyl',m='matte',p=[-0.60,0.035,0.44],s=[0.075,0.07,0.075],rTop=0.033,rBottom=0.033,mirror='x'),
  dict(id='ballB',k='cyl',m='matte',p=[-0.60,0.035,0.11],s=[0.075,0.07,0.075],rTop=0.033,rBottom=0.033,mirror='x')]))

# Ramo: мягкое сиденье между двумя рамами-опорами цвета тёмной бронзы
save(dict(id='bench-03',size=[1.20,0.54,0.59],view=V(28,10,22,1.1),light=Lg(exposure=1.15,contrast=0.45),fab='alba:8',legs=dict(kind='metal',finish='black'),
 measure=dict(seatH=0.46,legH=0.26),items=[
  dict(id='seat',p=[0,0.36,0.27],s=[1.20,0.20,0.44],rx=0.10,rz=0.09,rTop=0.085,rBottom=0.085,crown=0.012,bulge=0.006),
  dict(id='postF',m='legs',p=[-0.40,0.295,0.5275],s=[0.055,0.59,0.025],r=0.006,mirror='x'),
  dict(id='postB',m='legs',p=[-0.40,0.295,0.0125],s=[0.055,0.59,0.025],r=0.006,mirror='x'),
  dict(id='barTop',m='legs',p=[-0.40,0.5775,0.27],s=[0.055,0.025,0.54],r=0.006,mirror='x'),
  dict(id='barBottom',m='legs',p=[-0.40,0.0125,0.27],s=[0.055,0.025,0.54],r=0.006,mirror='x')]))
