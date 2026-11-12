# Ручные модели кроватей одним файлом: python3 tools/media-v3/free/beds-make.py — пишет ricca/models3d/free/bed-*.json (общая постель bedset, свои изголовья и основания)
import json, math, csv
OUT='/home/user/ricca-designs-/ricca/models3d/free/'
def round_profile(W, H, R, n=41, left=True, right=True):
    """профиль верха со скруглёнными верхними углами (радиус R) — доли высоты"""
    out=[]
    for i in range(n):
        x=W*i/(n-1); d=min(x if left else 9, (W-x) if right else 9)
        drop = R-math.sqrt(max(0,R*R-(R-d)**2)) if d<R else 0
        out.append(round(1-drop/H,4))
    return out
def legs4(x, zf, zb, h, d=0.022, **kw):
    return [dict(id='legF',k='leg',p=[-x,h/2,zf],s=[d,h,d],mirror='x',**kw), dict(id='legB',k='leg',p=[-x,h/2,zb],s=[d,h,d],mirror='x',**kw)]
def bedset(mTop, z0, mw, ml, mt=0.22, **kw):
    o=dict(id='bed',k='bedset',p=[0,mTop,z0],s=[mw,mt,ml],sheet=True,duvetWhite=True,extras=True,ov=0.02,ovz=0.02,drop=0.03,cover=0.74); o.update(kw); return o
def loop(id, y, x, z0, z1, d=0.008, m='matte', r=0.03):
    return dict(id=id,k='tube',m=m,d=d,round=r,closed=True,pts=[[-x,y,z0],[x,y,z0],[x,y,z1],[-x,y,z1]])
def arch(id, x, y0, y1, z, d=0.008, m='matte', r=0.02):
    return dict(id=id,k='tube',m=m,d=d,round=r,closed=False,pts=[[-x,y0,z],[-x,y1,z],[x,y1,z],[x,y0,z]])
def save(s):
    json.dump(s,open(OUT+s['id']+'.json','w'),ensure_ascii=False,indent=1); print(s['id'],'записан,',len(s['items']),'деталей')
V=lambda az=40,el=2,fov=36,zoom=1.2: dict(az=az,el=el,fov=fov,zoom=zoom)
Lg=lambda az=50,contrast=0.5,exposure=1.0: dict(az=az,contrast=contrast,exposure=exposure)

# Zenal: белое букле, прямая плита изголовья, толстая «парящая» платформа с выступом, тёмный кант
save(dict(id='bed-01',size=[1.80,2.13,1.05],view=V(40,2),light=Lg(exposure=1.4,contrast=0.4),fab='coco:15',
 measure=dict(railH=0.33,mTop=0.50,legH=0.10,legLabel='Цоколь'),items=[
  dict(id='plinth',m='support',p=[0,0.05,1.18],s=[1.30,0.10,1.45],r=0.005),
  dict(id='hb',p=[0,0.575,0.04],s=[1.80,0.95,0.08],rx=0.012,rz=0.012,rTop=0.012,rBottom=0.01),
  dict(id='frame',p=[0,0.215,1.105],s=[1.80,0.23,2.05],rx=0.02,rz=0.02,rTop=0.015,rBottom=0.02),
  loop('pipeFrame',0.328,0.893,0.09,2.123),
  arch('pipeHb',0.893,0.11,1.043,0.078),
  bedset(0.50,0.085,1.60,1.93,mt=0.17)]))

# Nisel: тёмно-синий велюр, толстое изголовье со скруглёнными верхними углами, тонкая царга, чёрные квадратные ножки
save(dict(id='bed-10',size=[1.76,2.13,1.00],view=V(40,2),light=Lg(exposure=1.1),fab='beauty:8',legs=dict(kind='metal',finish='black'),
 measure=dict(railH=0.29,mTop=0.46,legH=0.14),items=[
  dict(id='hb',p=[0,0.57,0.065],s=[1.76,0.86,0.13],rx=0.05,rz=0.05,rTop=0.05,rBottom=0.03,warp=dict(topProfile=round_profile(1.76,0.86,0.24),lean=0.03)),
  dict(id='frame',p=[0,0.215,1.13],s=[1.70,0.15,2.0],rx=0.03,rz=0.03,rTop=0.03,rBottom=0.03),
  bedset(0.46,0.135,1.62,1.96,mt=0.18)]+legs4(0.80,2.07,0.20,0.14,square=True)))

