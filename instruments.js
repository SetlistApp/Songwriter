/* Songwriter: draws the guitar fretboard and piano keyboard as SVG text.
   No music rules here: the caller passes mark(pc, midi), which says how to show each note:
     { type: 'root' | 'tone' | 'plain', text: 'F♯' }  or  null (don't show it). */
(function (root) {
  var SW = root.SW = root.SW || {};

  var GUITAR_STRINGS = [64, 59, 55, 50, 45, 40];   // high e on top (like tab) → low E
  var GUITAR_NAMES = ['E', 'B', 'G', 'D', 'A', 'E'];
  var INLAYS = [3, 5, 7, 9, 15, 17, 19, 21];
  var BLACK = { 1: 1, 3: 1, 6: 1, 8: 1, 10: 1 };

  function circle(cx, cy, r, m) {
    return '<circle class="sw-dot-' + m.type + '" cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>' +
      '<text class="sw-dot-txt" x="' + cx + '" y="' + (cy + 3.6) + '">' + m.text + '</text>';
  }
  function plain(cx, cy, bgClass) {
    return function (m) {
      return (bgClass ? '<rect class="' + bgClass + '" x="' + (cx - 8) + '" y="' + (cy - 6) + '" width="16" height="12"/>' : '') +
        '<text class="sw-plain-txt" x="' + cx + '" y="' + (cy + 3.8) + '">' + m.text + '</text>';
    };
  }

  /** o: { frets: 22, fw: fret width, sh: string gap, openW: open-string column width, mark } */
  function fretboard(o) {
    var frets = o.frets || 22, fw = o.fw || 44, sh = o.sh || 28, openW = o.openW || 34;
    var top = 18, boardH = sh * 5, H = top + boardH + 22, W = openW + frets * fw + 6;
    var s = '<svg class="sw-fretboard" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">';
    s += '<rect class="sw-fb-wood" x="' + openW + '" y="' + (top - 8) + '" width="' + frets * fw + '" height="' + (boardH + 16) + '" rx="3"/>';
    INLAYS.forEach(function (f) {
      if (f <= frets) s += '<circle class="sw-fb-inlay" cx="' + (openW + (f - 0.5) * fw) + '" cy="' + (top + boardH / 2) + '" r="5"/>';
    });
    if (frets >= 12) {
      var x12 = openW + 11.5 * fw;
      s += '<circle class="sw-fb-inlay" cx="' + x12 + '" cy="' + (top + sh * 1.5) + '" r="5"/><circle class="sw-fb-inlay" cx="' + x12 + '" cy="' + (top + sh * 3.5) + '" r="5"/>';
    }
    for (var f = 0; f <= frets; f++) {
      var x = openW + f * fw;
      s += '<line class="' + (f ? 'sw-fb-fret' : 'sw-fb-nut') + '" x1="' + x + '" y1="' + (top - 8) + '" x2="' + x + '" y2="' + (top + boardH + 8) + '"/>';
      if (f > 0) s += '<text class="sw-fb-num" x="' + (openW + (f - 0.5) * fw) + '" y="' + (H - 2) + '">' + f + '</text>';
    }
    GUITAR_STRINGS.forEach(function (open, i) {
      var y = top + i * sh;
      s += '<line class="sw-fb-string" x1="' + openW + '" y1="' + y + '" x2="' + (openW + frets * fw) + '" y2="' + y + '" style="stroke-width:' + (1 + i * 0.35) + '"/>';
    });
    GUITAR_STRINGS.forEach(function (open, i) {
      var y = top + i * sh;
      for (var f = 0; f <= frets; f++) {
        var midi = open + f, cx = f === 0 ? openW / 2 - 2 : openW + (f - 0.5) * fw;
        var m = o.mark(midi % 12, midi);
        if (!m && f === 0) m = { type: 'string', text: GUITAR_NAMES[i] };
        if (!m) continue;
        if (m.type === 'plain' || m.type === 'string') s += plain(cx, y, f === 0 ? 'sw-plain-bg-open' : 'sw-plain-bg')(m);
        else s += circle(cx, y, 11, m);
      }
    });
    return s + '</svg>';
  }

  /** o: { start: 48 (C3), end: 84 (C6), ww: white-key width, wh: white-key height, mark }.
      Returns { svg, xOf(midi) } so the caller can scroll to a key. */
  function piano(o) {
    var start = o.start || 48, end = o.end || 84, ww = o.ww || 34, wh = o.wh || 150;
    var whites = [], blacks = [], xOf = {};
    for (var m = start; m <= end; m++) (BLACK[m % 12] ? blacks : whites).push(m);
    var W = whites.length * ww + 2, H = wh + 20, bw = ww * 0.6, bh = wh * 0.62;
    var s = '<svg class="sw-piano" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">';
    whites.forEach(function (m, i) {
      xOf[m] = i * ww + 1;
      s += '<rect class="sw-key-white" x="' + xOf[m] + '" y="1" width="' + (ww - 1.5) + '" height="' + wh + '" rx="3"/>';
      // Octave labels go under the keyboard so they don't look like highlighted notes.
      if (m % 12 === 0) s += '<text class="sw-key-octave" x="' + (xOf[m] + ww / 2) + '" y="' + (wh + 15) + '">C' + (Math.floor(m / 12) - 1) + '</text>';
    });
    blacks.forEach(function (m) {
      xOf[m] = xOf[m - 1] + ww - bw / 2;
      s += '<rect class="sw-key-black" x="' + xOf[m] + '" y="1" width="' + bw + '" height="' + bh + '" rx="2"/>';
    });
    for (var k = start; k <= end; k++) {
      var mk = o.mark(k % 12, k);
      if (!mk) continue;
      var black = !!BLACK[k % 12];
      var cx = black ? xOf[k] + bw / 2 : xOf[k] + ww / 2 - 0.75, cy = black ? bh - 14 : wh - 28;
      if (mk.type === 'plain') s += '<text class="sw-plain-txt ' + (black ? '' : 'sw-on-white') + '" x="' + cx + '" y="' + (cy + 3.6) + '">' + mk.text + '</text>';
      else s += circle(cx, cy, Math.min(black ? bw * 0.42 : ww * 0.36, 13), { type: mk.type + (black ? '' : ' sw-on-white'), text: mk.text });
    }
    return { svg: s + '</svg>', xOf: function (midi) { return xOf[midi]; } };
  }

  SW.instruments = { fretboard: fretboard, piano: piano };
})(typeof window !== 'undefined' ? window : globalThis);
