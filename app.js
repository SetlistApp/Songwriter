/* Songwriter: the screen. Holds the state (what's picked), draws the page from it, and
   handles taps and drag-and-drop. Music rules come from SW.theory, drawings from SW.instruments.

   Use: SW.app.mount(someElement). Everything is drawn inside that element, so it can be
   dropped into the Setlist app later. */
(function (root) {
  const SW = root.SW = root.SW || {};
  const T = SW.theory;
  const INST = SW.instruments;

  const LAND_QUERY = '(orientation: landscape) and (max-height: 520px)';   // phone turned sideways
  const DESK_QUERY = '(min-width: 900px)';
  const APP_VERSION = '0.9';   // shown next to the title, like the Setlist app; keep in step with CHANGELOG.md
  const SNAPSHOT_KEY = 'songwriter_reloadSnapshot';   // keeps your work through an automatic update
  const DRAG_START_PX = 6;   // a finger has to move this far before a tap becomes a drag

  function mount(el) {
    const state = {
      tonic: T.parseNote('C'),
      scaleId: 'major',
      size: 3,               // 3 = triads, 4 = 7th chords
      tab: 'key',            // 'key' | 'borrowed' | 'any'
      anySemi: 0,            // "Any chord" root, in half-steps above the key
      anyType: 'maj',
      instrument: 'guitar',  // 'guitar' | 'piano'
      labels: 'notes',       // 'notes' | 'degrees'
      shown: null,           // chord spec shown on the instrument (null = show the scale)
      selChip: -1,           // selected progression chip (tap a chord card to swap it)
      progression: [],       // chord specs, stored relative to the key
      sheet: null            // 'key' | 'scale' | null
    };
    restoreSnapshot(state);
    const landMq = root.matchMedia(LAND_QUERY);
    const deskMq = root.matchMedia(DESK_QUERY);
    let drag = null;
    let suppressClick = false;
    let lastInstrument = null;

    // ---------- Small helpers ----------
    const layout = () => (landMq.matches ? 'land' : deskMq.matches ? 'desk' : 'phone');
    const scale = () => T.getScale(state.scaleId);
    const chord = (spec) => T.buildChord(state.tonic, spec);
    const specAttr = (s) => `${s.deg},${s.semi},${s.quality},${s.of || ''}`;
    const parseSpec = (text) => {
      const [deg, semi, quality, of] = text.split(',');
      const spec = { deg: +deg, semi: +semi, quality };
      if (of) spec.of = of;   // secondary dominant: "V/ii" leads to ii
      return spec;
    };
    const anySpec = () => {
      const r = T.anyRoots(state.tonic, state.scaleId).find((x) => x.semi === state.anySemi);
      return { deg: r.deg, semi: r.semi, quality: state.anyType };
    };
    const seg = (act, options, current, cls = '') =>
      `<div class="sw-seg ${cls}">${options.map(([v, label]) =>
        `<button class="${String(v) === String(current) ? 'sw-on' : ''}" data-act="${act}" data-arg="${v}">${label}</button>`).join('')}</div>`;

    // ---------- Drawing ----------
    function picker() {
      return `<button class="sw-pick" data-act="open-sheet">${state.tonic.name} ${scale().name} <span>▾</span></button>`;
    }

    function notesStrip() {
      return `<div class="sw-notes">${T.scaleNotes(state.tonic, state.scaleId).map((n) =>
        `<div class="sw-note"><b>${n.name}</b><i>${n.degree}</i></div>`).join('')}</div>`;
    }

    function card(c, extraClass = '') {
      const sel = T.sameChord(c, state.shown) ? 'sw-sel' : '';
      return `<button class="sw-card ${sel} ${extraClass}" data-act="card" data-drag="card" data-spec="${specAttr(c)}"><b>${c.symbol}</b><i>${c.numeral}</i></button>`;
    }

    function chordsSection() {
      const tabs = [['key', 'In key'], ['borrowed', 'Borrowed'], ['any', 'Any chord']];
      const swapping = state.selChip >= 0;
      const hint = swapping
        ? `<span class="sw-hint sw-gold">Tap a chord to swap it in for ${chord(state.progression[state.selChip]).symbol}</span>`
        : '<span class="sw-hint">Tap to see · drag to add</span>';
      let body;

      if (state.tab === 'key') {
        const list = T.diatonicChords(state.tonic, state.scaleId, state.size);
        const parent = scale().parent && T.getScale(scale().parent);
        body = `<div class="sw-row sw-chords-head">${hint}${seg('size', [[3, 'Triads'], [4, '7ths']], state.size, 'sw-sm')}</div>
          <div class="sw-grid ${state.size === 4 ? 'sw-3col' : ''}">${list.map((c) => card(c)).join('')}</div>
          ${parent ? `<div class="sw-footnote">Chords come from ${state.tonic.name} ${parent.name.toLowerCase()}, the full scale this one is part of.</div>` : ''}`;
      } else if (state.tab === 'borrowed') {
        const list = T.borrowedChords(state.tonic, state.scaleId, state.size);
        const from = scale().flavor === 'major' ? 'minor' : 'major';
        body = `<div class="sw-row sw-chords-head">${hint}${seg('size', [[3, 'Triads'], [4, '7ths']], state.size, 'sw-sm')}</div>
          <div class="sw-grid ${state.size === 4 ? 'sw-3col' : ''}">${list.map((c) => card(c)).join('')}</div>
          <div class="sw-footnote">From ${state.tonic.name} ${from}, plus secondary dominants (V/ii = the V of ii).</div>`;
      } else {
        const roots = T.anyRoots(state.tonic, state.scaleId);
        const result = chord(anySpec());
        body = `<div class="sw-row sw-chords-head">${hint}</div>
          <div class="sw-sub">Root</div>
          <div class="sw-roots">${roots.map((r) =>
            `<button class="${r.semi === state.anySemi ? 'sw-on' : ''}" data-act="any-root" data-arg="${r.semi}">${r.name}</button>`).join('')}</div>
          <div class="sw-sub">Type</div>
          <div class="sw-types">${T.ANY_TYPES.map((q) =>
            `<button class="${q === state.anyType ? 'sw-on' : ''}" data-act="any-type" data-arg="${q}">${T.QUALITIES[q].label}</button>`).join('')}</div>
          <button class="sw-card sw-result ${T.sameChord(result, state.shown) ? 'sw-sel' : ''}" data-act="card" data-drag="card" data-spec="${specAttr(result)}">
            <b>${result.symbol}</b><i>${result.numeral}</i><span>drag to add</span></button>`;
      }

      return `<div class="sw-label">Chords</div>
        <section class="sw-chords" data-chords>
          <div class="sw-tabs">${tabs.map(([v, label]) =>
            `<button class="sw-tab ${state.tab === v ? 'sw-on' : ''}" data-act="tab" data-arg="${v}">${label}</button>`).join('')}</div>
          ${body}
          <div class="sw-remove">Drop here to remove</div>
        </section>`;
    }

    function progressionSection(withLabel, emptyText) {
      const chips = state.progression.map((spec, i) => {
        const c = chord(spec);
        return `<button class="sw-chip ${i === state.selChip ? 'sw-sel' : ''}" data-act="chip" data-drag="chip" data-idx="${i}" data-spec="${specAttr(spec)}"><b>${c.symbol}</b><i>${c.numeral}</i></button>`;
      });
      const label = withLabel
        ? `<div class="sw-label">Progression ${chips.length ? '<button data-act="clear">Clear</button>' : ''}</div>` : '';
      return `<section data-prog>${label}<div class="sw-prog">${chips.length ? chips.join('') : `<div class="sw-empty">${emptyText}</div>`}</div></section>`;
    }

    /** How to show each note on the instrument. */
    function noteMarker(shownChord) {
      const names = {}, degrees = {}, inScale = {}, inChord = {};
      T.scaleNotes(state.tonic, state.scaleId).forEach((n) => {
        names[n.pc] = n.name; degrees[n.pc] = n.degree; inScale[n.pc] = true;
      });
      if (shownChord) {
        shownChord.notes.forEach((n) => {
          inChord[n.pc] = true;
          names[n.pc] = n.name;   // chord spelling wins (B♭ in a borrowed ♭VI, not A♯)
          if (!(n.pc in degrees)) degrees[n.pc] = T.degreeLabel(state.tonic, state.scaleId, n.pc);
        });
      }
      const rootPc = shownChord ? shownChord.root.pc : state.tonic.pc;
      return (pc) => {
        const text = state.labels === 'notes' ? names[pc] : degrees[pc];
        if (shownChord) {
          if (inChord[pc]) return { type: pc === rootPc ? 'root' : 'tone', text };
          return inScale[pc] ? { type: 'plain', text } : null;   // other scale notes: letter only, no circle
        }
        return inScale[pc] ? { type: pc === rootPc ? 'root' : 'tone', text } : null;
      };
    }

    /** Returns { svg, c4 } sized for the current layout. */
    function instrumentDrawing(mode) {
      const shown = state.shown ? chord(state.shown) : null;
      const mark = noteMarker(shown);
      const w = root.innerWidth, h = root.innerHeight;
      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      if (state.instrument === 'guitar') {
        let o = { frets: 22, fw: 44, sh: 28, openW: 34, mark };
        if (mode === 'land') {
          const avail = w - 32;
          o = { frets: 22, openW: 26, fw: (avail - 26 - 6) / 22, sh: clamp((h - 115) / 5, 20, 42), mark };
        } else if (mode === 'desk') {
          const avail = Math.min(w, 1400) - 32 - 470 - 28 - 26;
          o.fw = clamp((avail - 34 - 6) / 22, 26, 44);
        }
        return { svg: INST.fretboard(o), c4: 0 };
      }
      let o = { ww: 34, wh: 150, mark };
      if (mode === 'land') o = { ww: (w - 34) / 22, wh: clamp(h - 105, 90, 250), mark };
      else if (mode === 'desk') o.ww = clamp((Math.min(w, 1400) - 32 - 470 - 28 - 26 - 2) / 22, 26, 40);
      const p = INST.piano(o);
      return { svg: p.svg, c4: p.xOf(60) };
    }

    function instrumentToggles() {
      return seg('instrument', [['guitar', 'Guitar'], ['piano', 'Piano']], state.instrument) +
        seg('labels', [['notes', 'Notes'], ['degrees', 'Degrees']], state.labels, 'sw-sm');
    }

    function instrumentPanel(mode, drawing) {
      const shown = state.shown ? chord(state.shown) : null;
      const caption = shown
        ? `<span>Showing <b>${shown.symbol}</b> chord (${shown.numeral})</span><button data-act="show-scale">Show scale ×</button>`
        : `<span>Showing <b>${state.tonic.name} ${scale().name.toLowerCase()}</b> scale</span>`;
      const turn = mode === 'phone'
        ? `<div class="sw-turn">↻ Turn your phone sideways to see the whole ${state.instrument === 'guitar' ? 'neck' : 'keyboard'}</div>` : '';
      return `<div class="sw-label">Instrument</div>
        <div class="sw-panel">
          <div class="sw-row">${instrumentToggles()}</div>
          <div class="sw-caption">${caption}</div>
          <div class="sw-scroll">${drawing.svg}</div>
          ${turn}
        </div>`;
    }

    /** The Key & scale pop-up. Changes show right away behind it; Done or tapping outside closes it. */
    function sheet() {
      if (!state.sheet) return '';
      const choices = T.keyChoices(state.scaleId);
      const cur = choices[state.tonic.pc];
      const other = cur.alt ? (cur.alt.name === state.tonic.name ? cur.note : cur.alt) : null;
      return `<div class="sw-dimmer" data-act="close-sheet"></div>
        <div class="sw-sheet">
          <div class="sw-sheet-head" data-sheet-grab><div class="sw-grab"></div>
            <div class="sw-sheet-title">${state.tonic.name} ${scale().name}<button data-act="close-sheet">Done</button></div>
          </div>
          <div class="sw-sub">Key</div>
          <div class="sw-keys">${choices.map((k) => {
            const on = k.pc === state.tonic.pc;
            return `<button class="${on ? 'sw-on' : ''}" data-act="pick-key" data-arg="${k.pc}">${on ? state.tonic.name : k.note.name}</button>`;
          }).join('')}</div>
          ${other ? `<div class="sw-swap">${state.tonic.name} can also be spelled ${other.name} · <button data-act="swap-spelling">Swap spelling</button></div>` : ''}
          ${T.SCALE_GROUPS.map((g) => `<div class="sw-sub">${g}</div><div class="sw-scales">${T.SCALES.filter((x) => x.group === g).map((x) =>
            `<button class="${x.id === state.scaleId ? 'sw-on' : ''}" data-act="pick-scale" data-arg="${x.id}">${x.name}</button>`).join('')}</div>`).join('')}
        </div>`;
    }

    function render() {
      const mode = layout();
      const oldScroll = el.querySelector('.sw-scroll');
      const scrollLeft = oldScroll ? oldScroll.scrollLeft : 0;
      const drawing = instrumentDrawing(mode);
      let page;
      if (mode === 'land') {
        page = `<div class="sw-page">
          <div class="sw-land-top">${progressionSection(false, 'No chords yet. Turn your phone upright to build one.')}<div class="sw-picks">${instrumentToggles()}</div></div>
          <div class="sw-scroll">${drawing.svg}</div>
        </div>`;
      } else {
        page = `<div class="sw-page">
          <header class="sw-hdr"><div class="sw-brand"><div class="sw-logo">Song<b>writer</b></div><span class="sw-ver">v${APP_VERSION}</span></div>${picker()}</header>
          <div class="sw-cols">
            <div class="sw-main">${notesStrip()}${chordsSection()}${progressionSection(true, 'No chords yet.<br>Drag a chord here from above.')}</div>
            <div class="sw-side">${instrumentPanel(mode, drawing)}</div>
          </div>
        </div>`;
      }
      el.innerHTML = `<div class="sw-app sw-${mode}">${page}${sheet()}</div>`;
      lockPageScroll(!!state.sheet);

      // Keep the fretboard/keyboard scrolled where it was; start the piano at middle C.
      const sc = el.querySelector('.sw-scroll');
      if (sc) {
        if (state.instrument !== lastInstrument) sc.scrollLeft = state.instrument === 'piano' ? Math.max(0, drawing.c4 - 1) : 0;
        else sc.scrollLeft = scrollLeft;
      }
      lastInstrument = state.instrument;
    }

    // ---------- Taps ----------
    function tapChord(spec) {
      if (state.selChip >= 0) {
        state.progression[state.selChip] = spec;   // swap it into the selected spot
        state.shown = spec;
      } else {
        state.shown = T.sameChord(state.shown, spec) ? null : spec;
      }
    }

    function tapChip(i) {
      if (state.selChip === i) {
        state.selChip = -1;
        state.shown = null;
        return;
      }
      const spec = state.progression[i];
      state.selChip = i;
      state.shown = spec;
      // Select the same chord in the Chords section, on whichever tab it lives.
      const where = T.findChord(state.tonic, state.scaleId, spec);
      state.tab = where.tab;
      if (where.size) state.size = where.size;
      if (where.tab === 'any') { state.anySemi = spec.semi; state.anyType = spec.quality; }
    }

    function act(name, arg, data) {
      switch (name) {
        case 'open-sheet': state.sheet = 'pick'; break;
        case 'close-sheet': state.sheet = null; break;
        case 'pick-key': state.tonic = T.keyChoices(state.scaleId)[+arg].note; break;
        case 'swap-spelling': {
          const cur = T.keyChoices(state.scaleId)[state.tonic.pc];
          state.tonic = cur.alt.name === state.tonic.name ? cur.note : cur.alt;
          break;
        }
        case 'pick-scale':
          state.scaleId = arg;
          state.tonic = T.respellTonic(state.tonic, arg);
          break;
        case 'tab': state.tab = arg; break;
        case 'size': state.size = +arg; break;
        case 'card': tapChord(parseSpec(data.spec)); break;
        case 'any-root': state.anySemi = +arg; tapChordAny(); break;
        case 'any-type': state.anyType = arg; tapChordAny(); break;
        case 'chip': tapChip(+data.idx); break;
        case 'clear': state.progression = []; state.selChip = -1; break;
        case 'instrument': state.instrument = arg; break;
        case 'labels': state.labels = arg; break;
        case 'show-scale': state.shown = null; state.selChip = -1; break;
        default: return;
      }
      render();
    }

    // Changing the "Any chord" root or type shows it right away (and swaps it in if a chip is selected).
    function tapChordAny() {
      const spec = anySpec();
      if (state.selChip >= 0) state.progression[state.selChip] = spec;
      state.shown = spec;
    }

    el.addEventListener('click', (e) => {
      if (suppressClick) { suppressClick = false; return; }
      const target = e.target.closest('[data-act]');
      if (!target || !el.contains(target)) {
        // Tapping a blank area finishes swapping.
        if (state.selChip >= 0 && !e.target.closest('.sw-sheet')) { state.selChip = -1; render(); }
        return;
      }
      act(target.dataset.act, target.dataset.arg, target.dataset);
    });

    // ---------- Drag and drop ----------
    // Press a chord and move your finger (or mouse) to drag it. A tap without moving is a normal tap.
    el.addEventListener('pointerdown', (e) => {
      if (e.button > 0 || drag) return;
      const src = e.target.closest('[data-drag]');
      if (!src) return;
      drag = {
        kind: src.dataset.drag, src, spec: parseSpec(src.dataset.spec),
        idx: src.dataset.idx === undefined ? -1 : +src.dataset.idx,
        x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY,
        touch: e.pointerType !== 'mouse', active: false, insertAt: -1, overRemove: false
      };
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerCancel);
    });

    // Stop the page from scrolling while a chord is being dragged.
    document.addEventListener('touchmove', (e) => {
      if ((drag && drag.active) || sheetDrag) e.preventDefault();
    }, { passive: false });
    el.addEventListener('contextmenu', (e) => { if (e.target.closest('[data-drag]')) e.preventDefault(); });

    function onPointerMove(e) {
      if (!drag) return;
      drag.x = e.clientX; drag.y = e.clientY;
      if (!drag.active) {
        if (Math.hypot(drag.x - drag.x0, drag.y - drag.y0) > DRAG_START_PX) startDrag();
        return;
      }
      e.preventDefault();
      moveGhost();
      findDropTarget();
    }

    function onPointerUp() {
      if (!drag) return;
      // A plain tap: don't redraw here, or the tap would land on a button that no longer exists.
      if (!drag.active) { endDrag(); return; }
      drop();
      suppressClick = true;                              // the drag shouldn't also count as a tap
      setTimeout(() => { suppressClick = false; }, 400);
      endDrag();
      render();
    }

    function onPointerCancel() {
      if (!drag) return;
      const wasActive = drag.active;
      endDrag();
      if (wasActive) render();
    }

    function startDrag() {
      if (!drag) return;
      drag.active = true;
      const c = chord(drag.spec);
      const app = el.querySelector('.sw-app');
      drag.ghost = document.createElement('div');
      drag.ghost.className = 'sw-ghost';
      drag.ghost.innerHTML = `<b>${c.symbol}</b><i>${c.numeral}</i>`;
      app.appendChild(drag.ghost);
      app.classList.add('sw-dragging');
      drag.src.classList.add('sw-lift');
      const chordsEl = el.querySelector('[data-chords]');
      if (drag.kind === 'chip' && chordsEl) {
        chordsEl.classList.add('sw-removing');
        // The chord name keeps its case ("E♭m" must not turn into "E♭M").
        chordsEl.querySelector('.sw-remove').innerHTML = `Drop here to remove&nbsp;<span class="sw-keepcase">${c.symbol}</span>`;
      }
      if (navigator.vibrate) navigator.vibrate(10);
      moveGhost();
      findDropTarget();
      autoScroll();
    }

    function moveGhost() {
      const g = drag.ghost;
      const dx = drag.x - g.offsetWidth / 2;
      const dy = drag.touch ? drag.y - g.offsetHeight - 28 : drag.y - g.offsetHeight / 2 - 4;   // above the finger
      g.style.transform = `translate(${dx}px, ${dy}px)`;
    }

    function otherChips(progEl) {
      return [...progEl.querySelectorAll('.sw-chip')].filter((c) => c !== drag.src);
    }

    function findDropTarget() {
      el.querySelectorAll('.sw-ins').forEach((m) => m.remove());
      el.querySelectorAll('.sw-empty').forEach((m) => m.classList.remove('sw-over'));
      drag.insertAt = -1;
      drag.overRemove = false;
      const hit = document.elementFromPoint(drag.x, drag.y);
      const progEl = hit && hit.closest('[data-prog]');
      const chordsEl = el.querySelector('[data-chords]');
      if (progEl && el.contains(progEl)) {
        const chips = otherChips(progEl);
        let idx = chips.length;
        for (let k = 0; k < chips.length; k++) {
          const r = chips[k].getBoundingClientRect();
          if (drag.y < r.top || (drag.y <= r.bottom && drag.x < r.left + r.width / 2)) { idx = k; break; }
        }
        drag.insertAt = idx;
        const empty = progEl.querySelector('.sw-empty');
        if (empty) empty.classList.add('sw-over');
        else {
          const marker = document.createElement('div');
          marker.className = 'sw-ins';
          const box = progEl.querySelector('.sw-prog');
          if (idx < chips.length) box.insertBefore(marker, chips[idx]); else box.appendChild(marker);
        }
      } else if (drag.kind === 'chip' && chordsEl && hit && chordsEl.contains(hit)) {
        drag.overRemove = true;
      }
      if (chordsEl) chordsEl.classList.toggle('sw-over', drag.overRemove);
    }

    // Scroll the page when dragging near the top or bottom edge.
    function autoScroll() {
      if (!drag || !drag.active) return;
      const topEdge = 90, bottomEdge = root.innerHeight - 60;
      let dy = 0;
      if (drag.y < topEdge) dy = -(topEdge - drag.y) / 5;
      else if (drag.y > bottomEdge) dy = (drag.y - bottomEdge) / 5;
      if (dy) { root.scrollBy(0, dy); findDropTarget(); }
      drag.raf = requestAnimationFrame(autoScroll);
    }

    function drop() {
      const p = state.progression;
      if (drag.kind === 'card') {
        if (drag.insertAt < 0) return;
        p.splice(drag.insertAt, 0, drag.spec);
        if (state.selChip >= drag.insertAt) state.selChip++;
        return;
      }
      const i = drag.idx;
      if (drag.insertAt >= 0) {                          // reorder
        const [moved] = p.splice(i, 1);
        p.splice(drag.insertAt, 0, moved);
        state.selChip = state.selChip === i ? drag.insertAt : -1;
      } else if (drag.overRemove) {                      // dragged back to Chords: remove it
        p.splice(i, 1);
        if (state.selChip === i) { state.selChip = -1; state.shown = null; }
        else if (state.selChip > i) state.selChip--;
      }
    }

    function endDrag() {
      if (!drag) return;
      cancelAnimationFrame(drag.raf);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerCancel);
      drag = null;
    }

    // ---------- Key & scale pop-up: swipe down to close, page behind stays still ----------
    let sheetDrag = null;
    let lockedScrollY = null;

    // While the pop-up is open, pin the page so swiping on the pop-up can't scroll it.
    function lockPageScroll(lock) {
      const body = document.body;
      if (lock && lockedScrollY === null) {
        lockedScrollY = root.scrollY;
        Object.assign(body.style, { position: 'fixed', top: `-${lockedScrollY}px`, left: '0', right: '0' });
      } else if (!lock && lockedScrollY !== null) {
        Object.assign(body.style, { position: '', top: '', left: '', right: '' });
        root.scrollTo(0, lockedScrollY);
        lockedScrollY = null;
      }
    }

    el.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('[data-sheet-grab]')) return;
      const sheetEl = el.querySelector('.sw-sheet');
      sheetDrag = { y0: e.clientY, t0: Date.now(), dy: 0, sheetEl, dimEl: el.querySelector('.sw-dimmer') };
      sheetEl.style.transition = 'none';
    });
    document.addEventListener('pointermove', (e) => {
      if (!sheetDrag) return;
      sheetDrag.dy = Math.max(0, e.clientY - sheetDrag.y0);   // only follows the finger downward
      sheetDrag.sheetEl.style.transform = `translateY(${sheetDrag.dy}px)`;
      sheetDrag.dimEl.style.opacity = String(Math.max(0, 1 - sheetDrag.dy / 400));
    });
    function endSheetDrag() {
      if (!sheetDrag) return;
      const { dy, t0, sheetEl, dimEl } = sheetDrag;
      sheetDrag = null;
      const fast = dy > 30 && dy / Math.max(1, Date.now() - t0) > 0.5;   // a quick flick also closes it
      sheetEl.style.transition = 'transform 0.18s ease-out';
      dimEl.style.transition = 'opacity 0.18s ease-out';
      if (dy > 90 || fast) {
        sheetEl.style.transform = 'translateY(100%)';
        dimEl.style.opacity = '0';
        suppressClick = true;
        setTimeout(() => { suppressClick = false; state.sheet = null; render(); }, 180);
      } else {
        sheetEl.style.transform = '';
        dimEl.style.opacity = '';
      }
    }
    document.addEventListener('pointerup', endSheetDrag);
    document.addEventListener('pointercancel', endSheetDrag);

    // ---------- Start ----------
    let resizeTimer;
    root.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(render, 120); });
    landMq.addEventListener('change', render);
    deskMq.addEventListener('change', render);
    render();
    return {
      state,
      render,
      /** Save what's on screen so it comes back after the page refreshes itself. */
      saveSnapshot() {
        try { root.sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(state)); } catch (e) { /* private mode: fine */ }
      },
      /** True while a chord is being dragged (don't refresh mid-drag). */
      isBusy: () => !!(drag && drag.active)
    };
  }

  function restoreSnapshot(state) {
    try {
      const snap = JSON.parse(root.sessionStorage.getItem(SNAPSHOT_KEY));
      root.sessionStorage.removeItem(SNAPSHOT_KEY);
      if (!snap) return;
      T.getScale(snap.scaleId);   // throws if the saved scale no longer exists
      Object.assign(state, snap, { tonic: T.note(snap.tonic.letter, snap.tonic.acc), sheet: null });
    } catch (e) { /* nothing saved, or it's from an older version: start fresh */ }
  }

  SW.app = { mount };
})(window);
