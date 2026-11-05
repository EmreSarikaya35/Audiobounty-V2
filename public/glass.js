// Liquid Glass, after Glisse (glisse.kelvinzhang.ca).
// - Refraction: for each glass element a displacement map is drawn for its exact size and used in an SVG filter
//   inside backdrop-filter. It bends what is behind the glass near the rim, magnifies it for lenses and splits the
//   colours a little. Only Chromium supports SVG filters in backdrop-filter; elsewhere the frosted glass stays.
// - Press: buttons grow and glow where they are pressed. Slider and switch thumbs lift into clear lenses, and the
//   selection of a segmented control lifts into a lens that can be dragged to another option.
// The native controls stay where they are, so keyboard, forms and screen readers work as before.
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const refracts = CSS.supports('backdrop-filter', 'url(#x)') && !/Version\/[\d.]+.*Safari/.test(navigator.userAgent)
    && !matchMedia('(prefers-reduced-transparency: reduce)').matches;
  let svg = null, count = 0;
  // Liquid Glass can be switched off in Settings (stored like the theme); the page sets .no-glass before it paints.
  const glassOn = () => !document.documentElement.classList.contains('no-glass');

  // Signed distance to a rounded rectangle centred on 0 with half-size hw x hh (negative inside).
  const sdf = (x, y, hw, hh, r) => {
    const qx = Math.abs(x) - hw + r, qy = Math.abs(y) - hh + r;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
  };

  // Red and green hold the x and y offset around 128. Near the rim (bezel px) the backdrop is pulled from further
  // inside, like the curved edge of a lens; zoom > 1 also pulls the middle towards the centre, which magnifies it.
  function displacementMap(w, h, r, bezel, zoom) {
    const hw = w / 2, hh = h / 2;
    r = Math.min(r, hw, hh);
    const vx = new Float32Array(w * h), vy = new Float32Array(w * h);
    let max = 1e-3;
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const x = i + 0.5 - hw, y = j + 0.5 - hh, k = j * w + i;
        let dx = -x * (1 - 1 / zoom), dy = -y * (1 - 1 / zoom);
        const depth = -sdf(x, y, hw, hh, r);
        if (depth < bezel) {
          const nx = sdf(x + 1, y, hw, hh, r) - sdf(x - 1, y, hw, hh, r), ny = sdf(x, y + 1, hw, hh, r) - sdf(x, y - 1, hw, hh, r);
          const len = Math.hypot(nx, ny) || 1, t = 1 - Math.max(depth, 0) / bezel, pull = t * t * bezel;
          dx -= (nx / len) * pull;
          dy -= (ny / len) * pull;
        }
        vx[k] = dx;
        vy[k] = dy;
        max = Math.max(max, Math.abs(dx), Math.abs(dy));
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext('2d'), img = g.createImageData(w, h);
    for (let k = 0; k < w * h; k++) {
      img.data[k * 4] = 128 + (vx[k] / max) * 127;
      img.data[k * 4 + 1] = 128 + (vy[k] / max) * 127;
      img.data[k * 4 + 2] = 128;
      img.data[k * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return { href: canvas.toDataURL(), scale: max * 2 };
  }

  // One displacement per colour channel, each a little weaker than the last: the rim splits light like glass does.
  function writeFilter(id, map, w, h, dispersion) {
    if (!svg) {
      svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('aria-hidden', 'true');
      svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      document.body.append(svg);
    }
    let f = document.getElementById(id);
    if (!f) {
      f = svg.appendChild(document.createElementNS(NS, 'filter'));
      f.id = id;
    }
    const attrs = { x: 0, y: 0, width: w, height: h, filterUnits: 'userSpaceOnUse', primitiveUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' };
    for (const [k, v] of Object.entries(attrs)) f.setAttribute(k, v);
    const pick = ['1 0 0 0 0 0 0 0 0 0 0 0 0 0 0', '0 0 0 0 0 0 1 0 0 0 0 0 0 0 0', '0 0 0 0 0 0 0 0 0 0 0 0 1 0 0'];
    f.innerHTML = `<feImage href="${map.href}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="map"/>`
      + pick.map((m, c) => `<feDisplacementMap in="SourceGraphic" in2="map" scale="${map.scale * (1 - dispersion * c)}" xChannelSelector="R" yChannelSelector="G" result="ray${c}"/>`
        + `<feColorMatrix in="ray${c}" type="matrix" values="${m} 0 0 0 1 0" result="ch${c}"/>`).join('')
      + '<feComposite in="ch0" in2="ch1" operator="arithmetic" k2="1" k3="1" result="rg"/>'
      + '<feComposite in="rg" in2="ch2" operator="arithmetic" k2="1" k3="1"/>';
  }

  // A backdrop-filter value that refracts a w x h glass shape, or null where SVG backdrop filters don't work.
  const shapes = new Map();
  function glassFilter(w, h, r, { bezel = 12, zoom = 1, dispersion = 0.04, before = 'blur(3px)', after = 'saturate(1.6)' } = {}) {
    if (!refracts || w < 1 || h < 1) return null;
    w = Math.round(w);
    h = Math.round(h);
    const key = [w, h, r, bezel, zoom, dispersion].join();
    if (!shapes.has(key)) {
      const id = `glass-${count++}`;
      writeFilter(id, displacementMap(w, h, r, Math.min(bezel, w / 2, h / 2), zoom), w, h, dispersion);
      shapes.set(key, id);
    }
    return `${before} url(#${shapes.get(key)}) ${after}`;
  }

  // Keeps an element's refraction matched to its size and shape.
  const panes = [];
  function refract(el, opts) {
    if (!refracts) return;
    const update = () => {
      const value = glassOn() && glassFilter(el.offsetWidth, el.offsetHeight, parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, opts);
      el.style.backdropFilter = el.style.webkitBackdropFilter = value || '';
    };
    panes.push(update);
    new ResizeObserver(update).observe(el);
    update();
  }

  const lensOpts = { bezel: 7, zoom: 1.45, dispersion: 0.06, before: 'blur(.4px)', after: 'saturate(1.5) brightness(1.05)' };

  // Sliders and switches get a thumb element (a pseudo-element can't hold a lens of its own).
  for (const input of document.querySelectorAll('input[type=range]:not(.trim input), input.switch')) {
    const kind = input.type === 'range' ? 'range' : 'switch';
    const wrap = document.createElement('span');
    wrap.className = `${kind}-wrap`;
    input.before(wrap);
    wrap.append(input);
    const thumb = document.createElement('span');
    thumb.className = `${kind}-thumb`;
    thumb.setAttribute('aria-hidden', 'true');
    thumb.innerHTML = '<i></i>';
    wrap.append(thumb);
    if (kind === 'range') wrap.style.setProperty('--pp', (input.value - input.min) / (input.max - input.min || 1));
    input.addEventListener('pointerdown', (e) => {
      if (glassOn()) {
        // The lens is only drawn while held (the CSS reads --lens), so a resting thumb costs nothing.
        thumb.style.setProperty('--lens', glassFilter(thumb.offsetWidth, thumb.offsetHeight, 99, lensOpts) || '');
        wrap.classList.add('lifted');
      }
      if (kind === 'switch' && !input.disabled) dragSwitch(e, input, wrap, thumb);
    });
    input.addEventListener('blur', () => wrap.classList.remove('lifted'));
  }

  // Switch thumbs follow the pointer while held; letting go settles on the nearer side. A drag decides the state
  // itself, so the click that follows it (from the label or the input) is cancelled.
  let cancelClick = false;
  document.addEventListener('click', (e) => {
    if (!cancelClick) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);
  function dragSwitch(down, input, wrap, thumb) {
    const travel = input.offsetWidth - thumb.offsetWidth - 4, from = input.checked ? travel : 0;
    let x = from, moved = false;
    const move = (e) => {
      if (!moved && Math.abs(e.clientX - down.clientX) < 3) return;
      moved = true;
      x = Math.max(0, Math.min(travel, from + e.clientX - down.clientX));
      wrap.classList.add('dragging');
      wrap.style.setProperty('--t', x / travel);
      thumb.style.transform = `translateX(${x}px)${glassOn() ? ' scale(1.5)' : ''}`;
    };
    const up = () => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      removeEventListener('pointercancel', up);
      wrap.classList.remove('dragging', 'lifted');
      thumb.style.transform = '';
      if (!moved) return;
      cancelClick = true;
      setTimeout(() => { cancelClick = false; }); // the click, if any, comes in the same task as pointerup
      const on = x > travel / 2;
      if (on !== input.checked) {
        input.checked = on;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);
  }

  // Buttons glow from the point that is pressed (the CSS reads --gx and --gy) and, while held, stretch towards the
  // pointer like a drop of liquid; letting go springs them back. Rows, menu items and segments keep still.
  const soft = (v) => v / (1 + Math.abs(v)); // keeps following the pointer, but less and less
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('button, .btn');
    if (!b || e.button !== 0) return;
    const r = b.getBoundingClientRect();
    b.style.setProperty('--gx', `${e.clientX - r.left}px`);
    b.style.setProperty('--gy', `${e.clientY - r.top}px`);
    if (!glassOn() || b.disabled || b.matches('.seg button, .menu button, .reward-main, .activity, .now-playing, .wide-btn')) return;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const move = (ev) => {
      const ex = soft((ev.clientX - cx) / (r.width / 2)), ey = soft((ev.clientY - cy) / (r.height / 2));
      b.style.setProperty('--gx', `${ev.clientX - r.left}px`);
      b.style.setProperty('--gy', `${ev.clientY - r.top}px`);
      b.style.transition = 'transform 140ms cubic-bezier(.2,.9,.3,1), background-color 200ms';
      // pulled towards the pointer: longer along the pull, thinner across it
      b.style.transform = `translate(${ex * 16}px, ${ey * 10}px) scale(${1.07 + Math.abs(ex) * 0.3 - Math.abs(ey) * 0.1}, ${1.07 + Math.abs(ey) * 0.3 - Math.abs(ex) * 0.12})`;
    };
    const up = () => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      removeEventListener('pointercancel', up);
      b.style.transition = '';
      b.style.transform = '';
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);
  }, true);

  // Segmented controls: pressing lifts the selection pill (.seg::before) into a lens under the pointer; dragging
  // moves it, and letting go over another option selects it. The page's own click handlers do the selecting.
  let seg = null, startX = 0, moved = false;
  const pillAt = (s, x) => {
    const r = s.getBoundingClientRect(), w = parseFloat(s.style.getPropertyValue('--pill-w')) || r.width / s.querySelectorAll('button').length;
    s.style.setProperty('--pill-x', `${Math.max(0, Math.min(r.width - w - 4, x - r.left - w / 2))}px`);
  };
  const optionAt = (s, x) => [...s.querySelectorAll('button')].find((b) => {
    const r = b.getBoundingClientRect();
    return x >= r.left && x <= r.right;
  });
  document.addEventListener('pointerdown', (e) => {
    const s = e.target.closest('.seg');
    if (!s || e.button !== 0 || !glassOn()) return;
    seg = s;
    startX = e.clientX;
    moved = false;
    const b = e.target.closest('button');
    if (b) s.style.setProperty('--pill-w', `${b.offsetWidth}px`);
    const lens = glassFilter(b?.offsetWidth || 0, s.offsetHeight - 4, 99, lensOpts);
    if (lens) s.style.setProperty('--lens', lens);
    s.classList.add('has-on', 'lifted');
    pillAt(s, e.clientX);
  });
  addEventListener('pointermove', (e) => {
    if (!seg) return;
    if (Math.abs(e.clientX - startX) > 4) moved = true;
    seg.classList.toggle('dragging', moved);
    pillAt(seg, e.clientX);
  });
  const release = (e) => {
    document.querySelectorAll('.lifted').forEach((w) => w.classList.remove('lifted'));
    if (!seg) return;
    const s = seg;
    seg = null;
    s.classList.remove('dragging');
    const target = e.type === 'pointerup' && moved ? optionAt(s, e.clientX) : null;
    // A tap is an ordinary click; a drag ends on another button, so no click fires and we send one.
    if (target && !target.classList.contains('on')) target.click();
    requestAnimationFrame(() => {
      const on = s.querySelector('button.on');
      s.classList.toggle('has-on', Boolean(on));
      if (on) {
        s.style.setProperty('--pill-x', `${on.offsetLeft - 2}px`);
        s.style.setProperty('--pill-w', `${on.offsetWidth}px`);
      }
    });
  };
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);

  // Refraction is kept to a few small panes: every refracting pane is redrawn whenever what is behind it moves
  // (scrolling, animations), so cards, rows and sheets use plain translucent glass instead.
  document.querySelectorAll('header.top').forEach((el) => refract(el, { bezel: 16, before: 'blur(4px)', after: 'saturate(1.8)' }));
  document.querySelectorAll('.statusbar .menu, #toast, .consent').forEach((el) => refract(el, { bezel: 14, before: 'blur(10px)', after: 'saturate(1.9)' }));

  window.liquidGlass = {
    get on() { return glassOn(); },
    set(on) {
      document.documentElement.classList.toggle('no-glass', !on);
      // Saved only with full cookie consent, like the language and theme.
      try {
        if (/(?:^|; )consent=all/.test(document.cookie)) localStorage.setItem('glass', on ? 'on' : 'off');
        else localStorage.removeItem('glass');
      } catch {}
      panes.forEach((update) => update());
    },
  };
})();
