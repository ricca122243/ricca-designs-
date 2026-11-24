import sys
from PIL import Image, ImageEnhance, ImageDraw
def zoom(src, box, out, s=4, grid=20, contrast=1.8, pts=None):
    im=Image.open(src).convert('RGB').crop(box)
    im=im.resize((im.width*s, im.height*s), Image.LANCZOS)
    im=ImageEnhance.Contrast(im).enhance(contrast)
    d=ImageDraw.Draw(im)
    x0,y0,x1,y1=box
    for x in range((x0//grid+1)*grid, x1, grid):
        d.line([((x-x0)*s,0),((x-x0)*s,im.height)], fill=(0,255,255) if x%100 else (255,0,0), width=1)
        d.text(((x-x0)*s+2,2), str(x), fill=(255,255,0))
    for y in range((y0//grid+1)*grid, y1, grid):
        d.line([(0,(y-y0)*s),(im.width,(y-y0)*s)], fill=(0,255,255) if y%100 else (255,0,0), width=1)
        d.text((2,(y-y0)*s+2), str(y), fill=(255,255,0))
    if pts:
        for lines,col in pts:
            for L in lines:
                d.line([((x-x0)*s,(y-y0)*s) for x,y in L], fill=col, width=2)
    im.save(out)
if __name__=='__main__':
    src=sys.argv[1]; box=tuple(int(v) for v in sys.argv[2].split(',')); out=sys.argv[3]; s=int(sys.argv[4]) if len(sys.argv)>4 else 4
    zoom(src, box, out, s)
