import sys
sys.path.insert(0,'/home/user/ricca-designs-/tools/media-v3/photofit')
import numpy as np, refs as R
for n in ['p-armchair-20-d1','p-armchair-20']:
    a=R.load(n); body,legs=R.obj_mask(a,split=True)
    ys,xs=np.where(body); print(n,'bbox x',xs.min(),xs.max(),'y',ys.min(),ys.max(), 'legs', legs.sum())
    for y in range(ys.min(), ys.max()+1, 20):
        r=np.where(body[y])[0]
        print(f'  y={y}: x {r.min()}..{r.max()} w={r.max()-r.min()} c={(r.min()+r.max())/2:.1f}')
    # top profile
    for x in range(xs.min(), xs.max()+1, 40):
        c=np.where(body[:,x])[0]; print(f'  x={x}: y {c.min()}..{c.max()}')
    np.save(f'look/{n}-body.npy', body)
