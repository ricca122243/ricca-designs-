/* RICCA · время года (владелец, 15 ноября: «стили под погоду — снег, значит светло-синий»). До первой отрисовки ставит
   <html data-season="winter|spring|summer|autumn"> по дате в Алматы; цвета — css/site.css, блок «Время года».
   Посмотреть любой сезон: ?season=winter (запоминается до конца визита), вернуть по дате — ?season=auto. */
(function (h) {
  var s = '';
  try {
    var q = (location.search.match(/[?&]season=(winter|spring|summer|autumn|auto)\b/) || [])[1];
    if (q === 'auto') sessionStorage.removeItem('ricca:season');
    else if (q) sessionStorage.setItem('ricca:season', q);
    s = sessionStorage.getItem('ricca:season') || '';
  } catch (e) { /* без sessionStorage — по дате */ }
  if (!s) {
    var m;
    try { m = +new Intl.DateTimeFormat('en', { timeZone: 'Asia/Almaty', month: 'numeric' }).format(new Date()); } catch (e) { m = new Date().getMonth() + 1; }
    s = m === 12 || m <= 2 ? 'winter' : m <= 5 ? 'spring' : m <= 8 ? 'summer' : 'autumn';
  }
  /* Новый год (24 ноября, владелец: «новогодний вайб»): с 1 декабря по 14 января — <html data-ny="pre"> до праздника
     и data-ny="post" после 1 января. По нему js/snow.js включает снег на первом экране и поздравление.
     Посмотреть заранее: ?ny=1 (до конца визита, вместе с зимней палитрой), выключить показ — ?ny=0 */
  var ny = '', show = false, md = [0, 0];
  try {
    var qn = (location.search.match(/[?&]ny=([01])\b/) || [])[1];
    if (qn === '1') sessionStorage.setItem('ricca:ny', '1');
    if (qn === '0') sessionStorage.removeItem('ricca:ny');
    show = sessionStorage.getItem('ricca:ny') === '1';
  } catch (e) { show = /[?&]ny=1\b/.test(location.search); }
  try {
    var parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Almaty', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
    parts.forEach(function (p) { if (p.type === 'month') md[0] = +p.value; if (p.type === 'day') md[1] = +p.value; });
  } catch (e) { var d0 = new Date(); md = [d0.getMonth() + 1, d0.getDate()]; }
  if (md[0] === 12) ny = 'pre';
  else if (md[0] === 1 && md[1] <= 14) ny = 'post';
  else if (show) { ny = 'pre'; if (!/[?&]season=/.test(location.search)) s = 'winter'; }
  if (ny) h.setAttribute('data-ny', ny);
  h.setAttribute('data-season', s);
})(document.documentElement);
