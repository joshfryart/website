(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const PAGE = 48;
  const YEARS = [
    { y: '2026', blurb: 'Fresh off <b>Bluesky</b>, planted as it grows.' },
    { y: '2025', blurb: 'A year of cosmos, nasturtiums and one very judgy cat.' },
    { y: '2024', blurb: 'Flowers, moths and a lot of bees.' },
    { y: '2023', blurb: 'The older beds, <b>2023 and earlier</b>.' }
  ];
  const GLASS = ['Stained Glass Thoughts', 'A Valley and a Mountain', 'Cold Wind Blowing', 'Treeline', 'Skyward Gaze'];
  const GANG_FROM = [17, 22, 23, 24, 25, 26]; // 1-based pieces from the art list that are NOT the Puzzle Gang
  const el = (tag, attrs = {}, kids = []) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) k === 'text' ? (n.textContent = v) : k === 'html' ? (n.innerHTML = v) : n.setAttribute(k, v);
    kids.forEach(c => n.append(c));
    return n;
  };
  const img = (it, alt, big) => el('img', { src: it.src + (big ? '.webp' : '-s.webp'), width: it.w, height: it.h, alt: alt || '', loading: 'lazy', decoding: 'async' });

  /* ---------- lightbox ---------- */
  const lb = $('#lb'), stage = $('#lb-stage'), cap = $('#lb-cap');
  let list = [], at = 0, opener = null;
  const show = i => {
    at = (i + list.length) % list.length;
    const it = list[at];
    const [text = '', alt = '', post = ''] = (it.cap || '').split('|');
    const big = el('img', { src: it.src + '.webp', alt: alt || it.title || 'Photo by Josh Fry' });
    stage.replaceChildren(big);
    const clean = text.replace(/#\S+/g, '').replace(/\p{Extended_Pictographic}/gu, '').replace(/\s+/g, ' ').trim();
    cap.replaceChildren(el('span', { text: it.title || clean || alt }));
    if (post.startsWith('http')) cap.append(' ', el('a', { href: post, rel: 'noopener', text: 'See the post' }));
    [list[at + 1], list[at - 1]].forEach(n => n && (new Image().src = n.src + '.webp'));
  };
  const open = (items, i, from) => { list = items; opener = from; show(i); lb.showModal(); };
  $('#lb-x').onclick = () => lb.close();
  $('#lb-prev').onclick = () => show(at - 1);
  $('#lb-next').onclick = () => show(at + 1);
  lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
  lb.addEventListener('close', () => { stage.replaceChildren(); opener && opener.focus(); });
  lb.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') show(at - 1);
    if (e.key === 'ArrowRight') show(at + 1);
  });

  /* ---------- builders ---------- */
  const picButton = (items, i, alt, it) => {
    const kids = [img(items[i], alt)];
    if (it && it.d) kids.push(el('span', { class: 'when', text: dateLabel(it.d) }));
    const b = el('button', { class: 'pic', type: 'button', 'aria-label': 'Open photo ' + (i + 1) + (it && it.d ? ', ' + dateLabel(it.d) : '') }, kids);
    b.onclick = () => open(items, i, b);
    return b;
  };
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dateLabel = d => { const [, m, day] = d.split('-'); return MONTHS[+m - 1].slice(0, 3) + ' ' + +day; };
  const bed = (cfg, items) => {
    const head = el('header', { class: 'bed-head' }, [
      el('h2', { id: 'h' + cfg.y, text: cfg.y }),
      el('p', { html: `${cfg.blurb} <b>${items.length} photos.</b>` })
    ]);
    const sec = el('section', { class: 'bed y' + cfg.y, id: 'y' + cfg.y, 'aria-labelledby': 'h' + cfg.y }, [head]);
    if (items[0] && items[0].d) {
      // dated year: one grid per month, newest first
      const all = [...items].sort((x, y) => y.d.localeCompare(x.d));
      const byMonth = new Map();
      all.forEach(it => { const k = it.d.slice(0, 7); byMonth.set(k, [...(byMonth.get(k) || []), it]); });
      [...byMonth.keys()].sort().reverse().forEach(k => {
        const month = byMonth.get(k);
        const rows = el('div', { class: 'rows' });
        month.forEach(it => rows.append(picButton(all, all.indexOf(it), it.cap.split('|')[1], it)));
        sec.append(el('h3', { class: 'month', text: MONTHS[+k.slice(5) - 1] + ' ' + k.slice(0, 4) }, [el('small', { text: month.length + ' photos' })]), rows);
      });
      return sec;
    }
    const rows = el('div', { class: 'rows' });
    sec.append(rows);
    let shown = 0;
    const more = el('div', { class: 'more' });
    const grow = () => {
      const end = Math.min(shown + PAGE, items.length);
      for (; shown < end; shown++) rows.append(picButton(items, shown, items[shown].cap.split('|')[1], items[shown]));
      more.replaceChildren();
      if (shown < items.length) {
        const b = el('button', { type: 'button', text: 'Water the bed for more' });
        b.onclick = () => { const f = shown; grow(); const n = rows.children[f]; n && n.querySelector('img').scrollIntoView({ block: 'center', behavior: 'smooth' }); };
        more.append(b, el('small', { text: `${items.length - shown} still to bloom` }));
      }
    };
    grow();
    sec.append(more);
    return sec;
  };

  /* ---------- go ---------- */
  Promise.all([fetch('gallery.json').then(r => r.json()), fetch('gallery-art.json').then(r => r.json())]).then(([g, a]) => {
    const byYear = y => g.filter(x => x.y === y);
    const beds = $('#beds');
    YEARS.forEach(c => beds.append(bed(c, byYear(c.y))));

    // hero posy: five favourites, spread across the years
    const pick = [['2025', 62], ['2024', 78], ['2026', 248], ['2024', 96], ['2025', 36]];
    const pool = pick.map(([y, i]) => byYear(y)[i]).filter(Boolean);
    const posy = $('#posy');
    pool.forEach((it, i) => {
      const li = el('li', { style: `--i:${i}` });
      const b = el('button', { type: 'button', 'aria-label': 'Open favourite photo ' + (i + 1) }, [el('img', { src: it.src + '-s.webp', width: it.w, height: it.h, alt: '' })]);
      b.onclick = () => open(pool, i, b);
      li.append(b); posy.append(li);
    });

    // stained glass
    const glass = a.glass.map((it, i) => ({ ...it, title: GLASS[i] || 'Stained glass ' + (i + 1) }));
    const gg = $('#glass-grid');
    glass.forEach((it, i) => {
      const b = el('button', { type: 'button', 'aria-label': 'Open ' + it.title }, [img(it, it.title)]);
      b.onclick = () => open(glass, i, b);
      gg.append(el('li', {}, [b, el('span', { text: it.title })]));
    });

    // digital art vs the puzzle gang
    const all = a.art.map((it, i) => ({ ...it, n: i + 1 }));
    const art = all.filter(x => !GANG_FROM.includes(x.n) && x.n <= 21);
    const gang = all.filter(x => !art.includes(x));
    const fill = (target, items, alt) => items.forEach((it, i) => {
      const b = el('button', { type: 'button', 'aria-label': alt + ' ' + (i + 1) }, [img(it, alt + ' ' + (i + 1))]);
      b.onclick = () => open(items, i, b);
      target.append(el('li', {}, [b]));
    });
    fill($('#art-grid'), art, 'Digital artwork');
    fill($('#gang-grid'), gang, 'Puzzle Gang piece');
    watch();
  });

  /* ---------- nav: current stake + snail ---------- */
  const watch = () => {
    const links = [...document.querySelectorAll('.stake[href^="#"]')];
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(l => l.classList.toggle('on', l.getAttribute('href') === '#' + e.target.id));
    }), { rootMargin: '-35% 0px -60% 0px' });
    links.forEach(l => { const t = document.getElementById(l.getAttribute('href').slice(1)); t && io.observe(t); });
  };
  const bar = document.querySelector('.bar');
  const crawl = () => {
    const h = document.documentElement;
    bar.style.setProperty('--p', Math.min(1, scrollY / Math.max(1, h.scrollHeight - innerHeight)).toFixed(4));
  };
  addEventListener('scroll', crawl, { passive: true });
  crawl();
})();
