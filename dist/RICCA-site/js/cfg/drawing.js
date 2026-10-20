/* RICCA · конструктор — чертёж-схема для согласования (SPEC §7.2).
   layoutSheet(cfg, partsResult, opts) — чистая раскладка листа A4 (SVG, мм), работает под node (тесты).
   render(cfg, { stage, render3q }) — в браузере: 3/4-вид, образец ткани, шрифт Montserrat внутрь SVG, PNG 3508 × 2480.
   Виды по ЕСКД (первый угол): спереди — слева вверху, слева — справа от него, сверху — под ним; один масштаб.
   Все размеры берутся из parts().dims (params.js) — тот же источник, что у 3D-модели. */

import { parts as partsOf, normalize, itemBounds } from './params.js';
import { summaryLines, titleOf, cfgId } from './share.js';

/* ширины глифов Montserrat (wght 400/500/600, на 1000 em) — из fonts/montserrat/*.woff2; монограмма RD — img/logo/rd-monogram.svg */
const FW_CHARS = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~ ¡¢£¤¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿĂıŒœʻʼˆ˚˜̣̩̀́̃̄̈̉ЀЁЂЃЄЅІЇЈЉЊЋЌЍЎЏАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюяѐёђѓєѕіїјљњћќѝўџҐґҰұ ​–—‘’‚“”„•…′″‹›⁄€№™↑↓";
const FW_W400 = '262,260,373,696,615,829,669,202,329,329,386,575,212,382,212,335,662,361,568,564,661,566,609,589,638,609,212,212,575,575,575,567,1033,717,754,709,826,669,633,773,813,302,501,711,589,955,813,839,718,839,723,615,574,792,698,1111,656,635,651,318,335,318,576,500,600,590,678,563,678,604,339,685,676,269,274,598,269,1061,676,627,678,678,401,488,406,672,542,879,534,542,511,334,294,334,575,262,260,563,637,700,695,294,490,600,809,401,477,575,809,600,419,575,430,430,600,678,632,252,600,430,414,477,1029,1029,1029,567,717,717,717,717,717,717,1033,709,669,669,669,669,302,302,302,302,831,813,839,839,839,839,839,575,839,792,792,792,792,635,718,668,590,590,590,590,590,590,986,563,604,604,604,604,269,269,269,269,590,676,627,627,627,627,627,575,627,672,672,672,672,542,678,542,717,269,1121,1068,243,222,600,600,600,0,0,0,0,0,0,0,0,659,659,825,572,707,627,309,302,527,1186,1184,833,702,824,680,806,744,726,749,572,794,659,1011,621,824,824,702,785,963,821,851,825,709,716,588,680,917,650,827,715,1094,1117,820,978,710,706,1092,732,583,659,608,475,651,618,826,534,688,688,581,632,790,675,636,674,686,563,473,558,785,526,684,599,928,928,621,785,563,571,865,606,625,618,670,475,572,528,273,269,274,921,944,670,581,688,558,639,575,449,652,559,131,0,500,1000,212,212,212,382,382,382,295,647,202,373,299,299,169,792,1200,1021,600,600';
const FW_W500 = '269,268,391,703,621,843,686,210,337,338,400,582,227,383,227,352,667,370,574,572,669,574,617,598,644,617,227,227,582,582,582,573,1034,732,757,713,826,670,635,772,812,310,513,719,594,955,812,840,722,840,727,621,587,791,712,1126,673,647,657,333,352,333,583,500,600,598,682,571,682,612,353,690,681,279,284,615,279,1057,681,635,682,682,410,501,414,677,559,899,552,559,521,351,299,351,582,269,268,571,646,700,707,299,500,600,802,404,504,582,802,600,419,582,430,430,600,682,648,267,600,430,418,504,1034,1034,1034,573,732,732,732,732,732,732,1047,713,670,670,670,670,310,310,310,310,834,812,840,840,840,840,840,582,840,791,791,791,791,647,722,676,598,598,598,598,598,598,989,571,612,612,612,612,279,279,279,279,598,681,635,635,635,635,635,582,635,677,677,677,677,559,682,559,732,279,1126,1067,238,238,600,600,600,0,0,0,0,0,0,0,0,665,665,833,578,708,636,317,310,540,1187,1180,841,711,823,691,807,758,731,747,578,804,665,1029,633,823,823,711,790,963,820,848,821,714,718,603,691,926,668,829,718,1095,1121,828,993,713,707,1099,731,589,662,614,488,664,628,849,544,694,694,598,641,798,681,641,677,688,571,493,571,805,541,690,609,941,941,639,807,575,575,876,612,631,628,675,488,577,536,283,279,284,933,952,674,598,694,571,646,581,466,667,574,134,0,500,1000,227,227,227,416,416,416,314,691,210,391,312,312,174,797,1204,1029,600,600';
const FW_W600 = '276,278,413,711,629,860,706,220,347,348,416,590,244,385,244,371,673,381,582,582,679,584,627,608,652,627,244,244,590,590,590,581,1034,749,761,718,826,670,637,772,810,319,527,729,599,955,810,842,726,842,731,629,602,789,729,1144,693,661,663,350,371,350,591,500,600,607,686,581,687,622,369,694,685,289,295,635,289,1053,685,645,686,686,420,515,424,681,578,919,573,578,532,370,303,370,590,275,278,581,657,700,721,303,511,600,794,408,535,590,794,600,419,590,430,430,600,686,666,284,600,430,422,535,1039,1039,1039,581,749,749,749,749,749,749,1063,718,670,670,670,670,319,319,319,319,836,810,842,842,842,842,842,590,842,789,789,789,789,661,726,684,607,607,607,607,607,607,993,581,622,622,622,622,289,289,289,289,606,685,645,645,645,645,645,590,645,681,681,681,681,578,686,578,749,289,1131,1065,244,257,600,600,600,0,0,0,0,0,0,0,0,670,670,841,585,711,645,326,319,554,1186,1176,849,722,822,706,807,777,735,746,585,816,670,1052,643,822,822,722,795,963,818,845,817,719,721,620,706,937,692,834,722,1097,1125,836,1010,717,710,1106,732,597,667,619,501,682,637,879,553,702,702,618,652,806,687,646,681,691,581,514,591,827,564,697,621,955,955,660,832,589,581,889,619,637,637,680,501,584,544,294,289,295,948,962,679,618,702,591,653,588,484,688,593,138,0,500,1000,244,244,244,456,456,456,335,743,220,413,327,327,179,804,1210,1037,600,600';
const MONO_D = 'M336.85 0.13C331.04 0.18,323.9 0.31,320.98 0.42C318.05 0.53,312.65 0.68,308.98 0.75C301.81 0.88,295.31 1.13,290.98 1.44C286.7 1.74,280.5 2,274.29 2.13C258.11 2.46,255.92 2.85,255.04 5.49C254.43 7.34,254.87 8.3,257.66 11.06C259.44 12.84,262.78 16.57,265.98 20.38C267.62 22.33,271.88 28.57,272.79 30.38C273.15 31.07,274.56 34.5,275.24 36.31C276.22 38.91,277.27 44.86,277.6 49.69C277.77 52.16,277.77 208.68,277.6 211.2C277.36 214.77,275.79 222.14,274.88 223.97C273.76 226.24,271.53 228.95,269.79 230.18C267.67 231.67,266.65 231.47,262.64 228.77C258.43 225.93,256.23 223.72,249.39 215.38C247.42 212.98,245.02 209.61,241.04 203.69C239.22 200.97,237.73 198.84,236.54 197.25C235.29 195.58,233.37 192.73,232.25 190.88C231.02 188.84,226.88 182.48,223.9 178.06C222.61 176.14,220.43 172.88,219.07 170.83C217.71 168.78,216.26 166.66,215.86 166.13C215.45 165.6,214.19 163.77,213.06 162.05C211.92 160.34,210.5 158.32,209.88 157.56C209.27 156.81,207.55 154.61,206.07 152.69C201.5 146.77,201.45 146.71,197.21 141.76C195.61 139.9,193.92 138.22,191.01 135.59C188.8 133.59,188.47 133.2,188.38 132.46C188.27 131.5,188.88 131.01,191.18 130.21C191.87 129.97,193.19 129.46,194.11 129.09C195.03 128.72,196.21 128.25,196.72 128.06C199.96 126.85,208.41 122.17,211.84 119.68C217.11 115.87,217.68 115.38,221.86 111.17L225.18 107.81L227.73 104.01C231.01 99.13,231.32 98.59,232.11 96.46C232.46 95.48,233.01 94.13,233.31 93.46C234.1 91.7,234.44 90.61,235 88.06C235.27 86.83,235.71 85.05,235.97 84.13C236.84 81.04,237.05 79.74,237.23 76.13C237.64 67.81,237.46 63.54,236.54 59.88C236.31 58.95,235.78 56.67,235.36 54.81C233.67 47.27,231.34 41.94,226.59 34.81C222.5 28.66,219.7 25.72,212.48 20.03C206.81 15.55,198.8 11.26,191.91 9.01C190.81 8.65,189.04 8.02,187.98 7.6C186.03 6.85,183.51 6.09,181.66 5.69C181.11 5.58,179.71 5.26,178.54 5C172.38 3.6,161.51 2.62,148.1 2.25C145.59 2.18,142.89 2.1,142.1 2.07C138.84 1.93,2.67 2.22,2.09 2.37C1.3 2.57,0.67 3.12,0.41 3.84C0 5.02,-0.15 20.34,0.24 21.74C0.44 22.47,1.14 23.16,1.86 23.34C2.16 23.42,4.58 23.55,7.22 23.62C16.83 23.9,20.85 24.61,25.41 26.81C29.86 28.95,33.08 33.95,34.28 40.54C34.68 42.73,35.15 46.17,35.44 49.13C35.73 52.12,35.79 205.67,35.5 209.55C35.26 212.77,34.21 218.77,33.4 221.59C32.24 225.58,28.98 229.57,25.41 231.34C21.08 233.51,15.89 234.4,6.41 234.61C-0.15 234.76,0.22 234.24,0.04 243.69C-0.04 248.04,0.11 253,0.34 253.78C0.62 254.68,1.45 255.36,2.51 255.55C3.68 255.76,134.63 255.67,135.36 255.46C137.29 254.89,137.39 254.26,137.25 243.5L137.16 236.56L136.85 236C136.23 234.9,135.16 234.63,131.41 234.63C126.5 234.62,119.69 233.87,117.08 233.05C115.03 232.41,111.8 230.86,110.47 229.89C105.53 226.28,102.7 218.94,102.23 208.56C102.01 203.67,102.12 146.44,102.35 145.82C102.93 144.27,103.31 144.19,109.85 144.29C114.93 144.37,116.98 144.49,122.04 145C131.05 145.92,134.78 148.13,141.57 156.58C144.06 159.68,147.66 165.16,149.16 168.13C149.35 168.5,150.13 169.85,150.88 171.13C151.64 172.4,152.91 174.53,153.7 175.88C154.49 177.22,155.63 179.13,156.23 180.13C156.82 181.12,157.53 182.33,157.79 182.81C158.05 183.29,158.83 184.67,159.53 185.88C160.23 187.08,161.1 188.6,161.47 189.25C163.57 193.04,164.61 194.85,165.44 196.19C165.95 197.01,167.11 198.98,168 200.56C168.9 202.14,170.37 204.73,171.26 206.31C172.16 207.89,173.38 209.98,173.98 210.95C175.3 213.08,177.51 216.94,178.21 218.34C178.49 218.9,178.97 219.77,179.27 220.27C179.98 221.46,184.65 229.07,186.01 231.25C186.59 232.18,187.61 233.86,188.28 234.99C189.73 237.44,193.33 242.94,194.89 245.12C195.51 245.98,196.47 247.39,197.01 248.25C200.05 253.01,201.07 254.38,202.02 254.93C203.2 255.63,202.33 255.6,223.68 255.68C235.27 255.73,243.63 255.81,243.94 255.88C244.24 255.95,244.97 256.15,245.57 256.33C247.38 256.87,251.19 256.9,305.16 256.82C362.59 256.72,368.67 256.66,381.98 255.94C385.69 255.74,389.54 255.57,395.04 255.37C406.13 254.97,414.85 254.03,422.98 252.39C423.97 252.19,425.35 251.93,426.04 251.81C428.05 251.47,432.52 250.52,433.64 250.18C434.2 250.01,435.73 249.56,437.04 249.18C438.34 248.8,440.09 248.2,440.91 247.85C441.74 247.5,443.3 246.91,444.39 246.54C445.48 246.17,447 245.59,447.77 245.24C448.53 244.89,450.09 244.23,451.23 243.76C452.36 243.29,453.6 242.76,453.98 242.6C455.44 241.94,459.36 239.81,460.7 238.92C462 238.07,466.39 235.4,468.57 234.14C469.71 233.48,475.79 228.94,478.78 226.51C483.51 222.68,490.97 215.05,494.43 210.5C495.34 209.3,496.6 207.67,497.23 206.88C498.93 204.72,501.69 200.42,503.41 197.25C503.84 196.46,504.64 195.13,505.18 194.3C506.91 191.66,507.99 189.48,511.47 181.69C512.1 180.27,513.65 176.2,514.56 173.56C514.73 173.08,515.12 171.73,515.43 170.56C515.73 169.39,516.32 167.31,516.73 165.93C517.92 161.9,518.31 159.97,519.15 154.13C519.33 152.92,519.61 151.05,519.78 149.97C521.6 138.42,521.51 123.28,519.54 111.25C519.31 109.84,518.94 107.42,518.73 105.88C518.22 102.23,517.87 100.44,517.1 97.69C516.76 96.45,516.14 94.17,515.72 92.63C515.3 91.08,514.64 89,514.26 88C513.88 87,513.18 85.05,512.72 83.67C511.08 78.77,507.9 71.91,505.05 67.08C504.73 66.54,504.13 65.42,503.71 64.6C502.13 61.45,501.34 60.26,495.16 51.88C494.28 50.67,493.19 49.15,492.74 48.5C491.39 46.54,482.04 37.1,479.06 34.69C474.27 30.82,469.02 26.84,466.75 25.38C465.43 24.52,463.49 23.26,462.44 22.58C459.11 20.41,453.22 17.13,452.67 17.13C452.64 17.13,452 16.79,451.26 16.38C449.23 15.27,443.37 12.71,439.29 11.16C435.31 9.65,434.87 9.5,431.85 8.75C430.72 8.47,428.92 7.96,427.85 7.61C421.41 5.55,413.25 3.9,405.91 3.19C404.81 3.08,401.75 2.77,399.1 2.5C385.88 1.16,382.76 0.9,377.16 0.69C374.48 0.58,371.22 0.44,369.91 0.37C367.57 0.24,351.83 -0.01,348.91 0.03C348.09 0.04,342.66 0.09,336.85 0.13ZM346.39 23.76C348.03 23.43,361.55 23.87,367.84 24.45C370.16 24.66,380.94 26.44,383.41 27.01C385.38 27.47,386.71 27.84,388.82 28.51C389.7 28.79,391.23 29.24,392.23 29.52C395.05 30.29,395.68 30.54,399.36 32.31C407.46 36.2,411.49 38.98,417.4 44.75C419.44 46.74,422.35 49.96,423.62 51.63C424.06 52.21,424.79 53.17,425.24 53.75C426.88 55.91,431.33 63.3,432.95 66.56C434.39 69.46,434.93 70.67,435.54 72.38C435.79 73.1,436.47 74.93,437.05 76.45C437.62 77.97,438.34 80.11,438.65 81.2C438.96 82.29,439.5 84.03,439.85 85.06C440.59 87.25,441.36 90.29,441.73 92.5C441.87 93.36,442.18 95.05,442.41 96.25C443.4 101.41,444.12 107.14,444.48 112.88C444.62 115.18,444.79 117.74,444.86 118.56C445.07 121.06,445.14 132.42,444.99 139.06C444.7 152.29,444.22 157.88,442.71 166.13C442.29 168.36,441.82 171.09,441.66 172.19C441.18 175.34,440.77 177.13,439.92 179.69C439.48 180.99,438.84 183.18,438.48 184.55C437.87 186.9,436.84 190.02,435.7 193C434.97 194.9,431.91 201.15,430.25 204.13C424.02 215.29,414.36 224.22,404.01 228.36C402.99 228.77,401.5 229.39,400.7 229.73C398.53 230.66,393.89 231.95,389.66 232.8C382.17 234.3,368.14 234.27,362.41 232.75C354.49 230.65,348.69 226.68,346.87 222.12C345.52 218.76,344.66 213.35,344.35 206.38C344.08 200.26,344.23 25.95,344.51 25.26C344.87 24.35,345.36 23.96,346.39 23.76ZM104.27 25.75C104.99 25.59,121.22 25.7,122.91 25.86C134.54 27.02,136.89 27.44,143.54 29.53C153.01 32.51,160.35 38.7,163.52 46.39C166.14 52.72,166.98 55.95,167.6 62.04C167.74 63.36,167.91 64.92,167.99 65.5C168.83 72.21,167.67 86.69,165.82 92.5C163.47 99.89,160.39 105.28,155.85 109.92C153.23 112.6,151.27 113.97,146.85 116.17C143.42 117.88,140.37 118.71,133.22 119.87C128.28 120.68,117.17 121.22,107.97 121.1C103.24 121.04,102.8 120.9,102.32 119.34C102.1 118.6,102.1 28.21,102.33 27.42C102.6 26.48,103.18 25.98,104.27 25.75Z';

