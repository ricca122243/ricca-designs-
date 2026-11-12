# Ручные модели диванов одним файлом: python3 tools/media-v3/free/sofas-make.py — пишет ricca/models3d/free/sofa-*.json (те, что собраны этим файлом)
import json, math
OUT='/home/user/ricca-designs-/ricca/models3d/free/'
def save(s):
    json.dump(s,open(OUT+s['id']+'.json','w'),ensure_ascii=False,indent=1); print(s['id'],'записан,',len(s['items']),'деталей')
V=lambda az=0,el=5,fov=18,zoom=1.15: dict(az=az,el=el,fov=fov,zoom=zoom)
Lg=lambda az=20,contrast=0.5,exposure=1.0: dict(az=az,contrast=contrast,exposure=exposure)
def pillow(id, x, y, z, w=0.46, h=0.46, t=0.16, yaw=0, lean=-104, m='fabric'):
    return dict(id=id,k='part',role='decor',decorKind='pillow',m=m,decor=True,p=[x,y,z],s=[w,t,h],rot=[lean,yaw,0])

# Tarva: трёхместный, корпус-оболочка из бежевой кожи, три пухлые подушки сиденья и три спинки в серой ткани
save(dict(id='sofa-41',size=[2.30,0.95,0.80],view=V(0,4,18,1.15),light=Lg(az=15,exposure=1.05),fab='sambia:9',fab2='ricca-leather:8',
 measure=dict(seatH=0.47,armH=0.58,armW=0.06,seatD=0.72,legH=0.05,legLabel='Цоколь'),items=[
  dict(id='plinth',m='matte',p=[0,0.025,0.48],s=[1.70,0.05,0.50],r=0.005),
  dict(id='shell',k='ushell',m='fabric2',p=[0,0,0.0],W=2.30,D=0.93,h=0.60,armH=0.58,tS=0.06,tB=0.06,r=0.20,y0=0.12,rTop=0.03),
  dict(id='base',m='fabric2',p=[0,0.115,0.49],s=[2.22,0.13,0.90],rx=0.18,rz=0.10,rTop=0.02,rBottom=0.085),
  dict(id='seatC',p=[0,0.315,0.545],s=[0.73,0.32,0.80],rx=0.06,rz=0.15,rzBack=0.03,rTop=0.12,rBottom=0.11,crown=0.02,bulge=0.014,noOcc=True),
  dict(id='seatS',p=[-0.728,0.315,0.545],s=[0.73,0.32,0.80],rx=0.12,rxBack=0.06,rz=0.15,rzBack=0.03,rTop=0.12,rBottom=0.11,crown=0.02,bulge=0.014,noOcc=True,mirror='x'),
  dict(id='backC',p=[0,0.635,0.20],s=[0.72,0.38,0.22],rx=0.07,rz=0.08,rTop=0.08,rBottom=0.07,crown=0.035,crownFace='z',bulge=0.012,warp=dict(lean=0.05,taperTop=[1,0.8])),
  dict(id='backS',p=[-0.73,0.635,0.20],s=[0.72,0.38,0.22],rx=0.07,rz=0.08,rTop=0.08,rBottom=0.07,crown=0.035,crownFace='z',bulge=0.012,warp=dict(lean=0.05,taperTop=[1,0.8]),mirror='x')]))

# Stegva: модульный простёганный клеткой — слева низкая платформа-пуф, справа платформа со спинкой-блоком
save(dict(id='sofa-51',size=[3.00,1.00,0.67],view=V(-27,13,22,1.15),light=Lg(az=-20,exposure=0.85,contrast=0.55),fab='beauty:13',
 measure=dict(seatH=0.40,seatD=0.72,legH=0.03,legLabel='Цоколь'),items=[
  dict(id='plinthL',m='matte',p=[-0.80,0.015,0.60],s=[1.26,0.03,0.66],r=0.004),
  dict(id='plinthR',m='matte',p=[0.70,0.015,0.60],s=[1.46,0.03,0.62],r=0.004),
  dict(id='platL',p=[-0.802,0.215,0.59],s=[1.395,0.37,0.82],rx=0.07,rz=0.07,rTop=0.07,rBottom=0.05,crown=0.012,tufting='grid',tuftFace='y',noOcc=True),
  dict(id='platR',p=[0.70,0.215,0.64],s=[1.60,0.37,0.72],rx=0.07,rz=0.07,rTop=0.07,rBottom=0.05,crown=0.012,tufting='grid',tuftFace='y',noOcc=True),
  dict(id='back',p=[0.30,0.35,0.15],s=[1.55,0.64,0.30],rx=0.08,rz=0.08,rTop=0.09,rBottom=0.05,crown=0.01,crownFace='z',tufting='grid',tuftFace='z')]))

