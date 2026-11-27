import numpy as np
from PIL import Image
from scipy import ndimage
def lum(name): return ndimage.gaussian_filter(np.asarray(Image.open(name).convert('L')).astype(float), 1.5)
# fold arc, front: strongest positive vertical gradient (dark above -> light below) in y range
a=lum('p-armchair-20-d1.png')
gy=ndimage.sobel(a,axis=0)
print('FRONT fold arc (x: y of max dark->light gradient in 750..840)')
out=[]
for x in range(310,965,10):
    seg=ndimage.uniform_filter1d(gy[750:840, x-3:x+4].mean(1),3); y=750+int(np.argmax(seg)); out.append((x,y,int(seg.max())))
print(out)
a2=lum('p-armchair-20.png'); gy2=ndimage.sobel(a2,axis=0)
print('MAIN fold line (x: y of max dark->light gradient in 720..800)')
out=[]
for x in range(290,780,10):
    seg=ndimage.uniform_filter1d(gy2[715:800, x-3:x+4].mean(1),3); y=715+int(np.argmax(seg)); out.append((x,y,int(seg.max())))
print(out)
# main: horizon of right ear nose: max positive horizontal gradient in x 740..790
gx2=ndimage.sobel(a2,axis=1)
print('MAIN tip horizon (y: x of max dark->light in 735..790)')
out=[]
for y in range(560,780,10):
    seg=gx2[y-3:y+4, 735:790].mean(0); x=735+int(np.argmax(seg)); out.append((x,y,int(seg.max())))
print(out)
print('MAIN vertical seam (y: x of min lum in 840..900)')
out=[]
for y in range(810,1090,10):
    seg=a2[y-4:y+5, 840:900].mean(0); x=840+int(np.argmin(seg)); out.append((x,y,int(seg.min())))
print(out)
print('MAIN crease (x: y of min lum in 760..815)')
out=[]
for x in range(770,880,6):
    seg=a2[755:815, x-2:x+3].mean(1); y=755+int(np.argmin(seg)); out.append((x,y,int(seg.min())))
print(out)