# Unsal: рама изголовья из коричневой кожи, внутри серая фактурная вставка; царга в коже, хромированные ножки
save(dict(id='bed-14',size=[1.76,2.17,1.30],view=V(40,2),light=Lg(exposure=1.0,contrast=0.4),fab='ricca-leather:4',fab2='pique:2',legs=dict(kind='metal',finish='chrome'),
 measure=dict(railH=0.31,mTop=0.48,legH=0.135),items=[
  dict(id='hbPanel',m='fabric2',p=[0,0.68,0.05],s=[1.66,1.10,0.05],r=0.01),
  dict(id='hbBack',p=[0,0.70,0.02],s=[1.74,1.15,0.04],r=0.01),
  dict(id='hbTop',p=[0,1.265,0.045],s=[1.76,0.07,0.09],rx=0.03,rz=0.03,rTop=0.03,rBottom=0.02),
  dict(id='hbSide',p=[-0.85,0.70,0.045],s=[0.06,1.13,0.09],rx=0.025,rz=0.03,rTop=0.02,rBottom=0.02,mirror='x'),
  dict(id='frame',p=[0,0.2225,1.13],s=[1.76,0.175,2.08],rx=0.035,rz=0.035,rTop=0.035,rBottom=0.035),
  bedset(0.48,0.10,1.64,2.03,mt=0.18)]+legs4(0.78,2.08,0.20,0.135,taper=0.5)))

# Darvel: низкий тёмный короб до пола, низкое толстое изголовье, матрас утоплен
save(dict(id='bed-33',size=[2.20,2.45,0.75],view=V(38,9,34,1.15),light=Lg(exposure=1.4,contrast=0.4),fab='lucky:16',
 measure=dict(railH=0.42,mTop=0.57,legH=0.03,legLabel='Цоколь'),items=[
  dict(id='plinth',m='matte',p=[0,0.015,1.33],s=[2.08,0.03,2.10],r=0.005),
  dict(id='hb',p=[0,0.39,0.125],s=[2.20,0.72,0.25],rx=0.05,rz=0.05,rTop=0.05,rBottom=0.03,crown=0.006,crownFace='z'),
  dict(id='base',p=[0,0.225,1.35],s=[2.20,0.39,2.20],rx=0.06,rz=0.06,rTop=0.04,rBottom=0.03),
  bedset(0.57,0.26,1.84,2.02,mt=0.20,extras=False,pillowLean=60)]))

def feet4(x, zf, zb, h=0.04, d=0.06):
    return [dict(id='footF',k='cyl',m='matte',p=[-x,h/2,zf],s=[d,h,d],r=0.005,mirror='x'), dict(id='footB',k='cyl',m='matte',p=[-x,h/2,zb],s=[d,h,d],r=0.005,mirror='x')]

# Irmel: зелёное букле, мягкое округлое основание-«подушка», толстое изголовье со скруглёнными углами и двумя горизонтальными строчками
save(dict(id='bed-02',size=[1.94,2.34,1.00],view=V(38,3,36,1.2),light=Lg(exposure=1.3,contrast=0.45),fab='alba:17',
 measure=dict(railH=0.40,mTop=0.55,legH=0.04),items=[
  dict(id='hb',p=[0,0.52,0.13],s=[1.94,0.96,0.26],rx=0.11,rz=0.11,rTop=0.11,rBottom=0.06,bulge=0.008,warp=dict(topProfile=round_profile(1.94,0.96,0.26))),
  dict(id='seam1',k='tube',m='support',d=0.007,round=0.02,closed=False,pts=[[-0.80,0.86,0.262],[0.80,0.86,0.262]]),
  dict(id='seam2',k='tube',m='support',d=0.007,round=0.02,closed=False,pts=[[-0.86,0.77,0.264],[0.86,0.77,0.264]]),
  dict(id='base',p=[0,0.22,1.26],s=[1.94,0.36,2.16],rx=0.17,rz=0.17,rTop=0.15,rBottom=0.15,bulge=0.012),
  bedset(0.55,0.265,1.64,1.96,mt=0.18,extras=False,pillowLean=72)]+feet4(0.78,2.12,0.30)))

