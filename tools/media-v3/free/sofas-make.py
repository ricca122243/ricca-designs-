# Ручные модели диванов одним файлом: python3 tools/media-v3/free/sofas-make.py — пишет ricca/models3d/free/sofa-*.json (те, что собраны этим файлом)
import json, math
OUT='/home/user/ricca-designs-/ricca/models3d/free/'
def save(s):
    json.dump(s,open(OUT+s['id']+'.json','w'),ensure_ascii=False,indent=1); print(s['id'],'записан,',len(s['items']),'деталей')
V=lambda az=0,el=5,fov=18,zoom=1.15: dict(az=az,el=el,fov=fov,zoom=zoom)
Lg=lambda az=20,contrast=0.5,exposure=1.0: dict(az=az,contrast=contrast,exposure=exposure)
def pillow(id, x, y, z, w=0.46, h=0.46, t=0.16, yaw=0, lean=-104, m='fabric'):
    return dict(id=id,k='part',role='decor',decorKind='pillow',m=m,decor=True,p=[x,y,z],s=[w,t,h],rot=[lean,yaw,0])

# Tarva: трёхместный, корпус-оболочка из бежевой кожи, три подушки сиденья и три спинки в серой ткани
save(dict(id='sofa-41',size=[2.30,0.95,0.80],view=V(0,4,18,1.15),light=Lg(az=15,exposure=1.05),fab='sambia:9',fab2='ricca-leather:8',
 measure=dict(seatH=0.46,armH=0.58,armW=0.06,seatD=0.70,legH=0.08,legLabel='Цоколь'),items=[
  dict(id='plinth',m='matte',p=[0,0.04,0.50],s=[1.80,0.08,0.55],r=0.005),
  dict(id='shell',k='ushell',m='fabric2',p=[0,0,0.0],W=2.30,D=0.93,h=0.60,armH=0.58,tS=0.06,tB=0.06,r=0.20,y0=0.14,rTop=0.03),
  dict(id='base',m='fabric2',p=[0,0.16,0.49],s=[2.22,0.16,0.88],rx=0.18,rz=0.10,rTop=0.02,rBottom=0.08),
  dict(id='seatC',p=[0,0.33,0.535],s=[0.725,0.27,0.80],rx=0.05,rz=0.13,rzBack=0.03,rTop=0.10,rBottom=0.09,crown=0.022,bulge=0.012,noOcc=True),
  dict(id='seatS',p=[-0.725,0.33,0.535],s=[0.725,0.27,0.80],rx=0.10,rxBack=0.05,rz=0.13,rzBack=0.03,rTop=0.10,rBottom=0.09,crown=0.022,bulge=0.012,noOcc=True,mirror='x'),
  dict(id='backC',p=[0,0.62,0.19],s=[0.70,0.37,0.20],rx=0.07,rz=0.07,rTop=0.08,rBottom=0.07,crown=0.03,crownFace='z',bulge=0.01,warp=dict(lean=0.05,taperTop=[1,0.85])),
  dict(id='backS',p=[-0.72,0.62,0.19],s=[0.70,0.37,0.20],rx=0.07,rz=0.07,rTop=0.08,rBottom=0.07,crown=0.03,crownFace='z',bulge=0.01,warp=dict(lean=0.05,taperTop=[1,0.85]),mirror='x')]))

# Stegva: модульный простёганный — две низкие платформы и спинка-блок за ними
save(dict(id='sofa-51',size=[3.00,1.00,0.67],view=V(28,13,22,1.15),light=Lg(az=35,exposure=1.1),fab='beauty:13',
 measure=dict(seatH=0.40,seatD=0.72,legH=0.03,legLabel='Цоколь'),items=[
  dict(id='plinthL',m='matte',p=[-0.75,0.015,0.64],s=[1.36,0.03,0.58],r=0.004),
  dict(id='plinthR',m='matte',p=[0.75,0.015,0.64],s=[1.36,0.03,0.58],r=0.004),
  dict(id='platL',p=[-0.752,0.215,0.64],s=[1.495,0.37,0.72],rx=0.07,rz=0.07,rTop=0.07,rBottom=0.05,crown=0.01,tufting='capitone',tuftFace='y',noOcc=True),
  dict(id='platR',p=[0.752,0.215,0.64],s=[1.495,0.37,0.72],rx=0.07,rz=0.07,rTop=0.07,rBottom=0.05,crown=0.01,tufting='capitone',tuftFace='y',noOcc=True),
  dict(id='back',p=[-0.55,0.35,0.15],s=[1.90,0.64,0.30],rx=0.08,rz=0.08,rTop=0.09,rBottom=0.05,crown=0.01,crownFace='z',tufting='capitone',tuftFace='z')]))