/* ---------- измерение текста (ширины глифов Montserrat, на 1000 em) ---------- */
const FW = (() => {
  const m = new Map();
  const a4 = FW_W400.split(',').map(Number), a5 = FW_W500.split(',').map(Number), a6 = FW_W600.split(',').map(Number);
  [...FW_CHARS].forEach((c, i) => m.set(c, [a4[i], a5[i], a6[i]]));
  return m;
})();
export function textWidth(str, size, weight = 500, ls = 0) {
  const k = weight >= 600 ? 2 : weight >= 500 ? 1 : 0;
  let w = 0, n = 0;
  for (const c of String(str)) { const g = FW.get(c); w += g ? g[k] : 640; n++; }
  return (w / 1000) * size + ls * n;
}

/* ---------- лист ---------- */
const SHEET = { w: 297, h: 210 };
const FRAME = { x0: 10, y0: 5, x1: 292, y1: 205 };
const COL = { x0: 210, x1: 292 };                    // правая колонка: 3/4-вид, таблица, штамп
const FIELD = { x0: 15, y0: 10, x1: 205, y1: 200 };  // поле видов
const TB_H = 42;                                     // штамп 82 × 42
export const SCALES = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100];

/* размерные линии */
const FS = 2.5;          // высота текста размера, мм
const OFF0 = 8;          // первый ряд от контура
const STEP = 7;          // шаг рядов
const TGAP = 0.8;        // текст над линией
const EXT_GAP = 1.5;     // зазор выносной линии от контура
const EXT_OVER = 2;      // выход выносной за размерную
const TICK = 0.9;        // половина засечки 45° (длина ≈ 2,5)
const PAD = 0.3;         // запас при проверке пересечений

const INK = '#2A2A2A';                               // графит
const PAPER = '#F4F3F0';                             // бумага эскиза (тёплый светло-серый)
const FONT = "Montserrat, 'Helvetica Neue', Arial, sans-serif";
const HAND = "Caveat, 'Segoe Print', 'Bradley Hand', cursive";   // размеры и подписи «от руки» (fonts/caveat, OFL)
const HAND_K = 1.32;                                 // Caveat мельче Montserrat: тот же кегль × 1,32 ≈ та же ширина строки

export const fmtLen = (m) => String(Math.round(m * 1000) / 10).replace('.', ',');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n2 = (v) => (Math.round(v * 100) / 100).toString();

/* ---------- геометрия: проекции ---------- */
/* вид → (u вправо, v вниз) в метрах относительно габарита */
function projector(view, bbox) {
  const { min, max } = bbox;
  if (view === 'front') return (p) => [p[0] - min[0], max[1] - p[1]];
  if (view === 'side') return (p) => [p[2] - min[2], max[1] - p[1]];
  return (p) => [p[0] - min[0], p[2] - min[2]];                      // top: фронт внизу
}
const VIEW_SIZE = (view, b) => (view === 'front' ? [b.max[0] - b.min[0], b.max[1] - b.min[1]] : view === 'side' ? [b.max[2] - b.min[2], b.max[1] - b.min[1]] : [b.max[0] - b.min[0], b.max[2] - b.min[2]]);
/* глубина к зрителю: больше — ближе (рисуется позже) */
function depthKey(view, bb) { return view === 'front' ? bb.max[2] : view === 'side' ? -bb.min[0] : bb.max[1]; }