# Grava: низкий модульный — шезлонг с подлокотником слева, широкая секция справа с открытым краем, пять подушек
save(dict(id='sofa-33',size=[3.18,1.65,0.67],view=V(-24,9,22,1.15),light=Lg(az=-20,exposure=1.1,contrast=0.45),fab='pique:13',
 measure=dict(seatH=0.38,armH=0.60,armW=0.22,armSide='left',seatD=0.75,legH=0.03,legLabel='Цоколь'),items=[
  dict(id='chaise',p=[-0.97,0.20,0.825],s=[1.24,0.36,1.65],rx=0.07,rz=0.07,rTop=0.06,rBottom=0.05,crown=0.012,seams=[['z',1]]),
  dict(id='seatR',p=[0.62,0.20,0.525],s=[1.94,0.36,1.05],rx=0.07,rz=0.07,rTop=0.06,rBottom=0.05,crown=0.012,seams=[['z',1]]),
  dict(id='backL',p=[-0.86,0.48,0.14],s=[1.02,0.26,0.28],rx=0.05,rz=0.05,rTop=0.05,rBottom=0.03),
  dict(id='armL',p=[-1.48,0.47,0.47],s=[0.22,0.26,0.94],rx=0.05,rz=0.05,rTop=0.05,rBottom=0.03),
  dict(id='backR',p=[0.22,0.48,0.14],s=[1.14,0.26,0.28],rx=0.05,rz=0.05,rTop=0.05,rBottom=0.03),
  pillow('p1',-1.12,0.58,0.36,w=0.42,h=0.42,t=0.2,yaw=10), pillow('p2',-0.74,0.60,0.44,w=0.46,h=0.46,t=0.2,yaw=-6), pillow('p3',-0.22,0.58,0.36,w=0.42,h=0.42,t=0.2,yaw=6), pillow('p4',0.16,0.60,0.44,w=0.46,h=0.46,t=0.2,yaw=-5), pillow('p5',0.54,0.58,0.36,w=0.42,h=0.42,t=0.2,yaw=-12)]))

# Mirva: модульный из скруглённых секций — слева низкая платформа со спинкой, справа шезлонг со спинкой и блоком-подлокотником
save(dict(id='sofa-35',size=[2.20,1.65,0.70],view=V(-14,8,22,1.15),light=Lg(az=-15,exposure=1.15,contrast=0.4),fab='torrens:3',
 measure=dict(seatH=0.38,armH=0.62,armW=0.28,armSide='right',seatD=0.72,legH=0.02,legLabel='Цоколь'),items=[
  dict(id='platL',p=[-0.525,0.20,0.55],s=[1.15,0.37,1.02],rx=0.16,rz=0.16,rTop=0.12,rBottom=0.10,crown=0.012,bulge=0.008),
  dict(id='backLblock',p=[-0.36,0.34,0.16],s=[0.80,0.66,0.32],rx=0.11,rz=0.11,rTop=0.11,rBottom=0.05),
  dict(id='chaiseR',p=[0.575,0.20,0.83],s=[1.05,0.37,1.62],rx=0.16,rz=0.16,rTop=0.12,rBottom=0.10,crown=0.012,bulge=0.008),
  dict(id='backR',p=[0.44,0.34,0.16],s=[0.78,0.66,0.32],rx=0.11,rz=0.11,rTop=0.11,rBottom=0.05),
  dict(id='armR',p=[0.96,0.33,0.42],s=[0.28,0.64,0.80],rx=0.11,rz=0.11,rTop=0.11,rBottom=0.05),
  pillow('p1',0.55,0.62,0.42,w=0.48,h=0.48,t=0.2,yaw=-20,lean=-112)]))

