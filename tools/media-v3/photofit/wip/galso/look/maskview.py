import sys
sys.path.insert(0,'/home/user/ricca-designs-/tools/media-v3/photofit')
import numpy as np, refs as R
from PIL import Image
from scipy import ndimage
for n,box in (('p-armchair-20-d1',(260,1000,1010,1160)),('p-armchair-20',(180,1000,1070,1150))):
    a=R.load(n); body,legs=R.obj_mask(a,split=True)
    vis=a.copy(); e=body^ndimage.binary_erosion(body); vis[e]=(255,0,0)
    im=Image.fromarray(vis.astype(np.uint8)).crop(box); im=im.resize((im.width*2,im.height*2),Image.LANCZOS); im.save(f'mask_bot_{n}.png')
    # luminance column profiles at bottom
    g=a.mean(2)
    for x in (400,520,640,760,880):
        col=g[1080:1150,x-2:x+3].mean(1); print(n,'x',x,' '.join(f'{1080+i}:{int(v)}' for i,v in enumerate(col) if i%2==0))