# Mival: горчичное букле, короб до пола, низкое толстое изголовье с мягкими углами
save(dict(id='bed-18',size=[1.86,2.28,0.80],view=V(40,3,36,1.2),light=Lg(exposure=1.05),fab='noble:11',
 measure=dict(railH=0.39,mTop=0.55,legH=0.03,legLabel='Цоколь'),items=[
  dict(id='plinth',m='matte',p=[0,0.015,1.22],s=[1.74,0.03,1.98],r=0.005),
  dict(id='hb',p=[0,0.415,0.11],s=[1.86,0.77,0.22],rx=0.05,rz=0.05,rTop=0.06,rBottom=0.02,warp=dict(topProfile=round_profile(1.86,0.77,0.10),lean=0.04)),
  dict(id='base',p=[0,0.21,1.25],s=[1.86,0.36,2.06],rx=0.035,rz=0.035,rTop=0.03,rBottom=0.02),
  bedset(0.55,0.225,1.66,2.0,mt=0.18)]))

# Lapel: белая тонкая рама на конусных ножках, наклонная белая спинка, на ней две подушки в серой «гусиной лапке»
save(dict(id='bed-31',size=[1.90,2.19,1.05],view=V(0,5,30,1.15),light=Lg(az=20,exposure=1.05),fab='torrens-plain:8',fab2='timeless:1',legs=dict(kind='metal',finish='chrome'),
 measure=dict(railH=0.30,mTop=0.50,legH=0.17),items=[
  dict(id='hbBack',m='fabric2',p=[0,0.66,0.06],s=[1.90,0.78,0.05],r=0.02,warp=dict(lean=0.10)),
  dict(id='hbPad',p=[-0.467,0.77,0.105],s=[0.915,0.52,0.09],rx=0.04,rz=0.035,rTop=0.04,rBottom=0.04,crown=0.008,crownFace='z',warp=dict(lean=0.065),mirror='x'),
  dict(id='frame',m='fabric2',p=[0,0.235,1.145],s=[1.90,0.13,2.09],rx=0.03,rz=0.03,rTop=0.025,rBottom=0.025),
  bedset(0.50,0.15,1.74,2.0,mt=0.20)]+legs4(0.86,2.10,0.18,0.17,taper=0.4)))

# Tavel: тёмно-серая рама и широкие боковины-«уши», внутри светло-серая наклонная спинка из двух панелей; тонкие чёрные ножки
save(dict(id='bed-34',size=[1.96,2.34,1.25],view=V(40,2,36,1.2),light=Lg(exposure=1.45,contrast=0.4),fab='molly:21',fab2='ricca:8',legs=dict(kind='metal',finish='black'),
 measure=dict(railH=0.36,mTop=0.54,legH=0.14),items=[
  dict(id='hbBack',p=[0,0.695,0.04],s=[1.76,1.11,0.08],r=0.02),
  dict(id='hbPanel',m='fabric2',p=[-0.40,0.78,0.13],s=[0.80,0.84,0.10],rx=0.015,rz=0.03,rTop=0.03,rBottom=0.02,warp=dict(lean=0.07),mirror='x'),
  dict(id='wing',p=[-0.93,0.695,0.25],s=[0.10,1.11,0.50],rx=0.035,rz=0.04,rTop=0.035,rBottom=0.02,rot=[0,-7,0],warp=dict(topSlope=[1,0.9]),mirror='x'),
  dict(id='frame',p=[0,0.25,1.21],s=[1.76,0.22,2.26],rx=0.035,rz=0.035,rTop=0.03,rBottom=0.03),
  bedset(0.54,0.20,1.62,2.08,mt=0.18)]+legs4(0.80,2.26,0.30,0.14,d=0.02,taper=0.5)))

def blade(id, x, z):
    """опора-«лезвие»: тонкая стойка и горизонтальная пята"""
    return [dict(id=id+'v',m='legs',p=[x,0.075,z],s=[0.014,0.15,0.05],r=0.003,mirror='x'), dict(id=id+'h',m='legs',p=[x,0.008,z+0.05],s=[0.016,0.016,0.17],r=0.004,mirror='x')]