def corner_chaise(id, W, D, CH, H, fab, *, armW=0.22, armH=0.58, seatH=0.45, baseY=0.10, chW=0.86, nBack=3, legs=None, legItems=(), view=None, light=None, armSlope=None, seatSplit=1, plinth=None, pillows=True, seatT=0.19):
    """прямой диван с шезлонгом слева (как на фото спереди): корпус, подлокотники с двух сторон, nBack подушек спинки, подушки сиденья"""
    x0, x1 = -W/2, W/2; ax0 = x0 + armW; ax1 = x1 - armW; cx1 = ax0 + chW   # шезлонг: ax0…cx1, основное сиденье: cx1…ax1
    it = []
    if plinth: it.append(dict(id='plinth', m='matte', p=[0, plinth/2, D/2], s=[W-0.3, plinth, D-0.3], r=0.005))
    it.append(dict(id='bodyMain', p=[0, (baseY+seatH-seatT+0.03)/2, D/2], s=[W, seatH-seatT+0.03-baseY, D], rx=0.05, rz=0.05, rTop=0.02, rBottom=0.03))
    it.append(dict(id='bodyChaise', p=[(ax0+cx1)/2-armW/2, (baseY+seatH-seatT+0.03)/2, (D+CH)/2-0.02], s=[chW+armW, seatH-seatT+0.03-baseY, CH-D+0.04], rx=0.05, rz=0.05, rTop=0.02, rBottom=0.03))
    wa = dict(topSlope=armSlope) if armSlope else None
    for sgn, nm in ((-1, 'armL'), (1, 'armR')):
        a = dict(id=nm, p=[sgn*(W/2-armW/2), (baseY+armH)/2, D/2], s=[armW, armH-baseY, D], rx=0.07, rz=0.07, rTop=0.07, rBottom=0.03, bulge=0.006)
        if wa: a['warp'] = wa
        it.append(a)
    it.append(dict(id='backFrame', p=[0, (baseY+H-0.22)/2, 0.08], s=[W-2*armW+0.02, H-0.22-baseY, 0.16], rx=0.03, rz=0.04, rTop=0.04, rBottom=0.02))
    # сиденья
    it.append(dict(id='seatChaise', p=[(ax0+cx1)/2, seatH-seatT/2, (0.17+CH)/2], s=[chW, seatT, CH-0.17], rx=0.07, rz=0.11, rzBack=0.03, rTop=min(0.10,seatT*0.42), rBottom=min(0.08,seatT*0.35), crown=0.02, bulge=0.01, noOcc=True))
    mw = (ax1-cx1)/seatSplit
    for i in range(seatSplit):
        it.append(dict(id='seat%d'%i, p=[cx1+mw*(i+0.5), seatH-seatT/2, (0.17+D)/2+0.01], s=[mw, seatT, D-0.17+0.02], rx=0.06, rz=0.10, rzBack=0.03, rTop=0.08, rBottom=0.05, crown=0.018, bulge=0.008, noOcc=True))
    bw = (ax1-ax0)/nBack
    for i in range(nBack):
        it.append(dict(id='back%d'%i, p=[ax0+bw*(i+0.5), seatH+(H-seatH)/2-0.01, 0.24], s=[bw-0.01, H-seatH+0.04, 0.22], rx=0.07, rz=0.08, rTop=0.09, rBottom=0.06, crown=0.03, crownFace='z', bulge=0.01, warp=dict(lean=0.06, taperTop=[1,0.8]), noOcc=True))
    if pillows:
        it.append(pillow('pL', ax0+0.26, seatH+0.20, 0.42, w=0.50, h=0.40, t=0.17, yaw=22, lean=-118))
        it.append(pillow('pR', ax1-0.26, seatH+0.20, 0.42, w=0.50, h=0.40, t=0.17, yaw=-22, lean=-118))
    it += list(legItems)
    s = dict(id=id, size=[W, CH, H], view=view or V(0,5,18,1.15), light=light or Lg(), fab=fab, measure=dict(seatH=seatH, armH=armH, armW=armW, seatD=round(D-0.33,2), legH=baseY), items=it)
    if legs: s['legs'] = legs
    save(s)

# Serva: серое букле, шезлонг слева, три подушки спинки, низкие мягкие подлокотники, опоры-полозья
corner_chaise('sofa-30', 2.80, 0.98, 1.60, 0.80, 'pique:11', armW=0.22, armH=0.58, seatH=0.45, baseY=0.09, chW=0.80, nBack=3, seatT=0.27, view=V(0,9,18,1.15), light=Lg(az=15,exposure=1.2,contrast=0.45),
  legs=dict(kind='metal',finish='black'), legItems=[dict(id='sledF',m='legs',p=[-0.9,0.045,1.25],s=[0.5,0.09,0.03],r=0.004), dict(id='sledR',m='legs',p=[1.05,0.045,0.80],s=[0.03,0.09,0.20],r=0.004), dict(id='sledB',m='legs',p=[-1.0,0.045,0.2],s=[0.03,0.09,0.2],r=0.004,mirror='x')])