/* углы детали в мире (наклон tiltX вокруг X, затем rotY) */
function corners(it) {
  const hx = it.sx / 2, hy = it.sy / 2, hz = it.sz / 2;
  const a = -(it.tiltX || 0), ca = Math.cos(a), sa = Math.sin(a);
  const th = it.rotY || 0, ct = Math.round(Math.cos(th) * 1e6) / 1e6, st = Math.round(Math.sin(th) * 1e6) / 1e6;
  const out = [];
  for (const x of [-hx, hx]) for (const y of [-hy, hy]) for (const z of [-hz, hz]) {
    const y1 = y * ca - z * sa, z1 = y * sa + z * ca;
    const x2 = x * ct + z1 * st, z2 = -x * st + z1 * ct;
    out.push([it.x + x2, it.y + y1, it.z + z2]);
  }
  return out;
}
function boundsOf(pts) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const p of pts) for (let k = 0; k < 3; k++) { if (p[k] < min[k]) min[k] = p[k]; if (p[k] > max[k]) max[k] = p[k]; }
  return { min, max };
}
function hull(pts) {
  const P = pts.map((p) => [Math.round(p[0] * 1e6) / 1e6, Math.round(p[1] * 1e6) / 1e6]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of P) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 1e-12) lo.pop(); lo.push(p); }
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 1e-12) up.pop(); up.push(p); }
  lo.pop(); up.pop();
  return lo.concat(up);
}
/* контур со скруглёнными углами (радиусы по углам) */
function roundedPath(pts, radii) {
  const n = pts.length;
  if (n < 3) return '';
  let d = '';
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p = pts[i], p1 = pts[(i + 1) % n];
    const l0 = Math.hypot(p[0] - p0[0], p[1] - p0[1]), l1 = Math.hypot(p1[0] - p[0], p1[1] - p[1]);
    const r = Math.max(0, Math.min(Array.isArray(radii) ? radii[i] : radii, l0 / 2, l1 / 2));
    const a = [p[0] + ((p0[0] - p[0]) * r) / (l0 || 1), p[1] + ((p0[1] - p[1]) * r) / (l0 || 1)];
    const b = [p[0] + ((p1[0] - p[0]) * r) / (l1 || 1), p[1] + ((p1[1] - p[1]) * r) / (l1 || 1)];
    d += (i ? 'L' : 'M') + n2(a[0]) + ' ' + n2(a[1]);
    if (r > 0.01) d += 'Q' + n2(p[0]) + ' ' + n2(p[1]) + ' ' + n2(b[0]) + ' ' + n2(b[1]);
    else d += 'L' + n2(b[0]) + ' ' + n2(b[1]);
  }
  return d + 'Z';
}
const rectPts = (u0, v0, u1, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
function ellipsePath(cu, cv, ru, rv) {
  return `M${n2(cu - ru)} ${n2(cv)}A${n2(ru)} ${n2(rv)} 0 1 0 ${n2(cu + ru)} ${n2(cv)}A${n2(ru)} ${n2(rv)} 0 1 0 ${n2(cu - ru)} ${n2(cv)}Z`;
}
const polyPath = (pts) => 'M' + pts.map((p) => n2(p[0]) + ' ' + n2(p[1])).join('L') + 'Z';

/* ---------- детали → фигуры вида (мм) ---------- */
function shellTopY(it, th) {
  const yb = it.y - it.sy / 2, ytBack = it.y + it.sy / 2, ytFront = it.topFront != null ? it.topFront : ytBack, open = it.open || Math.PI / 2;
  const u = Math.abs(th - Math.PI) / (Math.PI - open / 2);
  return { yb, y: ytFront + (ytBack - ytFront) * (0.5 + 0.5 * Math.cos(Math.PI * Math.min(1, u))) };
}
function shellShapes(view, it, P, k) {
  const A = it.sx / 2, B = it.sz / 2, t = it.t, open = it.open || Math.PI / 2, th0 = open / 2, th1 = 2 * Math.PI - open / 2;
  const S = (p) => { const q = P(p); return [q[0] * k, q[1] * k]; };
  const yb = it.y - it.sy / 2;
  const out = [];
  const N = 40;
  if (view === 'top') {
    const outer = [], inner = [];
    for (let i = 0; i <= N; i++) { const th = th0 + ((th1 - th0) * i) / N; outer.push(S([it.x + A * Math.sin(th), 0, it.z + B * Math.cos(th)])); inner.push(S([it.x + (A - t) * Math.sin(th), 0, it.z + (B - t) * Math.cos(th)])); }
    out.push({ d: polyPath(outer.concat(inner.reverse())), depth: it.y + it.sy / 2, part: 'shell' });
    return out;
  }
  if (view === 'front') {
    /* спинка (дальняя половина) — затем подлокотники-торцы поверх сиденья */
    const back = [S([it.x + A, yb, 0])];
    for (let i = 0; i <= N; i++) { const th = Math.PI / 2 + (Math.PI * i) / N; back.push(S([it.x + A * Math.sin(th), shellTopY(it, th).y, 0])); }
    back.push(S([it.x - A, yb, 0]));
    out.push({ d: roundedPath(back, 0.6), depth: it.z - B, part: 'shell-back' });
    for (const sgn of [1, -1]) {
      const pts = [S([it.x + sgn * (A - t) * Math.sin(th0), yb, 0]), S([it.x + sgn * (A - t) * Math.sin(th0), shellTopY(it, th0).y, 0])];
      for (let i = 0; i <= N / 2; i++) { const th = th0 + ((Math.PI / 2 - th0) * i) / (N / 2); pts.push(S([it.x + sgn * A * Math.sin(th), shellTopY(it, th).y, 0])); }
      pts.push(S([it.x + sgn * A, yb, 0]));
      if (sgn < 0) pts.reverse();
      out.push({ d: roundedPath(pts, 0.6), depth: it.z + B, part: 'shell-arm' });
    }
    return out;
  }
  /* слева: ближняя (левая) стенка */
  const pts = [S([0, yb, it.z - B])];
  for (let i = 0; i <= N; i++) { const th = Math.PI + ((th1 - Math.PI) * i) / N; pts.push(S([0, shellTopY(it, th).y, it.z + B * Math.cos(th)])); }
  pts.push(S([0, yb, it.z + B * Math.cos(th1)]));
  out.push({ d: roundedPath(pts, 0.8), depth: -(it.x - A), part: 'shell' });
  return out;
}

function itemShapes(view, it, P, k) {
  if (it.shape === 'shell') return shellShapes(view, it, P, k);
  const S = (p) => { const q = P(p); return [q[0] * k, q[1] * k]; };
  if (it.shape === 'cyl') {
    const y0 = it.y - it.sy / 2, y1 = it.y + it.sy / 2;
    const bb = { min: [it.x - it.sx / 2, y0, it.z - it.sz / 2], max: [it.x + it.sx / 2, y1, it.z + it.sz / 2] };
    if (view === 'top') {
      const c = S([it.x, y1, it.z]);
      if (it.square) { const a = S([bb.min[0], y1, bb.min[2]]), b = S([bb.max[0], y1, bb.max[2]]); return [{ d: roundedPath(rectPts(a[0], a[1], b[0], b[1]), 0.2), depth: y1, bb }]; }
      return [{ d: ellipsePath(c[0], c[1], (it.sx / 2) * k, (it.sz / 2) * k), depth: y1, bb }];
    }
    const half = (view === 'front' ? it.sx : it.sz) / 2;
    const ax = view === 'front' ? it.x : it.z;
    const tb = it.taper && it.taper < 1 ? half * it.taper : half;
    const pt = (a, y) => S(view === 'front' ? [a, y, 0] : [0, y, a]);
    const pts = [pt(ax - half, y1), pt(ax + half, y1), pt(ax + tb, y0), pt(ax - tb, y0)];
    const rTop = (it.r || 0) * k, rBot = ((it.rBottom != null ? it.rBottom : it.r) || 0) * k;
    return [{ d: roundedPath(pts, [rTop, rTop, Math.min(rBot, rTop), Math.min(rBot, rTop)]), depth: depthKey(view, bb), bb }];
  }
  /* roundbox */
  const cs = corners(it);
  const bb = boundsOf(cs);
  const pts2 = hull(cs.map(S));
  let r = (it.r || 0) * k;
  if (view === 'top' && it.rPlan) r = it.rPlan * k;
  /* округлые подлокотники: в сечении (вид вдоль длины подлокотника) — полукруглый верх */
  let radii = r;
  if (it.armStyle === 'round' && pts2.length === 4) {
    const alongZ = Math.abs(Math.cos(it.rotY || 0)) > 0.5;
    const sec = (view === 'front' && alongZ) || (view === 'side' && !alongZ);
    if (sec) {
      const w = Math.min(it.sx, it.sz) * k / 2;
      /* верхние два угла (меньший v) — радиус w, нижние — малый */
      const vs = pts2.map((p) => p[1]); const vmin = Math.min(...vs);
      radii = pts2.map((p) => (Math.abs(p[1] - vmin) < 1e-6 ? w : Math.min(r, 0.02 * k)));
    } else radii = Math.min(r, 0.035 * k);
  }
  /* округлая спинка стула: верхние углы мягче (вид спереди) */
  if (it.backShape === 'rounded' && view === 'front' && pts2.length === 4) {
    const vs = pts2.map((p) => p[1]); const vmin = Math.min(...vs);
    radii = pts2.map((p) => (Math.abs(p[1] - vmin) < 1e-6 ? Math.min(it.sx / 4, 0.09) * k : r));
  }
  if (Array.isArray(radii)) return [{ d: roundedPath(pts2, radii), depth: depthKey(view, bb), bb }];
  return [{ d: roundedPath(pts2, Math.min(radii, 6)), depth: depthKey(view, bb), bb }];
}

/* силуэт вида (прямоугольники деталей, мм) — откуда начинаются выносные линии */
function silhouette(rects, Wv, Hv) {
  const E = 0.05;
  return {
    bottom(u) { let v = -Infinity; for (const r of rects) if (u >= r.u0 - E && u <= r.u1 + E) v = Math.max(v, r.v1); return v === -Infinity ? Hv : v; },
    top(u) { let v = Infinity; for (const r of rects) if (u >= r.u0 - E && u <= r.u1 + E) v = Math.min(v, r.v0); return v === Infinity ? 0 : v; },
    left(v) { let u = Infinity; for (const r of rects) if (v >= r.v0 - E && v <= r.v1 + E) u = Math.min(u, r.u0); return u === Infinity ? 0 : u; },
    right(v) { let u = -Infinity; for (const r of rects) if (v >= r.v0 - E && v <= r.v1 + E) u = Math.max(u, r.u1); return u === -Infinity ? Wv : u; },
  };
}

/* ---------- пересечения ---------- */
const boxHit = (a, b, pad = PAD) => a.x0 < b.x1 + pad && a.x1 > b.x0 - pad && a.y0 < b.y1 + pad && a.y1 > b.y0 - pad;
function segHitsBox(s, b, pad = PAD) {
  /* отрезок (горизонтальный / вертикальный / общий) против прямоугольника */
  const x0 = b.x0 - pad, x1 = b.x1 + pad, y0 = b.y0 - pad, y1 = b.y1 + pad;
  let t0 = 0, t1 = 1; const dx = s[2] - s[0], dy = s[3] - s[1];
  const clip = (p, q) => { if (Math.abs(p) < 1e-12) return q >= 0; const r = q / p; if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; } return true; };
  return clip(-dx, s[0] - x0) && clip(dx, x1 - s[0]) && clip(-dy, s[1] - y0) && clip(dy, y1 - s[1]) && t0 <= t1;
}

/* ---------- текст размера: короткое имя у неочевидных размеров + число (цепочки — без расхождения в 1 мм) ---------- */
const ABBR = {
  backT: 'спинка', seatD: 'сид.', seatH: 'сид.', armH: 'подл.', railH: 'царга', 'railH-side': 'царга', mTop: 'матрас', hbT: 'изг.', wingT: 'ушки',
  'frameT-foot': 'царга', 'frameT-l': 'бок.', 'frameT-r': 'бок.', cornerD: 'угол', opening: 'проём', chaiseW: 'шезл.', 'shellW-l': 'бок.', 'shellW-r': 'бок.',
};
export function dimText(d) {
  const num = d.txt || fmtLen(d.value);
  if (d.label === 'Ø') return 'Ø ' + num;
  let a = ABBR[d.id];
  if (d.id === 'legH') a = /цоколь/i.test(d.label) ? 'цоколь' : 'ножки';
  if (d.id === 'inner') a = /проём/i.test(d.label) ? 'проём' : 'сид.';
  return a ? `${a} ${num}` : num;
}
/* цепочки размеров одного ряда (соседние отрезки одного яруса и вида) округляем так, чтобы сумма = округлённому итогу:
   остаток (±1 мм) — самой большой секции; d.txt — текст числа */