# Zovel: серо-синий велюр, тонкая платформа на опорах-«лезвиях», низкое наклонное изголовье светлее тоном и боковые «паруса»
save(dict(id='bed-03',size=[2.06,2.30,0.90],view=V(40,2,36,1.2),light=Lg(exposure=1.2,contrast=0.45),fab='torrens-plain:13',legs=dict(kind='metal',finish='black'),
 measure=dict(railH=0.26,mTop=0.45,legH=0.14),items=[
  dict(id='hb',m='fabricL',p=[0,0.56,0.185],s=[1.92,0.68,0.10],rx=0.02,rz=0.03,rTop=0.03,rBottom=0.02,warp=dict(lean=0.13)),
  dict(id='wing',p=[-0.995,0.56,0.17],s=[0.07,0.70,0.14],rx=0.025,rz=0.03,rTop=0.03,rBottom=0.02,warp=dict(taperTop=[1,2.4]),rot=[0,-6,0],mirror='x'),
  dict(id='deck',p=[0,0.20,1.20],s=[1.94,0.115,2.20],rx=0.04,rz=0.04,rTop=0.02,rBottom=0.03),
  bedset(0.45,0.24,1.80,1.99,mt=0.20)]+blade('bladeF',-0.80,1.95)+blade('bladeB',-0.80,0.35)))

# Ivel: коричневый шенилл, тонкая округлая платформа на круглых подпятниках, высокое толстое изголовье с горизонтальной строчкой
save(dict(id='bed-05',size=[1.96,2.24,1.15],view=V(40,3,36,1.2),light=Lg(exposure=1.15,contrast=0.45),fab='molly:6',
 measure=dict(railH=0.20,mTop=0.39,legH=0.06),items=[
  dict(id='hb',p=[0,0.65,0.11],s=[1.74,1.00,0.22],rx=0.07,rz=0.07,rTop=0.07,rBottom=0.10,bulge=0.006,warp=dict(topProfile=[1,0.975,0.965,0.96,0.96,0.96,0.965,0.975,1],lean=0.05)),
  dict(id='seam',k='tube',m='support',d=0.008,round=0.02,closed=False,pts=[[-0.82,0.82,0.19],[0.82,0.82,0.19]]),
  dict(id='base',p=[0,0.13,1.18],s=[1.96,0.14,2.12],rx=0.30,rz=0.30,rTop=0.07,rBottom=0.07),
  bedset(0.39,0.24,1.60,1.96,mt=0.19,extras=False,pillowLean=72)]+feet4(0.70,2.0,0.36,h=0.06,d=0.07)))

# Usnel: голубое, изголовье-«капсула» (вытянутый овал), мягкая округлая платформа на чёрных круглых опорах
save(dict(id='bed-09',size=[2.00,2.16,1.00],view=V(40,2,36,1.2),light=Lg(exposure=1.3,contrast=0.35),fab='sambia:1',
 measure=dict(railH=0.25,mTop=0.45,legH=0.10),items=[
  dict(id='hb',p=[0,0.58,0.06],s=[2.00,0.12,0.84],rx=0.41,rz=0.41,rTop=0.05,rBottom=0.05,rot=[-90,0,0],noOcc=True),
  dict(id='base',p=[0,0.175,1.14],s=[1.88,0.15,2.04],rx=0.14,rz=0.14,rTop=0.07,rBottom=0.07),
  dict(id='footF',k='cyl',m='matte',p=[-0.62,0.05,1.92],s=[0.13,0.10,0.13],rTop=0.02,rBottom=0.04,mirror='x'),
  dict(id='footB',k='cyl',m='matte',p=[-0.62,0.05,0.40],s=[0.13,0.10,0.13],rTop=0.02,rBottom=0.04,mirror='x'),
  bedset(0.45,0.125,1.70,1.98,mt=0.20)]))

# Anvel: горчичный велюр, короб до пола, высокая прямая плита изголовья, на ней две светлые подушки на ремнях
save(dict(id='bed-17',size=[2.00,2.16,1.30],view=V(40,3,36,1.2),light=Lg(exposure=1.05,contrast=0.45),fab='noble:11',fab2='coco:15',
 measure=dict(railH=0.38,mTop=0.55,legH=0.04,legLabel='Цоколь'),items=[
  dict(id='plinth',m='matte',p=[0,0.02,1.13],s=[1.86,0.04,1.92],r=0.005),
  dict(id='hb',p=[0,0.65,0.05],s=[2.00,1.30,0.10],rx=0.02,rz=0.02,rTop=0.02,rBottom=0.01),
  dict(id='pad',m='fabric2',p=[-0.455,0.86,0.135],s=[0.88,0.70,0.07],rx=0.03,rz=0.03,rTop=0.03,rBottom=0.03,crown=0.006,crownFace='z',mirror='x'),
  dict(id='strapA',m='support',p=[-0.22,1.215,0.14],s=[0.04,0.19,0.09],r=0.006,mirror='x'),
  dict(id='strapB',m='support',p=[-0.69,1.215,0.14],s=[0.04,0.19,0.09],r=0.006,mirror='x'),
  dict(id='base',p=[0,0.21,1.13],s=[2.00,0.34,2.06],rx=0.03,rz=0.03,rTop=0.025,rBottom=0.02),
  bedset(0.55,0.105,1.80,1.99,mt=0.19)]))