# Solva: жёлтый, шезлонг слева, три подушки спинки, скошенные подлокотники, чёрные конусные ножки
corner_chaise('sofa-31', 3.00, 0.98, 1.65, 0.80, 'coco:9', armW=0.20, armH=0.60, seatH=0.46, baseY=0.13, chW=0.86, nBack=3, seatSplit=2, armSlope=[1,0.82], seatT=0.21, view=V(0,6,18,1.15), light=Lg(az=15,exposure=0.95,contrast=0.45),
  legs=dict(kind='wood',finish='blackwood'), legItems=[dict(id='legA',k='leg',p=[-1.40,0.065,1.55],s=[0.04,0.13,0.04],taper=0.55), dict(id='legB',k='leg',p=[-0.36,0.065,1.55],s=[0.04,0.13,0.04],taper=0.55), dict(id='legC',k='leg',p=[1.40,0.065,0.90],s=[0.04,0.13,0.04],taper=0.55), dict(id='legD',k='leg',p=[-1.40,0.065,0.08],s=[0.04,0.13,0.04],taper=0.55,mirror='x')])

def tubs(id, x0, x1, z1, *, H=0.70, t=0.20, seatH=0.42, armL=False, armR=False, slopeR=None):
    """секция-«ванна»: спинка сзади, при необходимости боковина слева/справа, внутри подушка сиденья"""
    it = [dict(id=id+'Back', p=[(x0+x1)/2, H/2, t/2], s=[x1-x0, H, t], rx=0.07, rz=0.07, rTop=0.07, rBottom=0.03, noOcc=True)]
    sx0, sx1 = x0 + (t if armL else 0), x1 - (t if armR else 0)
    if armL: it.append(dict(id=id+'ArmL', p=[x0+t/2, H/2, z1/2], s=[t, H, z1], rx=0.07, rz=0.07, rTop=0.07, rBottom=0.03, noOcc=True))
    if armR:
        a = dict(id=id+'ArmR', p=[x1-t/2, H/2, z1/2], s=[t, H, z1], rx=0.07, rz=0.07, rTop=0.07, rBottom=0.03, noOcc=True)
        if slopeR: a['warp'] = dict(topSlope=slopeR)
        it.append(a)
    it.append(dict(id=id+'Base', p=[(sx0+sx1)/2, (seatH-0.16)/2, (t+z1)/2], s=[sx1-sx0, seatH-0.16, z1-t], rx=0.05, rz=0.06, rTop=0.02, rBottom=0.03))
    it.append(dict(id=id+'Seat', p=[(sx0+sx1)/2, seatH-0.09, (t+z1)/2+0.005], s=[sx1-sx0-0.01, 0.19, z1-t], rx=0.07, rz=0.10, rzBack=0.03, rTop=0.08, rBottom=0.05, crown=0.018, bulge=0.008, noOcc=True))
    return it

# Kanva: оливковый твид с тёмным кантом, две секции-«ванны»: длинная слева и глубокая справа
k = tubs('L', -1.50, 0.28, 1.00, armL=True) + tubs('R', 0.30, 1.50, 1.50, armR=True, slopeR=[1,0.86])
k += [dict(id='pipeL',k='tube',m='matte',d=0.012,round=0.07,closed=False,pts=[[-1.30,0.705,0.98],[-1.30,0.705,0.20],[0.28,0.705,0.20]]),
      dict(id='pipeR',k='tube',m='matte',d=0.012,round=0.07,closed=False,pts=[[0.30,0.705,0.20],[1.30,0.705,0.20],[1.30,0.62,1.48]]),
      pillow('p1',-1.02,0.66,0.40,w=0.52,h=0.44,t=0.18,yaw=14,lean=-112,m='fabric2'), pillow('p2',-0.62,0.63,0.46,w=0.42,h=0.38,t=0.16,yaw=-10,lean=-114,m='decor'), pillow('p3',0.86,0.66,0.42,w=0.52,h=0.44,t=0.18,yaw=-16,lean=-112,m='fabric2')]