function chainTexts(dims) {
  const mm = (v) => Math.round(v * 1000);
  const groups = new Map();
  for (const d of dims) {
    if (!(d.tier >= 1)) continue;
    const k = `${d.view}|${d.axis}|${d.tier}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(d);
  }
  const ax = { x: 0, y: 1, z: 2 };
  for (const arr of groups.values()) {
    const seg = arr.map((d) => { const i = ax[d.axis]; return { d, a: Math.min(d.a[i], d.b[i]), b: Math.max(d.a[i], d.b[i]) }; }).sort((p, q) => p.a - q.a);
    let run = [];
    const flush = () => {
      if (run.length >= 2) {
        const target = mm(run[run.length - 1].b - run[0].a);
        const r = run.map((x) => mm(x.d.value)); const sum = r.reduce((p, q) => p + q, 0);
        if (sum !== target) {
          const pool = run.map((x, i) => i).filter((i) => /^sec|^module/.test(run[i].d.id));
          const cand = pool.length ? pool : run.map((x, i) => i);
          const j = cand.reduce((m, i) => (run[i].d.value > run[m].d.value ? i : m), cand[0]);
          r[j] += target - sum;
        }
        run.forEach((x, i) => { x.d.txt = String(r[i] / 10).replace('.', ','); });
      }
      run = [];
    };
    for (const x of seg) { if (run.length && Math.abs(x.a - run[run.length - 1].b) > 1e-6) flush(); run.push(x); }
    flush();
  }
  return dims;
}

/* ---------- раскладка одного вида при масштабе 1:den ---------- */
const AX = { front: { x: 'h', y: 'v' }, side: { z: 'h', y: 'v' }, top: { x: 'h', z: 'v' } };

function layoutView(view, pr, den, bump = {}) {
  const k = 1000 / den;                         // м → мм на листе
  const bbW = pr._bounds;
  const P = projector(view, bbW);
  const [Wm, Hm] = VIEW_SIZE(view, bbW);
  const Wv = Wm * k, Hv = Hm * k;
  /* фигуры */
  const shapes = [], hidden = [], rects = [];
  for (const it of pr.items) {
    const sh = itemShapes(view, it, P, k);
    const ib = it._bb;
    const q0 = P(ib.min), q1 = P(ib.max);
    const rr = { u0: Math.min(q0[0], q1[0]) * k, u1: Math.max(q0[0], q1[0]) * k, v0: Math.min(q0[1], q1[1]) * k, v1: Math.max(q0[1], q1[1]) * k };
    if (view === 'top' && (it.role === 'leg' || it.role === 'pedestal')) { if (it.legKind !== 'glide') sh.forEach((s) => hidden.push({ ...s, it })); continue; }
    rects.push(rr);
    sh.forEach((s) => shapes.push({ ...s, it }));
  }
  shapes.sort((a, b) => a.depth - b.depth);
  const sil = silhouette(rects, Wv, Hv);

  /* размеры этого вида */
  /* проём П-образного дивана на виде сверху — между сторонами у фронта, а не у спинки */
  const list = pr.dims.filter((d) => d.view === view && AX[view][d.axis]).map((d) => (d.id === 'opening-top' ? { ...d, place: 'bottom', tier: 1 } : d));
  const placed = [];          // { dim, side, row, segs, box, text, tx, ty, rot }
  const labelBoxes = [];
  const segsAll = [];
  const sides = { top: [], bottom: [], left: [], right: [] };
  for (const d of list) {
    const orient = AX[view][d.axis];
    let side = d.place;
    if (orient === 'h' && side !== 'top' && side !== 'bottom') side = 'bottom';
    if (orient === 'v' && side !== 'left' && side !== 'right') side = 'right';
    const a = P(d.a), b = P(d.b);
    const c1 = orient === 'h' ? Math.min(a[0], b[0]) * k : Math.min(a[1], b[1]) * k;
    const c2 = orient === 'h' ? Math.max(a[0], b[0]) * k : Math.max(a[1], b[1]) * k;
    sides[side].push({ d, side, orient, c1, c2, text: dimText(d) });
  }
  const tw = (t) => textWidth(t, FS, 500) * 1.03;
  const rowLine = (side, row) => (side === 'bottom' ? Hv + OFF0 + STEP * row : side === 'right' ? Wv + OFF0 + STEP * row : -(OFF0 + STEP * row));
  /* выносные линии всех размеров стороны — заранее (для проверки текста) */
  const extOf = (e, line) => {
    const out = [];
    for (const c of [e.c1, e.c2]) {
      if (e.side === 'bottom') { const s0 = sil.bottom(c) + EXT_GAP; out.push([c, s0, c, line + EXT_OVER]); }
      if (e.side === 'top') { const s0 = sil.top(c) - EXT_GAP; out.push([c, s0, c, line - EXT_OVER]); }
      if (e.side === 'left') { const s0 = sil.left(c) - EXT_GAP; out.push([s0, c, line - EXT_OVER, c]); }
      if (e.side === 'right') { const s0 = sil.right(c) + EXT_GAP; out.push([s0, c, line + EXT_OVER, c]); }
    }
    return out;
  };
  const candidates = (e, line) => {
    const t = e.text, w = tw(t), len = e.c2 - e.c1, mid = (e.c1 + e.c2) / 2;
    const asc = FS * 0.74, desc = FS * 0.16;
    const out = [];
    const mk = (pos, ext) => {
      if (e.orient === 'h') {
        const base = e.side === 'top' || e.side === 'bottom' ? line - TGAP : line;
        return { tx: pos, ty: base, rot: 0, box: { x0: pos - w / 2, x1: pos + w / 2, y0: base - asc, y1: base + desc }, ext };
      }
      const base = line - TGAP;
      return { tx: base, ty: pos, rot: -90, box: { x0: base - asc, x1: base + desc, y0: pos - w / 2, y1: pos + w / 2 }, ext };
    };
    const fits = w + 2 <= len;
    const atStart = e.c1 < 0.5, atEnd = Math.abs(e.c2 - (e.orient === 'h' ? Wv : Hv)) < 0.5;
    const after = mk(e.c2 + 1.2 + w / 2, [e.c2, e.c2 + 1.6 + w]);
    const before = mk(e.c1 - 1.2 - w / 2, [e.c1 - 1.6 - w, e.c1]);
    if (fits) out.push(mk(mid, null));
    if (atStart && !atEnd) out.push(before, after); else out.push(after, before);
    if (!fits) {
      /* вынос чуть дальше (если рядом соседний вынос) */
      out.push(mk(e.c2 + 3.2 + w / 2, [e.c2, e.c2 + 3.6 + w]), mk(e.c1 - 3.2 - w / 2, [e.c1 - 3.6 - w, e.c1]));
    }
    return out;
  };
  const collides = (box, segs, own) => {
    for (const b of labelBoxes) if (boxHit(box, b)) return true;
    for (const s of segsAll) if (s.owner !== own && segHitsBox(s.s, box)) return true;
    for (const p of placed) for (const s of segs) if (p.e !== own && segHitsBox(s, p.box)) return true;
    return false;
  };
  for (const side of ['bottom', 'right', 'left', 'top']) {
    const arr = sides[side];
    if (!arr.length) continue;
    const allExt = arr.map((e) => ({ e, s: extOf(e, rowLine(side, 6)) }));
    let base = 0;
    for (const tier of [2, 1, 0]) {
      const T = arr.filter((e) => (e.d.tier ?? 0) === tier).sort((x, y) => x.c1 - y.c1 || x.c2 - y.c2);
      if (!T.length) continue;
      let maxRow = base;
      for (const e of T) {
        let done = false;
        const skip = bump[e.d.id] || 0;
        for (let row = base; row < base + 8 && !done; row++) {
          const line = rowLine(side, row);
          const cands = candidates(e, line);
          let ci = 0;
          for (const c of cands) {
            if (ci++ < skip && row === base) continue;
            const ext = extOf(e, line);
            const dl = e.orient === 'h' ? [Math.min(e.c1, c.ext ? c.ext[0] : e.c1), line, Math.max(e.c2, c.ext ? c.ext[1] : e.c2), line] : [line, Math.min(e.c1, c.ext ? c.ext[0] : e.c1), line, Math.max(e.c2, c.ext ? c.ext[1] : e.c2)];
            const segs = [dl, ...ext];
            /* выносные ещё не размещённых размеров этой стороны (до внешнего ряда) */
            let hitFuture = false;
            for (const f of allExt) if (f.e !== e && !placed.some((p) => p.e === f.e)) for (const s of f.s) if (segHitsBox(s, c.box)) hitFuture = true;
            if (hitFuture || collides(c.box, segs, e)) continue;
            placed.push({ e, row, line, box: c.box, tx: c.tx, ty: c.ty, rot: c.rot, segs, dl, ext });
            labelBoxes.push(c.box);
            segs.forEach((s) => segsAll.push({ s, owner: e }));
            maxRow = Math.max(maxRow, row);
            done = true; break;
          }
        }
        if (!done) {
          /* последний ряд, текст по центру — отметим конфликт */
          const row = base + 8, line = rowLine(side, row), c = candidates(e, line)[0], ext = extOf(e, line);
          const dl = e.orient === 'h' ? [e.c1, line, e.c2, line] : [line, e.c1, line, e.c2];
          placed.push({ e, row, line, box: c.box, tx: c.tx, ty: c.ty, rot: c.rot, segs: [dl, ...ext], dl, ext, conflict: true });
          labelBoxes.push(c.box); maxRow = Math.max(maxRow, row);
        }
      }
      base = maxRow + 1;
    }
  }
  /* габарит вида на листе (относительно контура) */
  let x0 = 0, y0 = 0, x1 = Wv, y1 = Hv;
  const grow = (bx) => { x0 = Math.min(x0, bx.x0); y0 = Math.min(y0, bx.y0); x1 = Math.max(x1, bx.x1); y1 = Math.max(y1, bx.y1); };
  for (const p of placed) { grow(p.box); for (const s of p.segs) grow({ x0: Math.min(s[0], s[2]), x1: Math.max(s[0], s[2]), y0: Math.min(s[1], s[3]), y1: Math.max(s[1], s[3]) }); }
  for (const h of hidden) { /* внутри контура */ }
  return { view, Wv, Hv, shapes, hidden, placed, ext: { l: -x0, t: -y0, r: x1 - Wv, b: y1 - Hv }, conflicts: placed.filter((p) => p.conflict).length };
}

/* ---------- таблица и штамп ---------- */
function wrap(text, width, size, weight) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = []; let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (textWidth(t, size, weight) <= width || !cur) cur = t; else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}
function clampLines(lines, max, width, size, weight) {
  if (lines.length <= max) return lines;
  const out = lines.slice(0, max);
  let last = out[max - 1] + '…';
  while (textWidth(last, size, weight) > width && last.length > 2) last = last.slice(0, -2) + '…';
  out[max - 1] = last;
  return out;
}

/* ---------- лист ---------- */
export function layoutSheet(cfg, partsResult, opts = {}) {
  const type = cfg.type;
  const params = normalize(type, cfg.params || {});
  const src = partsResult || partsOf(type, params);
  /* копия с габаритом каждой детали в мире (исходник не меняем) */
  /* одеяло и подушки кровати (decor) и утопленные опоры (support) — не на чертеже */
  const pr = { ...src, items: src.items.filter((it) => !it.decor && !it.support).map((it) => ({ ...it, _bb: itemBounds(it) })), dims: chainTexts(src.dims.map((d) => ({ ...d }))) };
  const all = boundsOf(pr.items.flatMap((it) => [it._bb.min, it._bb.max]));
  pr._bounds = all;

  const title = cfg.title || titleOf(type, params);
  const id = cfg.id || opts.id || cfgId({ type, params, fabric: cfg.fabric || null });
  const date = cfg.date || opts.date || (() => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`; })();
  const lines = cfg.lines || summaryLines({ type, params, fabric: cfg.fabric || null, qty: cfg.qty || params.qty || 1, note: cfg.note || '' }, { dims: pr.bbox });

  /* примечания под видами */
  const noteList = [...(cfg.notes || []), ...(pr.notes || []).filter((n) => !/^угол /.test(n))].map((s) => String(s).replace(/^./, (c) => c.toUpperCase()));
  const noteText = noteList.length ? 'Примечания: ' + noteList.map((n, i) => `${i + 1}) ${n.replace(/[.;]\s*$/, '')}`).join('; ') + '.' : '';
  const NOTE_FS = 2.1;
  const noteLines = noteText ? clampLines(wrap(noteText, FIELD.x1 - FIELD.x0, NOTE_FS, 400), 3, FIELD.x1 - FIELD.x0, NOTE_FS, 400) : [];
  const fieldY1 = FIELD.y1 - (noteLines.length ? noteLines.length * 3 + 2 : 0);

  /* масштаб и раскладка видов */
  const TITLE_H = 5;     // подпись вида
  const GAP = 12;
  let best = null;
  const tryScale = (den, bump) => {
    const F = layoutView('front', pr, den, bump), S = layoutView('side', pr, den, bump), T = layoutView('top', pr, den, bump);
    const LA = Math.max(F.ext.l, T.ext.l), RA = Math.max(F.ext.r, T.ext.r);
    const T1 = Math.max(F.ext.t, S.ext.t) + TITLE_H, B1 = Math.max(F.ext.b, S.ext.b);
    const T2 = T.ext.t + TITLE_H, B2 = T.ext.b;
    const needW = LA + F.Wv + RA + GAP + S.ext.l + S.Wv + S.ext.r;
    const needH = T1 + F.Hv + B1 + GAP + T2 + T.Hv + B2;
    return { den, F, S, T, LA, RA, T1, B1, T2, B2, needW, needH };
  };
  const FWd = FIELD.x1 - FIELD.x0, FHd = fieldY1 - FIELD.y0;
  for (const den of SCALES) {
    const r = tryScale(den, {});
    if (r.needW <= FWd && r.needH <= FHd) { best = r; break; }
  }
  if (!best) best = tryScale(SCALES[SCALES.length - 1], {});
  /* развести конфликты подписей (если были) — сдвигом вариантов */
  for (let it = 0; it < 6; it++) {
    const c = [best.F, best.S, best.T].reduce((a, v) => a + v.conflicts, 0);
    if (!c) break;
    const bump = {};
    for (const v of [best.F, best.S, best.T]) for (const p of v.placed) if (p.conflict) bump[p.e.d.id] = (bump[p.e.d.id] || 0) + it + 1;
    best = tryScale(best.den, bump);
  }
  const { den, F, S, T } = best;
  const exW = FWd - best.needW, exH = FHd - best.needH;
  const gapX = GAP + Math.max(0, Math.min(exW * 0.45, 22));
  const gapY = GAP + Math.max(0, Math.min(exH * 0.45, 18));
  const totW = best.needW - GAP + gapX, totH = best.needH - GAP + gapY;
  const ox = FIELD.x0 + Math.max(0, (FWd - totW) / 2), oy = FIELD.y0 + Math.max(0, (FHd - totH) / 2);
  const pos = {
    front: [ox + best.LA, oy + best.T1],
    side: [ox + best.LA + F.Wv + best.RA + gapX + S.ext.l, oy + best.T1],
    top: [ox + best.LA, oy + best.T1 + F.Hv + best.B1 + gapY + best.T2],
  };

  /* ---------- SVG ---------- */
  const out = [];
  const labels = [];
  const W = (s) => out.push(s);
  W(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${SHEET.w} ${SHEET.h}" width="${SHEET.w}mm" height="${SHEET.h}mm">`);
  W(`<title>${esc(`Чертёж ${id} — ${title}`)}</title>`);
  W(`<style>${opts.fontCss || ''}
text{font-family:${FONT};fill:${INK}}
.o{fill:${PAPER};stroke:${INK};stroke-width:.32;stroke-linejoin:round;stroke-linecap:round}
.o2{fill:none;stroke:${INK};stroke-width:.16;stroke-opacity:.45;stroke-linejoin:round;stroke-linecap:round}
.cl{fill:none;stroke:#8E8E8E;stroke-width:.1;stroke-linecap:round}
.hd{fill:none;stroke:${INK};stroke-width:.18;stroke-dasharray:1.5 1}
.dl{fill:none;stroke:#4A4A4A;stroke-width:.15;stroke-linecap:round}
.tk{fill:none;stroke:${INK};stroke-width:.3;stroke-linecap:round}
.fl{fill:none;stroke:${INK};stroke-width:.22;stroke-linecap:round}
.hand{font-family:${HAND};font-weight:500;fill:#333}
.dt{fill:none;stroke:${INK};stroke-width:.13}
.fr{fill:none;stroke:${INK};stroke-width:.5}
.th{fill:none;stroke:${INK};stroke-width:.25}
.tl{fill:none;stroke:#BDBDBD;stroke-width:.12}
.dim{font-family:${HAND};font-size:${n2(FS * HAND_K)}px;font-weight:500;fill:#333}
.cap{font-size:2.05px;font-weight:600;letter-spacing:.32px;fill:#555}
</style>`);
  /* карандаш: лёгкое дрожание линий (шум) и второй, бледный проход со своим шумом; штриховки — фон эскиза и тень на полу */
  W(`<defs>
<filter id="pn" x="-5%" y="-5%" width="110%" height="110%" filterUnits="objectBoundingBox"><feTurbulence type="fractalNoise" baseFrequency=".32" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale=".42" xChannelSelector="R" yChannelSelector="G"/></filter>
<filter id="pn2" x="-5%" y="-5%" width="110%" height="110%" filterUnits="objectBoundingBox"><feTurbulence type="fractalNoise" baseFrequency=".22" numOctaves="2" seed="11"/><feDisplacementMap in="SourceGraphic" scale=".7" xChannelSelector="G" yChannelSelector="R"/></filter>
<pattern id="hx" width="1.5" height="1.5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V1.5" stroke="#9A9A9A" stroke-width=".1"/></pattern>
<pattern id="hxx" width="1.7" height="1.7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V1.7M0 0H1.7" stroke="#B4B4B4" stroke-width=".09"/></pattern>
<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<mask id="fadeM" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#fade)"/></mask>
</defs>`);
  W(`<rect x="0" y="0" width="${SHEET.w}" height="${SHEET.h}" fill="${PAPER}"/>`);
  W(`<rect class="fr" x="${FRAME.x0}" y="${FRAME.y0}" width="${FRAME.x1 - FRAME.x0}" height="${FRAME.y1 - FRAME.y0}"/>`);

  const VIEW_TITLE = { front: 'Вид спереди', side: 'Вид слева', top: 'Вид сверху' };
  const sideNote = type === 'corner' ? (params.form === 'chaise' ? `шезлонг ${params.side === 'right' ? 'справа' : 'слева'}` : (params.side === 'right' ? 'угол справа' : 'угол слева'))
    : type === 'modular' && params.chaise !== 'none' ? `шезлонг ${params.chaise === 'right' ? 'справа' : 'слева'}` : '';
  for (const V of [F, S, T]) {
    const [X, Y] = pos[V.view];
    W(`<g transform="translate(${n2(X)} ${n2(Y)})">`);
    /* подпись вида */
    const vt = (VIEW_TITLE[V.view] + (V.view === 'top' && sideNote ? ` · ${sideNote}` : '')).toUpperCase();
    const vtY = -V.ext.t - 2.2;
    W(`<text class="cap" x="0" y="${n2(vtY)}">${esc(vt)}</text>`);
    labels.push({ view: V.view, id: '_title', text: vt, box: { x0: X, x1: X + textWidth(vt, 2.05, 600, 0.32), y0: Y + vtY - 1.6, y1: Y + vtY + 0.4 } });
    /* построение: лёгкие линии габарита с выходом за контур, как в эскизе от руки */
    const CO = 4;
    W(`<path class="cl" d="M${n2(-CO)} 0H${n2(V.Wv + CO)}M${n2(-CO)} ${n2(V.Hv)}H${n2(V.Wv + CO)}M0 ${n2(-CO)}V${n2(V.Hv + CO)}M${n2(V.Wv)} ${n2(-CO)}V${n2(V.Hv + CO)}"/>`);
    /* пол и тень штриховкой под изделием */
    if (V.view !== 'top') {
      W(`<rect x="${n2(-1.5)}" y="${n2(V.Hv)}" width="${n2(V.Wv + 3)}" height="2.6" fill="url(#hx)" mask="url(#fadeM)"/>`);
      W(`<line class="fl" filter="url(#pn)" x1="${n2(-3)}" y1="${n2(V.Hv)}" x2="${n2(V.Wv + 3)}" y2="${n2(V.Hv)}"/>`);
    }
    W(`<g filter="url(#pn)">`);
    /* детали: дальние → ближние; простёжка изголовья — сразу после него (ближние детали её закрывают) */
    for (const s of V.shapes) {
      W(`<path class="o" d="${s.d}"/>`);
      W(`<path class="o2" filter="url(#pn2)" d="${s.d}"/>`);
      const it = s.it;
      /* каретная стяжка на сиденье пуфа / банкетки — пуговицы на виде сверху */
      if (V.view === 'top' && it.tufting === 'capitone' && it.role === 'seat') {
        const P = projector('top', pr._bounds), kk = 1000 / den;
        const a = P([it.x - it.sx / 2, 0, it.z - it.sz / 2]), b = P([it.x + it.sx / 2, 0, it.z + it.sz / 2]);
        const u0 = a[0] * kk, v0 = a[1] * kk, u1 = b[0] * kk, v1 = b[1] * kk, round = it.shape === 'cyl';
        const sx = 0.14 * kk, sy = 0.12 * kk, cu = (u0 + u1) / 2, cv = (v0 + v1) / 2, ru = (u1 - u0) / 2 - sx * 0.45, rv = (v1 - v0) / 2 - sy * 0.45;
        const nu = Math.max(1, Math.floor((u1 - u0) / sx)), nv = Math.max(1, Math.floor((v1 - v0) / sy));
        for (let j = 0; j < nv; j++) for (let i = 0; i < nu - (j % 2); i++) {
          const u = cu + (i - (nu - 1 - (j % 2)) / 2) * sx, v = cv + (j - (nv - 1) / 2) * sy;
          if (round ? ((u - cu) / ru) ** 2 + ((v - cv) / rv) ** 2 > 1 : Math.abs(u - cu) > ru || Math.abs(v - cv) > rv) continue;
          /* не ставим пуговицу на отметку ножки */
          if (V.hidden.some((h) => { const c = P([h.it.x, 0, h.it.z]); return Math.hypot(c[0] * kk - u, c[1] * kk - v) < (h.it.sx / 2) * kk + 1.2; })) continue;
          W(`<circle cx="${n2(u)}" cy="${n2(v)}" r=".3" fill="${INK}"/>`);
        }
      }
      if (V.view !== 'front' || !it.tufting || it.role !== 'headboard') continue;
      const P = projector('front', pr._bounds), kk = 1000 / den;
      const a = P([it.x - it.sx / 2, it.y + it.sy / 2, 0]), b = P([it.x + it.sx / 2, it.y - it.sy / 2, 0]);
      const u0 = a[0] * kk, v0 = a[1] * kk, u1 = b[0] * kk, v1 = b[1] * kk;
      if (it.tufting === 'channels') {
        const n = Math.max(5, Math.min(9, Math.round(it.sx / 0.2)));
        for (let i = 1; i < n; i++) { const u = u0 + ((u1 - u0) * i) / n; W(`<line class="dt" x1="${n2(u)}" y1="${n2(v0 + 1.2)}" x2="${n2(u)}" y2="${n2(v1 - 1.2)}"/>`); }
      } else if (it.tufting === 'capitone') {
        const sx = 0.14 * kk, sy = 0.12 * kk; let row = 0;
        for (let v = v0 + sy * 0.8; v < v1 - sy * 0.5; v += sy, row++) for (let u = u0 + sx * (row % 2 ? 1 : 0.5); u < u1 - sx * 0.4; u += sx) W(`<circle cx="${n2(u)}" cy="${n2(v)}" r=".3" fill="${INK}"/>`);
      }
    }
    W('</g>');
    /* невидимые (под корпусом) — штрихом: ножки и опоры на виде сверху */
    for (const h of V.hidden) {
      const bb = h.it._bb, sz = Math.min(bb.max[0] - bb.min[0], bb.max[2] - bb.min[2]) * 1000 / den;
      if (sz >= 2) { W(`<path class="hd" d="${h.d}"${sz < 7 ? ' style="stroke-dasharray:.7 .45"' : ''}/>`); continue; }
      /* тонкая ножка под корпусом — отметка положения (крест) */
      const P = projector('top', pr._bounds), kk = 1000 / den, c = P([h.it.x, 0, h.it.z]), cu = c[0] * kk, cv = c[1] * kk;
      W(`<path class="dt" d="M${n2(cu - 0.9)} ${n2(cv)}H${n2(cu + 0.9)}M${n2(cu)} ${n2(cv - 0.9)}V${n2(cv + 0.9)}"/>`);
    }
    /* матрас на виде сверху — подпись внутри */
    if (V.view === 'top' && type === 'bed') {
      const m = pr.items.find((i) => i.id === 'mattress');
      if (m) {
        const P = projector('top', pr._bounds), kk = 1000 / den, c = P([m.x, 0, m.z]);
        const t1 = `матрас ${fmtLen(params.mw)} × ${fmtLen(params.ml)}`;
        const w = textWidth(t1, 2.3, 400);
        if (w < m.sx * kk - 4) {
          W(`<text x="${n2(c[0] * kk)}" y="${n2(c[1] * kk)}" text-anchor="middle" style="font-size:2.3px;font-weight:400;font-style:italic">${esc(t1)}</text>`);
          labels.push({ view: 'top', id: '_mattress', text: t1, box: { x0: X + c[0] * kk - w / 2, x1: X + c[0] * kk + w / 2, y0: Y + c[1] * kk - 1.8, y1: Y + c[1] * kk + 0.4 }, inside: true });
        }
      }
    }
    /* размеры */
    for (const p of V.placed) {
      W(`<path class="dl" filter="url(#pn)" d="M${n2(p.dl[0])} ${n2(p.dl[1])}L${n2(p.dl[2])} ${n2(p.dl[3])}${p.ext.map((s) => `M${n2(s[0])} ${n2(s[1])}L${n2(s[2])} ${n2(s[3])}`).join('')}"/>`);
      const ticks = p.e.orient === 'h' ? [[p.e.c1, p.line], [p.e.c2, p.line]] : [[p.line, p.e.c1], [p.line, p.e.c2]];
      /* засечки 45°; на очень коротких размерах (< 2,4 мм) — точки, чтобы засечки не слипались */
      if (p.e.c2 - p.e.c1 < 2.4) W(ticks.map(([x, y]) => `<circle cx="${n2(x)}" cy="${n2(y)}" r=".32" fill="${INK}"/>`).join(''));
      else W(`<path class="tk" d="${ticks.map(([x, y]) => `M${n2(x - TICK)} ${n2(y + TICK)}L${n2(x + TICK)} ${n2(y - TICK)}`).join('')}"/>`);
      if (p.rot) W(`<text class="dim" text-anchor="middle" transform="translate(${n2(p.tx)} ${n2(p.ty)}) rotate(-90)">${esc(p.e.text)}</text>`);
      else W(`<text class="dim" text-anchor="middle" x="${n2(p.tx)}" y="${n2(p.ty)}">${esc(p.e.text)}</text>`);
      labels.push({ view: V.view, id: p.e.d.id, text: p.e.text, value: p.e.d.value, label: p.e.d.label, tier: p.e.d.tier, side: p.e.side, row: p.row, conflict: !!p.conflict,
        box: { x0: X + p.box.x0, x1: X + p.box.x1, y0: Y + p.box.y0, y1: Y + p.box.y1 },
        segs: p.segs.map((s) => [X + s[0], Y + s[1], X + s[2], Y + s[3]]) });
    }
    W('</g>');
  }
  /* масштаб под видами */
  const scaleTxt = `М 1:${den}`;

  /* примечания */
  noteLines.forEach((l, i) => {
    const y = FIELD.y1 - (noteLines.length - 1 - i) * 3;
    W(`<text x="${FIELD.x0}" y="${n2(y)}" style="font-size:${NOTE_FS}px;font-weight:400">${esc(l)}</text>`);
    labels.push({ view: 'sheet', id: '_note' + i, text: l, box: { x0: FIELD.x0, x1: FIELD.x0 + textWidth(l, NOTE_FS, 400), y0: y - 1.6, y1: y + 0.5 } });
  });

  /* ---------- правая колонка ---------- */
  const cx0 = COL.x0, cx1 = COL.x1, cw = cx1 - cx0;
  W(`<line class="fr" x1="${cx0}" y1="${FRAME.y0}" x2="${cx0}" y2="${FRAME.y1}"/>`);
  let y = FRAME.y0;
  const tbY = FRAME.y1 - TB_H;
  /* таблица: подготовка строк */
  const rows = [{ label: 'Изделие', value: title }, ...lines];
  const LBL_W = 21, VAL_X = cx0 + 2 + LBL_W, VAL_W = cx1 - 4 - VAL_X;
  const layoutTable = (fs) => rows.map((r, ri) => {
    const vwt = ri === 0 ? 600 : 400;
    const isFab = r.label === 'Ткань' && cfg.fabric && cfg.fabric.typeId;
    const vw = VAL_W - (isFab && opts.swatchDataUrl ? 9.5 : 0);
    const maxL = r.label === 'Пожелание' ? 6 : 3;
    const ls = clampLines(wrap(r.value, vw, fs, vwt), maxL, vw, fs, vwt);
    const ll = wrap(r.label.toUpperCase(), LBL_W - 1, 1.75, 600);
    const h = Math.max(ls.length * fs * 1.28, ll.length * 2.3, isFab && opts.swatchDataUrl ? 8.4 : 0) + 1.7;
    return { ...r, ls, ll, h, isFab };
  });
  let renderH = opts.render3qDataUrl ? 58 : 0;
  let tfs = 2.25, trows = layoutTable(tfs);
  const avail = () => tbY - (FRAME.y0 + renderH) - 8;
  const tH = () => trows.reduce((a, r) => a + r.h, 0);
  while (tH() > avail() && tfs > 1.85) { tfs -= 0.1; trows = layoutTable(tfs); }
  while (tH() > avail() && renderH > 40) renderH -= 2;
  while (tH() > avail() && trows.length > 4) trows.splice(trows.length - 2, 1);
  /* свободное место под таблицей — отдать 3/4-виду (до 74 мм) */
  if (renderH) renderH = Math.max(renderH, Math.min(74, renderH + (avail() - tH()) - 6));
  if (renderH) {
    /* эскиз 3/4: штрихованный фон-прямоугольник за изделием (как в эскизе от руки), сам эскиз — карандашом (render() → pencilSketch),
       размеры в перспективе, подпись от руки со стрелкой */
    const pad = 2, ax = cx0 + pad, ay = FRAME.y0 + pad, aw = cw - 2 * pad, ah = renderH - 2 * pad - 3;
    const sk = opts.sketch;
    const k = sk ? Math.min(aw / sk.w, ah / sk.h) : 1, ox = sk ? ax + (aw - sk.w * k) / 2 : ax, oy = sk ? ay + (ah - sk.h * k) / 2 : ay;
    const M = (q) => [ox + q[0] * k, oy + q[1] * k];
    let bx0 = cx0 + 7, bx1 = cx1 - 9, by0 = ay + ah * 0.12, by1 = ay + ah * 0.66;
    if (sk) {
      const [o0, o1] = [M([sk.obj[0], sk.obj[1]]), M([sk.obj[2], sk.obj[3]])], ow = o1[0] - o0[0], oh = o1[1] - o0[1];
      bx0 = Math.max(cx0 + 3, o0[0] - ow * 0.05); bx1 = Math.min(cx1 - 3, o1[0] + ow * 0.03); by0 = Math.max(ay + 1, o0[1] - oh * 0.12); by1 = o0[1] + oh * 0.55;
    }
    W(`<rect x="${n2(bx0)}" y="${n2(by0)}" width="${n2(bx1 - bx0)}" height="${n2(by1 - by0)}" fill="url(#hxx)"/>`);
    W(`<path class="cl" filter="url(#pn)" d="M${n2(bx0 - 3)} ${n2(by0)}H${n2(bx1 + 2)}M${n2(bx0)} ${n2(by0 - 2.5)}V${n2(by1 + 3)}M${n2(bx1)} ${n2(by0 - 3)}V${n2(by1 + 2)}M${n2(bx0 - 2)} ${n2(by1)}H${n2(bx1 + 3)}"/>`);
    W(`<image x="${n2(ax)}" y="${n2(ay)}" width="${n2(aw)}" height="${n2(ah)}" preserveAspectRatio="xMidYMid meet" xlink:href="${opts.render3qDataUrl}" href="${opts.render3qDataUrl}"/>`);
    if (sk) for (const d of sk.dims) {
      const a = M(d.a), b = M(d.b), ea = M(d.ea), eb = M(d.eb), n = d.n, o = 1.1;
      const ang = Math.atan2(eb[1] - ea[1], eb[0] - ea[0]), ux = Math.cos(ang), uy = Math.sin(ang);
      const tick = (q) => `M${n2(q[0] - (ux - uy) * 0.7)} ${n2(q[1] - (uy + ux) * 0.7)}L${n2(q[0] + (ux - uy) * 0.7)} ${n2(q[1] + (uy + ux) * 0.7)}`;
      /* выносные — с зазором от изделия (как в черчении): от 40 % выноса до чуть дальше размерной */
      const ga = [a[0] + (ea[0] - a[0]) * 0.4, a[1] + (ea[1] - a[1]) * 0.4], gb = [b[0] + (eb[0] - b[0]) * 0.4, b[1] + (eb[1] - b[1]) * 0.4];
      W(`<path class="dl" filter="url(#pn)" d="M${n2(ga[0])} ${n2(ga[1])}L${n2(ea[0] + n[0] * o)} ${n2(ea[1] + n[1] * o)}M${n2(gb[0])} ${n2(gb[1])}L${n2(eb[0] + n[0] * o)} ${n2(eb[1] + n[1] * o)}M${n2(ea[0] - ux * 1.2)} ${n2(ea[1] - uy * 1.2)}L${n2(eb[0] + ux * 1.2)} ${n2(eb[1] + uy * 1.2)}"/>`);
      W(`<path class="tk" d="${tick(ea)}${tick(eb)}"/>`);
      let deg = (ang * 180) / Math.PI; if (deg > 60) deg -= 180; if (deg <= -120) deg += 180;   // вертикаль — снизу вверх, как в черчении
      const t = [(ea[0] + eb[0]) / 2 + n[0] * 1.9, (ea[1] + eb[1]) / 2 + n[1] * 1.9];
      W(`<text class="hand" text-anchor="middle" dominant-baseline="middle" transform="translate(${n2(t[0])} ${n2(t[1])}) rotate(${n2(deg)})" style="font-size:3px">${esc(d.text)}</text>`);
    }
    /* подпись от руки: название и стрелка к изделию — слева вверху */
    const hn = title, hfs = 3.1, hx = cx0 + 4, hy = ay + 5;
    W(`<text class="hand" x="${n2(hx)}" y="${n2(hy)}" style="font-size:${hfs}px">${esc(hn)}</text>`);
    const hw = Math.min(textWidth(hn, hfs, 400) * 0.62, cw * 0.6), sx0 = hx + hw + 1.5, sy0 = hy - 1;
    W(`<path class="dl" filter="url(#pn)" style="stroke-width:.2" d="M${n2(sx0)} ${n2(sy0)}Q${n2(sx0 + 7)} ${n2(sy0 - 0.5)} ${n2(sx0 + 10)} ${n2(sy0 + 5)}l-1.5 -.6M${n2(sx0 + 10)} ${n2(sy0 + 5)}l.5 -1.5"/>`);
    W(`<text class="cap" x="${cx1 - 2.5}" y="${FRAME.y0 + renderH - 2}" text-anchor="end" style="font-size:1.7px">ЭСКИЗ · ВИД 3/4</text>`);
    W(`<line class="th" x1="${cx0}" y1="${FRAME.y0 + renderH}" x2="${cx1}" y2="${FRAME.y0 + renderH}"/>`);
  }
  y = FRAME.y0 + renderH;
  /* заголовок таблицы */
  W(`<text class="cap" x="${cx0 + 2}" y="${n2(y + 5)}">СПЕЦИФИКАЦИЯ</text>`);
  y += 7.5;
  trows.forEach((r, i) => {
    if (i) W(`<line class="tl" x1="${cx0 + 2}" y1="${n2(y)}" x2="${cx1 - 2}" y2="${n2(y)}"/>`);
    const ty = y + 1.2 + tfs * 0.95;
    r.ll.forEach((l, j) => W(`<text x="${cx0 + 2}" y="${n2(y + 1.2 + 1.75 * 0.95 + j * 2.3 + (tfs - 1.75) * 0.5)}" style="font-size:1.75px;font-weight:600;letter-spacing:.18px;fill:#666">${esc(l)}</text>`));
    let vx = VAL_X;
    if (r.isFab && opts.swatchDataUrl) {
      W(`<image x="${VAL_X}" y="${n2(y + 0.9)}" width="8" height="8" preserveAspectRatio="xMidYMid slice" xlink:href="${opts.swatchDataUrl}" href="${opts.swatchDataUrl}"/>`);
      W(`<rect x="${VAL_X}" y="${n2(y + 0.9)}" width="8" height="8" fill="none" stroke="#999" stroke-width=".1"/>`);
      vx += 9.5;
    }
    r.ls.forEach((l, j) => W(`<text x="${n2(vx)}" y="${n2(ty + j * tfs * 1.28)}" style="font-size:${n2(tfs)}px;font-weight:${i === 0 ? 600 : 400}">${esc(l)}</text>`));
    y += r.h;
  });

  /* ---------- штамп 82 × 42 ---------- */
  const tb = { x0: cx0, x1: cx1, y0: tbY, y1: FRAME.y1 };
  W(`<g class="tb">`);
  W(`<line class="fr" x1="${tb.x0}" y1="${tb.y0}" x2="${tb.x1}" y2="${tb.y0}"/>`);
  const L1 = tb.x0 + 24;           // колонка логотипа
  const r1 = tb.y0 + 15, r2 = r1 + 10, r3 = r2 + 8.5;
  W(`<path class="th" d="M${L1} ${tb.y0}V${r2}M${L1} ${r1}H${tb.x1}M${tb.x0} ${r2}H${tb.x1}M${tb.x0} ${r3}H${tb.x1}"/>`);
  /* монограмма RD + RICCA DESIGNS */
  const mw = 15, mh = (mw * 256.9) / 521.1;
  W(`<g transform="translate(${n2(tb.x0 + (24 - mw) / 2)} ${n2(tb.y0 + 4)}) scale(${n2(mw / 521.1)})"><path fill="${INK}" d="${MONO_D}"/></g>`);
  W(`<text x="${n2(tb.x0 + 12)}" y="${n2(tb.y0 + 4 + mh + 5.2)}" text-anchor="middle" style="font-size:2.3px;font-weight:600;letter-spacing:.62px">RICCA</text>`);
  W(`<text x="${n2(tb.x0 + 12)}" y="${n2(tb.y0 + 4 + mh + 8.3)}" text-anchor="middle" style="font-size:1.4px;font-weight:500;letter-spacing:.32px">DESIGNS · ALMATY</text>`);
  /* название изделия + назначение листа */
  const tl = clampLines(wrap(title, tb.x1 - L1 - 4, 2.7, 600), 2, tb.x1 - L1 - 4, 2.7, 600);
  tl.forEach((l, i) => W(`<text x="${L1 + 2}" y="${n2(tb.y0 + 4.6 + i * 3.3)}" style="font-size:2.7px;font-weight:600">${esc(l)}</text>`));
  W(`<text x="${L1 + 2}" y="${n2(r1 - 2)}" style="font-size:1.9px;font-weight:400">Схема для согласования. Размеры в см</text>`);
  /* № · дата · масштаб · лист */
  const cells = [['№', id], ['Дата', date], ['Масштаб', scaleTxt], ['Лист', '1']];
  const cwid = [(tb.x1 - L1) * 0.33, (tb.x1 - L1) * 0.28, (tb.x1 - L1) * 0.25, (tb.x1 - L1) * 0.14];
  let cx = L1;
  cells.forEach(([k, v], i) => {
    if (i) W(`<line class="th" x1="${n2(cx)}" y1="${r1}" x2="${n2(cx)}" y2="${r2}"/>`);
    W(`<text x="${n2(cx + 1.6)}" y="${n2(r1 + 3.2)}" style="font-size:1.55px;font-weight:600;letter-spacing:.2px;fill:#666">${esc(k.toUpperCase())}</text>`);
    W(`<text x="${n2(cx + 1.6)}" y="${n2(r1 + 7.6)}" style="font-size:${i === 0 ? 2.5 : 2.3}px;font-weight:${i === 0 ? 600 : 500}">${esc(v)}</text>`);
    cx += cwid[i];
  });
  /* ателье и контакт */
  W(`<text x="${tb.x0 + 2}" y="${n2(r2 + 3.6)}" style="font-size:1.95px;font-weight:500">RICCA DESIGNS — ателье мягкой мебели, Алматы</text>`);
  W(`<text x="${tb.x0 + 2}" y="${n2(r2 + 6.6)}" style="font-size:1.85px;font-weight:400">ул. Алишера Навои, 208/2 · шоурум</text>`);
  W(`<text x="${tb.x0 + 2}" y="${n2(r3 + 3.7)}" style="font-size:2.1px;font-weight:600">+7 (707) 955-08-08</text>`);
  W(`<text x="${tb.x0 + 2}" y="${n2(r3 + 6.9)}" style="font-size:1.75px;font-weight:400;fill:#444">WhatsApp · номер схемы ${esc(id)} указывайте в переписке</text>`);
  W('</g>');

  /* под рамкой */
  W(`<text x="${FRAME.x0}" y="${n2(FRAME.y1 + 3.4)}" style="font-size:2px;font-weight:400;fill:#444">Это схема для подбора формы, размера и ткани; детали согласуем с мастером.</text>`);
  W(`<text x="${FRAME.x1}" y="${n2(FRAME.y1 + 3.4)}" text-anchor="end" style="font-size:2px;font-weight:400;fill:#444">${esc(scaleTxt)} · размеры в сантиметрах</text>`);
  W('</svg>');

  return {
    /* английский конструктор (js/cfg-en.js) переводит надписи чертежа; на русском — как есть */
    svg: globalThis.RICCA_CFG_TR ? globalThis.RICCA_CFG_TR.svg(out.join('\n')) : out.join('\n'), scale: scaleTxt, den, id, date, title,
    labels, rows: trows.map((r) => ({ label: r.label, value: r.value, lines: r.ls })),
    views: { front: pos.front, side: pos.side, top: pos.top },
    viewBoxes: Object.fromEntries([F, S, T].map((V) => [V.view, { x0: pos[V.view][0] - V.ext.l, y0: pos[V.view][1] - V.ext.t, x1: pos[V.view][0] + V.Wv + V.ext.r, y1: pos[V.view][1] + V.Hv + V.ext.b, obj: { x0: pos[V.view][0], y0: pos[V.view][1], x1: pos[V.view][0] + V.Wv, y1: pos[V.view][1] + V.Hv } }])),
    field: { ...FIELD, y1: fieldY1 },
  };
}

