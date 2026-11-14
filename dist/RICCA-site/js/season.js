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
  h.setAttribute('data-season', s);
})(document.documentElement);