save(dict(id='sofa-50',size=[3.00,1.50,0.70],view=V(0,7,18,1.15),light=Lg(az=15,exposure=0.76,contrast=0.5),fab='alba:16',fab2='molly:22',
 measure=dict(seatH=0.42,armH=0.70,armW=0.20,seatD=0.80,legH=0.02,legLabel='Цоколь'),items=k))

# Norva: тёмно-серый угловой на подиуме — длинное крыло-лежанка с открытым краем и короткое крыло с блоком-подлокотником
n = [dict(id='podA',p=[0,0.10,0.51],s=[3.20,0.20,1.02],rx=0.10,rz=0.08,rTop=0.05,rBottom=0.05),
     dict(id='podB',p=[1.09,0.10,1.60],s=[1.02,0.20,1.22],rx=0.08,rz=0.08,rTop=0.05,rBottom=0.05),
     dict(id='seatA',p=[-0.02,0.30,0.52],s=[3.12,0.22,0.98],rx=0.10,rz=0.08,rTop=0.07,rBottom=0.04,crown=0.012,noOcc=True),
     dict(id='seatB',p=[1.09,0.30,1.58],s=[0.98,0.22,1.18],rx=0.07,rz=0.08,rTop=0.07,rBottom=0.04,crown=0.012,noOcc=True),
     dict(id='backA',p=[0.38,0.52,0.14],s=[2.42,0.26,0.26],rx=0.06,rz=0.06,rTop=0.06,rBottom=0.03),
     dict(id='backB',p=[1.47,0.52,1.00],s=[0.26,0.26,1.50],rx=0.06,rz=0.06,rTop=0.06,rBottom=0.03),
     dict(id='armEnd',p=[1.09,0.52,2.02],s=[1.00,0.26,0.34],rx=0.07,rz=0.07,rTop=0.07,rBottom=0.03),
     pillow('p1',-0.55,0.66,0.36,w=0.52,h=0.46,t=0.19,yaw=6,lean=-112), pillow('p2',-0.10,0.68,0.42,w=0.56,h=0.48,t=0.19,yaw=-8,lean=-112),
     pillow('p3',1.24,0.66,1.20,w=0.52,h=0.46,t=0.19,yaw=-84,lean=-112), pillow('p4',1.18,0.68,1.64,w=0.56,h=0.48,t=0.19,yaw=-96,lean=-112)]
save(dict(id='sofa-42',size=[3.20,2.20,0.78],view=V(-42,11,24,1.15),light=Lg(az=-30,exposure=0.92,contrast=0.45),fab='pique:13',
 measure=dict(seatH=0.41,armH=0.65,armW=0.26,seatD=0.76,legH=0.02,legLabel='Цоколь'),items=n))

def seg(cx, cz, ang, parts):
    """секция, повёрнутая в плане на ang градусов вокруг (cx, cz): parts — детали в местных координатах (x вдоль секции, z вглубь к зрителю)"""
    a = math.radians(ang); c, s_ = math.cos(a), math.sin(a); out = []
    for d in parts:
        d = dict(d); lx, y, lz = d['p']; d['p'] = [round(cx + lx*c + lz*s_, 4), y, round(cz - lx*s_ + lz*c, 4)]
        r = d.get('rot', [0, 0, 0]); d['rot'] = [r[0], r[1] + ang, r[2]]; d['noOcc'] = True; out.append(d)
    return out

# Delva: прямой раскладной, светло-серый, две подушки сиденья и две спинки, тонкие подлокотники, чёрные конусные ножки (3D — в сложенном виде)
d29 = [dict(id='body',p=[0,0.255,0.475],s=[2.40,0.20,0.95],rx=0.04,rz=0.04,rTop=0.02,rBottom=0.03),
       dict(id='arm',p=[-1.12,0.39,0.475],s=[0.16,0.48,0.95],rx=0.06,rz=0.06,rTop=0.06,rBottom=0.03,warp=dict(leanX=-0.02),mirror='x'),
       dict(id='backFrame',p=[0,0.47,0.08],s=[2.10,0.50,0.16],rx=0.03,rz=0.04,rTop=0.04,rBottom=0.02),
       dict(id='seat',p=[-0.52,0.40,0.565],s=[1.035,0.17,0.77],rx=0.06,rz=0.09,rzBack=0.03,rTop=0.07,rBottom=0.05,crown=0.018,noOcc=True,mirror='x'),
       dict(id='back',p=[-0.52,0.665,0.24],s=[1.03,0.40,0.22],rx=0.07,rz=0.08,rTop=0.09,rBottom=0.06,crown=0.03,crownFace='z',bulge=0.01,warp=dict(lean=0.07,taperTop=[1,0.8]),noOcc=True,mirror='x'),
       dict(id='legF',k='leg',p=[-1.12,0.075,0.87],s=[0.04,0.15,0.04],taper=0.5,mirror='x'), dict(id='legB',k='leg',p=[-1.12,0.075,0.08],s=[0.04,0.15,0.04],taper=0.5,mirror='x'),
       pillow('pL',-0.80,0.66,0.44,w=0.52,h=0.42,t=0.18,yaw=20,lean=-116), pillow('pR',0.80,0.66,0.44,w=0.52,h=0.42,t=0.18,yaw=-20,lean=-116)]