/* проверка: подписи не пересекаются друг с другом и с чужими линиями (для тестов и самоконтроля) */
export function checkOverlaps(res) {
  const bad = [];
  const L = res.labels;
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) if (boxHit(L[i].box, L[j].box, 0.1)) bad.push(`${L[i].view}:${L[i].id} × ${L[j].view}:${L[j].id}`);
  for (const a of L) for (const b of L) if (a !== b && b.segs) for (const s of b.segs) if (segHitsBox(s, a.box, 0.1)) { bad.push(`${a.view}:${a.id} ⟂ line ${b.view}:${b.id}`); break; }
  return bad;
}

/* ---------- браузер: шрифт, картинки, PNG ---------- */
const toDataUrl = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
let fontCssCache = null;
async function fontCss() {
  if (fontCssCache) return fontCssCache;
  const files = [
    ['montserrat-cyrillic-var-normal.woff2', 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116'],
    ['montserrat-latin-var-normal.woff2', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'],
  ];
  const parts = [];
  for (const [f, range] of files) {
    try {
      const r = await fetch(new URL(`../../fonts/montserrat/${f}`, import.meta.url));
      if (!r.ok) continue;
      const url = await toDataUrl(new Blob([await r.arrayBuffer()], { type: 'font/woff2' }));
      parts.push(`@font-face{font-family:Montserrat;font-style:normal;font-weight:100 900;src:url(${url}) format('woff2');unicode-range:${range}}`);
    } catch (e) { /* системный шрифт */ }
  }
  /* Caveat — размеры и подписи «от руки» (пути полностью: сборка копирует шрифты по ссылкам в коде) */
  for (const [f, range] of [['../../fonts/caveat/caveat-cyrillic-500-normal.woff2', 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116'], ['../../fonts/caveat/caveat-latin-500-normal.woff2', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2212,U+2215,U+FEFF,U+FFFD']]) {
    try {
      const r = await fetch(new URL(f, import.meta.url));
      if (!r.ok) continue;
      const url = await toDataUrl(new Blob([await r.arrayBuffer()], { type: 'font/woff2' }));
      parts.push(`@font-face{font-family:Caveat;font-style:normal;font-weight:400 700;src:url(${url}) format('woff2');unicode-range:${range}}`);
    } catch (e) { /* запасной рукописный шрифт системы */ }
  }
  fontCssCache = parts.join('\n');
  return fontCssCache;
}
async function imageToJpegDataUrl(src, maxW, maxH, quality = 0.9, cover = false) {
  let bmp;
  if (typeof src === 'string') { const r = await fetch(src); bmp = await createImageBitmap(await r.blob()); }
  else if (src instanceof Blob) bmp = await createImageBitmap(src);
  else bmp = src;                                            // canvas / img / ImageBitmap
  const sw = bmp.width || bmp.naturalWidth, sh = bmp.height || bmp.naturalHeight;
  let w = sw, h = sh;
  if (cover) { w = maxW; h = maxH; } else { const k = Math.min(1, maxW / sw, maxH / sh); w = Math.round(sw * k); h = Math.round(sh * k); }
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
  g.imageSmoothingQuality = 'high';
  if (cover) { const k = Math.max(w / sw, h / sh); const dw = sw * k, dh = sh * k; g.drawImage(bmp, (w - dw) / 2, (h - dh) / 2, dw, dh); }
  else g.drawImage(bmp, 0, 0, w, h);
  return c.toDataURL('image/jpeg', quality);
}

/* Эскиз карандашом из 3D-снимка (фон — пурпурный ключ #FF00FF, его нет у тканей): контур по силуэту, линии по перепадам
   яркости, штриховка по тени (тон считается внутри изделия — светлая и тёмная ткань выглядят одинаково «нарисованными»),
   тень на полу — лёгкая штриховка. Внутри изделия — бумага (закрывает штриховку фона листа), снаружи — прозрачно. */
export const PENCIL_KEY = '#FF00FF';
function pencilSketch(src) {
  const W = src.width, H = src.height, N = W * H;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(src, 0, 0);
  const img = g.getImageData(0, 0, W, H), px = img.data;
  const L = new Float32Array(N), M = new Float32Array(N), SH = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const r = px[i * 4], gg = px[i * 4 + 1], b = px[i * 4 + 2];
    const bg = r - gg > 45 && b - gg > 45 && Math.abs(r - b) < 70;
    M[i] = bg ? 0 : 1;
    L[i] = bg ? 1 : (0.2126 * r + 0.7152 * gg + 0.0722 * b) / 255;
    SH[i] = bg ? (r + b) / 510 : 1;
  }
  const blur = (a, rad) => {                                   // два прохода «коробкой» — почти гаусс
    let t = new Float32Array(N), o = new Float32Array(a);
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < H; y++) { let acc = 0, n = 0; for (let x = -rad; x < W + rad; x++) { if (x + rad < W) { acc += o[y * W + x + rad]; n++; } if (x - rad - 1 >= 0) { acc -= o[y * W + x - rad - 1]; n--; } if (x >= 0 && x < W) t[y * W + x] = acc / n; } }
      for (let x = 0; x < W; x++) { let acc = 0, n = 0; for (let y = -rad; y < H + rad; y++) { if (y + rad < H) { acc += t[(y + rad) * W + x]; n++; } if (y - rad - 1 >= 0) { acc -= t[(y - rad - 1) * W + x]; n--; } if (y >= 0 && y < H) o[y * W + x] = acc / n; } }
    }
    return o;
  };
  const sm = (x, a, b) => Math.min(1, Math.max(0, (x - a) / (b - a)));
  const Lb = blur(L, 1), Mb = blur(M, 1);
  /* тон внутри изделия: 3-й и 97-й процентили яркости */
  const hist = new Uint32Array(256); let cnt = 0;
  for (let i = 0; i < N; i++) if (M[i]) { hist[Math.min(255, (L[i] * 255) | 0)]++; cnt++; }
  const pct = (q) => { let acc = 0; for (let k = 0; k < 256; k++) { acc += hist[k]; if (acc >= q * cnt) return k / 255; } return 1; };
  const lo = pct(0.03), hi = Math.max(pct(0.97), lo + 0.05);
  let shRef = 0; for (let i = 0; i < N; i++) if (!M[i] && SH[i] > shRef) shRef = SH[i];
  const out = g.createImageData(W, H), o = out.data;
  const PR = 244, PG = 243, PB = 240, GR = 43;
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const WX = new Float32Array(W), WY = new Float32Array(H);              // «дрожание» штриха: заранее по строкам и столбцам
  for (let x = 0; x < W; x++) WX[x] = 0.8 * Math.sin(x / 31);
  for (let y = 0; y < H; y++) WY[y] = 1.2 * Math.sin(y / 23);
  const R2 = Math.SQRT1_2;
  const hatch = (x, y, dir, sp, w) => {                       // dir: 1 — 45°, -1 — −45°, 0 — горизонталь
    const u = (dir === 0 ? y : (x + dir * y) * R2) + WX[x] + WY[y];
    const d = Math.abs(((u / sp) % 1 + 1) % 1 - 0.5) * sp; return sm(w - d, 0, 0.9);
  };
  const k = Math.max(1, W / 1200);                             // шаг штриховки — от размера кадра
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const gx = x > 0 && x < W - 1 ? Lb[i + 1] - Lb[i - 1] : 0, gy = y > 0 && y < H - 1 ? Lb[i + W] - Lb[i - W] : 0;
    const line = sm(Math.hypot(gx, gy), 0.012, 0.06) * 0.85;
    const sil = sm(1 - Math.abs(Mb[i] - 0.5) * 2, 0.2, 0.7);
    let ink;
    if (M[i]) {
      const tone = Math.min(1, Math.max(0, (hi - L[i]) / (hi - lo)));
      const h = (tone > 0.3 ? hatch(x, y, 1, 7 * k, 0.9 * k) * sm(tone, 0.3, 0.55) * 0.55 : 0) + (tone > 0.6 ? hatch(x, y, -1, 7 * k, 0.8 * k) * sm(tone, 0.6, 0.85) * 0.45 : 0) + (tone > 0.85 ? hatch(x, y, 0, 5 * k, 0.7 * k) * sm(tone, 0.85, 1) * 0.35 : 0);
      const dark = sm(0.3 - L[i], 0, 0.15) * 0.85;           // ножки, чёрный металл
      ink = Math.max(line, sil, h, dark) * (0.75 + 0.25 * rnd());
      const a = Math.max(Mb[i], ink);
      o[i * 4] = PR * (1 - ink) + GR * ink; o[i * 4 + 1] = PG * (1 - ink) + GR * ink; o[i * 4 + 2] = PB * (1 - ink) + GR * ink; o[i * 4 + 3] = 255 * Math.min(1, a + sil);
    } else {
      const shade = sm(1 - SH[i] / (shRef || 1), 0.08, 0.45);  // тень на полу
      ink = Math.max(sil, shade > 0 ? hatch(x, y, 1, 6 * k, 0.7 * k) * shade * 0.45 : 0) * (0.75 + 0.25 * rnd());
      o[i * 4] = GR; o[i * 4 + 1] = GR; o[i * 4 + 2] = GR; o[i * 4 + 3] = 255 * ink;
    }
  }
  g.putImageData(out, 0, 0);
  /* рамка изделия (с тенью) на снимке — для кадрирования и фона-штриховки */
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (M[y * W + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { canvas: c, box: x1 > x0 ? [x0, y0, x1, y1] : [0, 0, W, H] };
}

/* размеры на эскизе: рёбра габарита в перспективе (ширина — по фронту внизу, глубина — по видимому боку, высота — у дальнего
   переднего угла), вынесены наружу от центра изделия; P — точки снимка (stage.snapshot project) */
function sketchDims(P, cam, box, bb) {
  const [c0, c1, c2, c3, c4, c5, c6, c7, cc] = P;          // см. порядок в render()
  const leftVisible = cam[0] < (box.min.x + box.max.x) / 2;
  const off = (a, b, d) => {                               // сдвиг отрезка наружу (от центра изделия) на d пикселей
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; let nx = -(b[1] - a[1]), ny = b[0] - a[0];
    const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    if (nx * (mx - cc[0]) + ny * (my - cc[1]) < 0) { nx = -nx; ny = -ny; }
    return { a, b, ea: [a[0] + nx * d, a[1] + ny * d], eb: [b[0] + nx * d, b[1] + ny * d], n: [nx, ny] };
  };
  const D = Math.hypot(c1[0] - c0[0], c1[1] - c0[1]) * 0.075 + 14;
  const out = [];
  out.push({ ...off(c0, c1, D), text: fmtLen(bb.w) });                                                  // ширина: фронт, низ
  out.push({ ...(leftVisible ? off(c2, c0, D) : off(c1, c3, D)), text: fmtLen(bb.d) });                 // глубина: видимый бок
  out.push({ ...(leftVisible ? off(c1, c5, D * 0.8) : off(c0, c4, D * 0.8)), text: fmtLen(bb.h) });     // высота: передний угол с другой стороны
  return out;
}

export async function render(cfg, { stage = null, render3q = null } = {}) {
  const type = cfg.type;
  const params = normalize(type, cfg.params || {});
  const pr = partsOf(type, params);
  let render3qDataUrl = null, swatchDataUrl = null, sketch = null;
  try {
    if (render3q) render3qDataUrl = typeof render3q === 'string' && render3q.startsWith('data:') ? render3q : await imageToJpegDataUrl(render3q, 1200, 850, 0.9);
    else if (stage && stage.snapshot) {
      const b = stage.box, a = b.min, z = b.max;
      const pts = [[a.x, a.y, z.z], [z.x, a.y, z.z], [a.x, a.y, a.z], [z.x, a.y, a.z], [a.x, z.y, z.z], [z.x, z.y, z.z], [a.x, z.y, a.z], [z.x, z.y, a.z], [(a.x + z.x) / 2, (a.y + z.y) / 2, (a.z + z.z) / 2]];
      const shot = await stage.snapshot({ width: 1400, height: 1000, view: '3q', watermark: false, background: PENCIL_KEY, project: pts });
      if (shot && shot.blob) {
        const pen = pencilSketch(await createImageBitmap(shot.blob));
        const dims = sketchDims(shot.points, shot.camera, b, pr.bbox);
        /* кадр: изделие + вынесенные размеры (+ место под цифры), поля 3 % */
        let [x0, y0, x1, y1] = pen.box;
        for (const d of dims) for (const q of [d.ea, d.eb]) { x0 = Math.min(x0, q[0] - 30); x1 = Math.max(x1, q[0] + 30); y0 = Math.min(y0, q[1] - 30); y1 = Math.max(y1, q[1] + 30); }
        const W0 = pen.canvas.width, H0 = pen.canvas.height, m = 0.03 * W0;
        x0 = Math.max(0, Math.floor(x0 - m)); y0 = Math.max(0, Math.floor(y0 - m)); x1 = Math.min(W0, Math.ceil(x1 + m)); y1 = Math.min(H0, Math.ceil(y1 + m));
        const cw = x1 - x0, ch = y1 - y0, cc = document.createElement('canvas'); cc.width = cw; cc.height = ch;
        cc.getContext('2d').drawImage(pen.canvas, x0, y0, cw, ch, 0, 0, cw, ch);
        const sh = (q) => [q[0] - x0, q[1] - y0];
        sketch = { w: cw, h: ch, obj: [pen.box[0] - x0, pen.box[1] - y0, pen.box[2] - x0, pen.box[3] - y0], dims: dims.map((d) => ({ a: sh(d.a), b: sh(d.b), ea: sh(d.ea), eb: sh(d.eb), n: d.n, text: d.text })) };
        render3qDataUrl = cc.toDataURL('image/png');
      }
    }
  } catch (e) { console.warn('sketch', e); render3qDataUrl = null; sketch = null; }
  try { if (cfg.fabric && cfg.fabric.src450) swatchDataUrl = await imageToJpegDataUrl(cfg.fabric.src450, 120, 120, 0.88, true); } catch (e) { swatchDataUrl = null; }
  const css = await fontCss();
  const res = layoutSheet({ ...cfg, params }, pr, { render3qDataUrl, swatchDataUrl, sketch, fontCss: css });
  const svg = res.svg;
  async function toPNG(width = 3508) {
    const height = Math.round((width * SHEET.h) / SHEET.w);
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    try {
      const img = new Image();
      img.decoding = 'sync';
      img.src = url;
      await (img.decode ? img.decode() : new Promise((r, j) => { img.onload = r; img.onerror = j; }));
      const c = document.createElement('canvas'); c.width = width; c.height = height;
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, width, height);
      g.drawImage(img, 0, 0, width, height);
      return await new Promise((r) => c.toBlob((b) => r(b), 'image/png'));
    } finally { URL.revokeObjectURL(url); }
  }
  return { svg, toPNG, scale: res.scale, id: res.id, layout: res };
}

export default { layoutSheet, render, checkOverlaps, textWidth };