# Dorel: тёмный графит, мягкое основание из двух половин-«подушек», мягкое наклонное изголовье
save(dict(id='bed-25',size=[2.08,2.48,1.00],view=V(-36,14,34,1.15),light=Lg(az=-30,exposure=1.25,contrast=0.45),fab='alba:6',
 measure=dict(railH=0.40,mTop=0.56,legH=0.04),items=[
  dict(id='hb',p=[0,0.52,0.14],s=[2.08,0.96,0.24],rx=0.10,rz=0.10,rTop=0.10,rBottom=0.06,bulge=0.01,warp=dict(lean=0.08)),
  dict(id='baseHalf',p=[-0.522,0.22,1.36],s=[1.036,0.36,2.24],rx=0.17,rz=0.17,rTop=0.15,rBottom=0.14,bulge=0.012,mirror='x'),
  bedset(0.56,0.30,1.80,2.0,mt=0.18,extras=False,cover=0.6,pillowLean=66)]+feet4(0.80,2.2,0.4,h=0.04,d=0.06)))

# Sarel: бежевое букле, короб до пола из двух половин, изголовье — мягкая подушка в раме из гладкой бежевой кожи
save(dict(id='bed-30',size=[2.04,2.24,1.00],view=V(-36,13,34,1.15),light=Lg(az=-30,exposure=1.1,contrast=0.4),fab='noble:3',fab2='ricca-leather:8',
 measure=dict(railH=0.40,mTop=0.60,legH=0.03,legLabel='Цоколь'),items=[
  dict(id='plinth',m='matte',p=[0,0.015,1.20],s=[1.92,0.03,1.94],r=0.005),
  dict(id='hbShell',m='fabric2',p=[0,0.515,0.035],s=[2.04,0.97,0.07],rx=0.03,rz=0.03,rTop=0.03,rBottom=0.01),
  dict(id='hbSide',m='fabric2',p=[-0.995,0.515,0.11],s=[0.05,0.97,0.16],rx=0.02,rz=0.025,rTop=0.025,rBottom=0.01,mirror='x'),
  dict(id='hbPad',p=[0,0.70,0.15],s=[1.92,0.54,0.17],rx=0.07,rz=0.07,rTop=0.07,rBottom=0.05,crown=0.01,crownFace='z'),
  dict(id='baseHalf',p=[-0.511,0.215,1.21],s=[1.018,0.37,2.06],rx=0.04,rz=0.04,rTop=0.035,rBottom=0.02,mirror='x'),
  bedset(0.60,0.25,1.84,1.95,mt=0.21,extras=False,cover=0.6,pillowLean=66)]))

# Rovel: наклонная «раковина» изголовья из коричневой кожи, шире кверху, внутри светлая тканевая подушка; тонкая царга в коже, хромированные ножки
save(dict(id='bed-32',size=[1.76,2.27,1.10],view=V(40,2,36,1.2),light=Lg(exposure=0.85,contrast=0.45),fab='ricca-leather:4',fab2='coco:15',legs=dict(kind='metal',finish='chrome'),
 measure=dict(railH=0.30,mTop=0.48,legH=0.14),items=[
  dict(id='hbShell',p=[0,0.62,0.19],s=[1.66,0.96,0.08],rx=0.03,rz=0.03,rTop=0.03,rBottom=0.02,warp=dict(topProfile=round_profile(1.66,0.96,0.12),taperTop=[1.06,1],lean=0.15)),
  dict(id='hbPad',m='fabric2',p=[0,0.61,0.235],s=[1.50,0.52,0.07],rx=0.03,rz=0.03,rTop=0.03,rBottom=0.02,warp=dict(topProfile=round_profile(1.50,0.52,0.14),lean=0.075)),
  dict(id='frame',p=[0,0.22,1.215],s=[1.76,0.16,2.11],rx=0.035,rz=0.035,rTop=0.035,rBottom=0.035),
  bedset(0.48,0.26,1.64,1.96,mt=0.18)]+legs4(0.78,2.17,0.30,0.14,taper=0.5)))