save(dict(id='sofa-29',size=[2.40,0.95,0.88],view=V(0,6,18,1.15),light=Lg(az=15,exposure=1.15,contrast=0.45),fab='beauty:1',legs=dict(kind='wood',finish='blackwood'),
 measure=dict(seatH=0.48,armH=0.63,armW=0.16,seatD=0.60,legH=0.15),items=d29))

# Kubva: модульный угловой со столиком — слева угол из двух секций, тёмный столик, справа секция со спинкой и открытая платформа
def plat(id, x0, x1, z0, z1, h=0.40):
    return dict(id=id,p=[(x0+x1)/2,h/2+0.01,(z0+z1)/2],s=[x1-x0-0.012,h-0.02,z1-z0-0.012],rx=0.05,rz=0.05,rTop=0.05,rBottom=0.03,crown=0.01,noOcc=True)
def blk(id, x0, x1, z0, z1, y0=0.38, y1=0.67):
    return dict(id=id,p=[(x0+x1)/2,(y0+y1)/2,(z0+z1)/2],s=[x1-x0,y1-y0,z1-z0],rx=0.05,rz=0.05,rTop=0.05,rBottom=0.02,noOcc=True)
k32 = [plat('wingL',-2.10,-1.10,1.0,2.20), plat('cornerL',-2.10,-1.10,0,1.0), plat('seatL',-1.10,-0.60,0,1.0),
       blk('backWing',-2.10,-1.86,0.0,2.20), blk('backCorner',-1.86,-0.60,0,0.24),
       dict(id='table',m='matte',p=[-0.30,0.15,0.50],s=[0.56,0.30,0.96],r=0.01),
       plat('seatR',0.0,1.20,0,1.0), plat('ottoR',1.20,2.10,0,1.0), blk('backR',0.0,1.65,0,0.24),
       pillow('p1',-1.62,0.60,0.42,w=0.50,h=0.46,t=0.18,yaw=40), pillow('p2',-1.25,0.60,0.38,w=0.50,h=0.46,t=0.18,yaw=-6),
       pillow('p3',0.30,0.60,0.38,w=0.50,h=0.46,t=0.18,yaw=8), pillow('p4',0.62,0.61,0.44,w=0.50,h=0.46,t=0.18,yaw=-6), pillow('p5',1.30,0.60,0.38,w=0.50,h=0.46,t=0.18,yaw=-8)]
save(dict(id='sofa-32',size=[4.20,2.20,0.67],view=V(8,9,22,1.15),light=Lg(az=20,exposure=1.15,contrast=0.45),fab='molly:17',
 measure=dict(seatH=0.40,armH=0.67,armW=0.24,seatD=0.76,legH=0.02,legLabel='Цоколь'),items=k32))

# Tedva: модульный угловой в «шерпе» — длинное крыло с толстой спинкой и большим подлокотником, короткое крыло из двух секций
def puff(id, x0, x1, z0, z1, y0, y1, r=0.13):
    return dict(id=id,p=[(x0+x1)/2,(y0+y1)/2,(z0+z1)/2],s=[x1-x0,y1-y0,z1-z0],rx=r,rz=r,rTop=min(r,(y1-y0)*0.45),rBottom=min(0.08,(y1-y0)*0.3),crown=0.015,bulge=0.012,noOcc=True)
