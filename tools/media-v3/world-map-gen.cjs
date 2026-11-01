const DottedMap = require('dotted-map').default;
const fs = require('fs');
const map = new DottedMap({ height: 70, grid: 'diagonal' });
const pts = {
  almaty: [43.24, 76.89], europe: [48.85, 2.35], gulf: [25.2, 55.27], ny: [40.7, -74.0], asia: [35.68, 139.69],
  moscow: [55.75, 37.62], london: [51.5, -0.12], sea: [1.35, 103.82], sydney: [-33.87, 151.2], sp: [-23.55, -46.63]
};
const out = {};
for (const [k, [lat, lng]] of Object.entries(pts)) { const p = map.getPin({ lat, lng }); out[k] = [+p.x.toFixed(2), +p.y.toFixed(2)]; }
const svg = map.getSVG({ radius: 0.22, color: '#111111', shape: 'circle', backgroundColor: 'transparent' });
fs.writeFileSync('world-dots.svg', svg);
const { width, height } = map.image || {};
console.log(JSON.stringify({ out, width, height, size: svg.length }));