# Grava: низкий модульный — шезлонг с подлокотником слева, широкая секция справа с открытым краем, пять подушек
save(dict(id='sofa-33',size=[3.18,1.65,0.67],view=V(-24,10,22,1.15),light=Lg(az=-20,exposure=1.15,contrast=0.45),fab='pique:13',
 measure=dict(seatH=0.38,armH=0.62,armW=0.22,armSide='left',seatD=0.75,legH=0.03,legLabel='Цоколь'),items=[
  dict(id='chaise',p=[-0.97,0.20,0.825],s=[1.24,0.36,1.65],rx=0.07,rz=0.07,rTop=0.06,rBottom=0.05,crown=0.012,seams=[['z',1]]),
  dict(id='seatR',p=[0.62,0.20,0.525],s=[1.94,0.36,1.05],rx=0.07,rz=0.07,rTop=0.06,rBottom=0.05,crown=0.012,seams=[['z',1]]),
  dict(id='backL',p=[-0.86,0.50,0.14],s=[1.02,0.30,0.28],rx=0.05,rz=0.05,rTop=0.05,rBottom=0.03),
  dict(id='armL',p=[-1.48,0.49,0.47],s=[0.22,0.28,0.94],rx=0.05,rz=0.05,rTop=0.05,rBottom=0.03),
  dict(id='backR',p=[0.22,0.50,0.14],s=[1.14,0.30,0.28],rx=0.05,rz=0.05,rTop=0.05,rBottom=0.03),
  pillow('p1',-1.10,0.60,0.37,yaw=8), pillow('p2',-0.72,0.62,0.42,w=0.50,h=0.50,yaw=-6), pillow('p3',-0.20,0.60,0.36,yaw=5), pillow('p4',0.18,0.62,0.42,w=0.50,h=0.50,yaw=-4), pillow('p5',0.55,0.60,0.36,yaw=-10)]))

# Mirva: модульный из скруглённых секций — слева низкая платформа со спинкой, справа шезлонг со спинкой и блоком-подлокотником
save(dict(id='sofa-35',size=[2.20,1.65,0.70],view=V(-14,8,22,1.15),light=Lg(az=-15,exposure=1.1,contrast=0.45),fab='torrens:3',
 measure=dict(seatH=0.38,armH=0.62,armW=0.28,armSide='right',seatD=0.72,legH=0.02,legLabel='Цоколь'),items=[
  dict(id='platL',p=[-0.525,0.20,0.55],s=[1.15,0.37,1.02],rx=0.16,rz=0.16,rTop=0.12,rBottom=0.10,crown=0.012,bulge=0.008),
  dict(id='backLblock',p=[-0.30,0.36,0.15],s=[0.70,0.68,0.30],rx=0.10,rz=0.10,rTop=0.10,rBottom=0.05),
  dict(id='chaiseR',p=[0.575,0.20,0.83],s=[1.05,0.37,1.62],rx=0.16,rz=0.16,rTop=0.12,rBottom=0.10,crown=0.012,bulge=0.008),
  dict(id='backR',p=[0.44,0.36,0.15],s=[0.76,0.68,0.30],rx=0.10,rz=0.10,rTop=0.10,rBottom=0.05),
  dict(id='armR',p=[0.96,0.33,0.40],s=[0.28,0.62,0.78],rx=0.10,rz=0.10,rTop=0.10,rBottom=0.05),
  pillow('p1',0.50,0.66,0.40,w=0.50,h=0.50,yaw=-18,lean=-108)]))