t36 = [puff('seatA1',0.52,1.56,0.30,1.05,0.02,0.42), puff('seatA2',-0.52,0.52,0.30,1.05,0.02,0.42), puff('seatA3',-1.24,-0.52,0.30,1.05,0.02,0.42),
       puff('backA',-1.24,1.56,0.0,0.36,0.02,0.67), puff('armA',-1.56,-1.20,0.0,1.05,0.02,0.67,r=0.15),
       puff('seatB1',0.54,1.56,1.05,1.61,0.02,0.42), puff('seatB2',0.54,1.56,1.61,2.17,0.02,0.42),
       puff('backB1',1.22,1.56,1.08,1.60,0.36,0.62,r=0.10), puff('backB2',1.22,1.56,1.62,2.14,0.36,0.62,r=0.10)]
save(dict(id='sofa-36',size=[3.12,2.17,0.67],view=V(-118,36,24,1.1),light=Lg(az=-90,exposure=0.88,contrast=0.45),fab='noble:9',
 measure=dict(seatH=0.42,armH=0.67,armW=0.34,armSide='left',seatD=0.72,legH=0.02,legLabel='Цоколь'),items=t36))

# Sorva: радиусный на подиуме — прямая секция с подлокотником справа, дальше две секции дугой, левая без спинки
def sec(L, back=True, arm=False, pil=True, endRound=False):
    p = [dict(id='pod',m='matte',p=[0,0.04,0.50],s=[L-0.10,0.08,0.84],r=0.005),
         dict(id='body',p=[0,0.25,0.50],s=[L+0.03,0.34,1.00],rx=0.20 if endRound else 0.04,rz=0.06,rTop=0.05,rBottom=0.05,crown=0.01)]
    if back: p.append(dict(id='back',p=[0,0.54,0.13],s=[L+0.03,0.25,0.26],rx=0.05,rz=0.06,rTop=0.06,rBottom=0.02))
    if arm: p.append(dict(id='arm',p=[L/2-0.11,0.54,0.50],s=[0.22,0.25,1.00],rx=0.06,rz=0.06,rTop=0.06,rBottom=0.02))
    if pil: p += [pillow('pa',-0.16,0.65,0.34,w=0.52,h=0.44,t=0.2,yaw=6,lean=-110), pillow('pb',0.20,0.63,0.42,w=0.46,h=0.40,t=0.18,yaw=-8,lean=-114)]
    return p
def named(parts, tag):
    return [dict(d, id=tag + d['id']) for d in parts]
s43 = seg(1.19, 0, 0, named(sec(1.18, arm=True), 'R')) + seg(0.038, 0.12, 12, named(sec(1.15), 'M')) + seg(-1.096, 0.493, 24, named(sec(1.25, back=False, pil=False, endRound=True), 'L'))
s43.append(dict(id='backLshort',p=[-0.72,0.54,0.42],s=[0.45,0.25,0.26],rx=0.06,rz=0.06,rTop=0.06,rBottom=0.02,rot=[0,24,0],noOcc=True))
s43.append(pillow('pc',-0.78,0.66,0.60,w=0.56,h=0.50,t=0.2,yaw=30,lean=-110))
save(dict(id='sofa-43',size=[3.56,1.45,0.78],view=V(0,7,20,1.15),light=Lg(az=15,exposure=1.15,contrast=0.45),fab='pique:11',
 measure=dict(seatH=0.42,armH=0.66,armW=0.22,armSide='right',seatD=0.74,legH=0.08,legLabel='Цоколь'),items=s43))

# Terva: низкий «галечный» угловой — две мягкие платформы и спинка из двух длинных валиков
t45 = [puff('platMain',-0.50,1.50,0.10,1.15,0.02,0.40,r=0.20), puff('platChaise',-1.50,-0.44,0.10,2.00,0.02,0.40,r=0.22),
       dict(id='rollLow',p=[0.05,0.50,0.22],s=[2.86,0.24,0.40],rx=0.12,rz=0.12,rTop=0.12,rBottom=0.11,noOcc=True),
       dict(id='rollTop',p=[-0.35,0.65,0.13],s=[2.00,0.19,0.26],rx=0.095,rz=0.095,rTop=0.095,rBottom=0.09,noOcc=True)]
save(dict(id='sofa-45',size=[3.00,2.00,0.67],view=V(-24,17,24,1.12),light=Lg(az=-25,exposure=1.05,contrast=0.45),fab='beauty:10',
 measure=dict(seatH=0.40,seatD=0.92,legH=0.02,legLabel='Цоколь'),items=t45))
