/* Songwriter: rhymes and syllables.
   Pure functions only (no screen code), like theory.js, so they can be tested and reused.

   How it works: every word in the word list (words.js) is written as its sounds, from the
   CMU Pronouncing Dictionary. "stop" is S T AA1 P: consonants, plus vowels with a stress
   number (1 = the loud syllable, 2 = a bit loud, 0 = quiet).

   A word's rhyme part (its "tail") is everything from its last loud vowel to the end:
   stop → AA P, golden → OW L D AH N. Two words rhyme by comparing tails:
     perfect  the tails are the same                         stop / top
     family   same vowels; each consonant is a close cousin  stop / lot (P and T are both "stop" sounds)
     vowel    just the vowels match                          stop / mob
     loose    same consonants with a different vowel         stop / step
   (One side adding a sound at the end, star / start, lands under vowel.)
   Strictness 0-3 (Perfect, Family, Vowel, Loose) lists that kind and every closer kind. */
(function (root) {
  var SW = root.SW = root.SW || {};

  var CONSONANTS = ['B', 'CH', 'D', 'DH', 'F', 'G', 'HH', 'JH', 'K', 'L', 'M', 'N', 'NG', 'P', 'R', 'S', 'SH', 'T', 'TH', 'V', 'W', 'Y', 'Z', 'ZH'];
  var VOWELS = ['AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'EH', 'ER', 'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW'];
  var SYMBOLS = CONSONANTS.concat([].concat.apply([], VOWELS.map(function (v) { return [v + '0', v + '1', v + '2']; })));
  // One character per sound, so the word list stays small. Index matches SYMBOLS.
  var CODE = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&*+';

  // Consonant families: sounds made the same way, which most ears hear as near rhymes.
  var FAMILY = {
    P: 'stop', T: 'stop', K: 'stop',                     // p t k
    B: 'vstop', D: 'vstop', G: 'vstop',                  // b d g
    M: 'hum', N: 'hum', NG: 'hum',                       // m n ng
    F: 'hiss', TH: 'hiss', S: 'hiss', SH: 'hiss', CH: 'hiss',   // f th s sh ch
    V: 'buzz', DH: 'buzz', Z: 'buzz', ZH: 'buzz', JH: 'buzz'    // v th("the") z zh j
  };
  var TYPES = ['perfect', 'family', 'vowel', 'loose'];
  var STRICTNESS = ['Perfect', 'Family', 'Vowel', 'Loose'];
  var MAX_PER_TYPE = 60;   // the most common 60 of each kind is plenty to scan on a phone

  var isVowel = function (p) { return /\d$/.test(p); };

  /** CMU sounds → one-character code (used by build-words.js). */
  function encode(phones) {
    return phones.map(function (p) {
      var i = SYMBOLS.indexOf(p);
      if (i < 0) throw new Error('Unknown sound ' + p);
      return CODE[i];
    }).join('');
  }
  function decode(code) {
    var out = [];
    for (var i = 0; i < code.length; i++) out.push(SYMBOLS[CODE.indexOf(code[i])]);
    return out;
  }

  /** Where the rhyme starts: the last loud (1) vowel, else the last a-bit-loud (2) one, else the last vowel. */
  function tailStart(phones) {
    var last1 = -1, last2 = -1, lastV = -1;
    phones.forEach(function (p, i) {
      if (!isVowel(p)) return;
      lastV = i;
      if (p[p.length - 1] === '1') last1 = i;
      if (p[p.length - 1] === '2') last2 = i;
    });
    return last1 >= 0 ? last1 : last2 >= 0 ? last2 : Math.max(lastV, 0);
  }

  /** The rhyme part, ready to compare. Quiet "uh" and "ih" sound alike, so they count as one sound. */
  function tail(phones) {
    return phones.slice(tailStart(phones)).map(function (p, i) {
      if (!isVowel(p)) return p;
      var v = p.slice(0, -1);
      if (i > 0 && p[p.length - 1] === '0' && (v === 'AH' || v === 'IH')) return 'UH0';   // quiet "uh"
      return v;
    });
  }

  // "cot" and "caught" sound the same to most American ears, so AA and AO match beyond Perfect.
  var looseVowel = function (v) { return v === 'AO' ? 'AA' : v; };
  var sameFamily = function (a, b) { return a === b || (FAMILY[a] && FAMILY[a] === FAMILY[b]); };

  /** How two tails rhyme: 0 perfect, 1 family, 2 vowel, 3 loose, or -1 not at all. */
  function compareTails(a, b) {
    var i;
    if (a.join() === b.join()) return 0;
    var va = a.filter(isVowelToken).map(looseVowel), vb = b.filter(isVowelToken).map(looseVowel);
    var sameVowels = va.join() === vb.join();
    if (sameVowels && a.length === b.length) {
      for (i = 0; i < a.length; i++) {
        if (isVowelToken(a[i]) !== isVowelToken(b[i])) break;
        if (isVowelToken(a[i]) ? looseVowel(a[i]) !== looseVowel(b[i]) : !sameFamily(a[i], b[i])) break;
      }
      if (i === a.length) return 1;
    }
    if (sameVowels) return 2;
    // Loose: same consonants (or cousins) with different vowels.
    if (va.length === vb.length) {
      var ca = a.filter(notVowelToken), cb = b.filter(notVowelToken);
      if (ca.length && ca.length === cb.length && ca.every(function (c, k) { return sameFamily(c, cb[k]); }) &&
          a.map(isVowelToken).join() === b.map(isVowelToken).join()) return 3;
    }
    return -1;
  }
  function isVowelToken(t) { return VOWELS.indexOf(t) >= 0 || t === 'UH0'; }
  function notVowelToken(t) { return !isVowelToken(t); }

  /** Turns the word list text (SW.WORDS) into something fast to search. */
  function load(text) {
    var words = [], phones = [], tails = [], index = Object.create(null);
    text.split('|').forEach(function (entry, i) {
      var sp = entry.indexOf(' ');
      var w = entry.slice(0, sp), ph = decode(entry.slice(sp + 1));
      words.push(w); phones.push(ph); tails.push(tail(ph));
      index[w] = i;
    });
    return { words: words, phones: phones, tails: tails, index: index };
  }

  /** Lower case, straight apostrophes, no punctuation around it ("Stop!" → "stop"). */
  function clean(word) {
    var w = String(word || '').toLowerCase().replace(/[‘’`]/g, "'").replace(/^[^a-z']+|[^a-z']+$/g, '').replace(/^'+/, '');
    return /in'$/.test(w) ? w : w.replace(/'+$/, '');   // keep the apostrophe in "runnin'"
  }

  /** Word list lookup that also understands "runnin'" (= running). */
  function find(dict, word) {
    var w = clean(word);
    if (w in dict.index) return dict.index[w];
    if (/in'$/.test(w) && (w.slice(0, -1) + 'g') in dict.index) return dict.index[w.slice(0, -1) + 'g'];
    return -1;
  }

  /** Syllables in a word. Words the list doesn't know are guessed from their spelling. */
  function syllables(dict, word) {
    var i = find(dict, word);
    if (i >= 0) return dict.phones[i].filter(isVowel).length;
    var w = clean(word).replace(/'/g, '');
    if (!w) return 0;
    var groups = (w.match(/[aeiouy]+/g) || []).length;
    if (/[^aeiouyl]e$/.test(w) && groups > 1) groups--;   // silent e ("stone"), but not "table"
    return Math.max(1, groups);
  }

  /** How two words rhyme: 'perfect' | 'family' | 'vowel' | 'loose' | null (unknown word or no rhyme). */
  function rhymeType(dict, a, b) {
    var i = find(dict, a), j = find(dict, b);
    if (i < 0 || j < 0) return null;
    var t = compareTails(dict.tails[i], dict.tails[j]);
    return t < 0 ? null : TYPES[t];
  }

  /** Rhymes for a word, closest first and then most common first.
      Returns null if the word isn't in the list; otherwise [{ word, syllables, type }]. */
  function rhymes(dict, word, strictness) {
    var i = find(dict, word);
    if (i < 0) return null;
    var mine = dict.tails[i], self = dict.words[i], found = [];
    for (var j = 0; j < dict.words.length; j++) {
      if (j === i) continue;
      var t = compareTails(mine, dict.tails[j]);
      if (t < 0 || t > strictness) continue;
      // A loose match that's just the word plus "s" (stops) isn't worth listing.
      var w = dict.words[j];
      if (t === 3 && (w === self + 's' || self === w + 's')) continue;
      found.push({ word: w, syllables: dict.phones[j].filter(isVowel).length, type: TYPES[t], t: t, rank: j });
    }
    found.sort(function (x, y) { return x.t - y.t || x.rank - y.rank; });
    var perType = [0, 0, 0, 0];
    return found.filter(function (r) { return ++perType[r.t] <= MAX_PER_TYPE; }).map(function (r) { return { word: r.word, syllables: r.syllables, type: r.type }; });
  }

  SW.rhymes = {
    CODE: CODE, SYMBOLS: SYMBOLS, TYPES: TYPES, STRICTNESS: STRICTNESS, FAMILY: FAMILY,
    encode: encode, decode: decode, tail: tail, compareTails: compareTails,
    load: load, clean: clean, find: find, syllables: syllables, rhymeType: rhymeType, rhymes: rhymes
  };
})(typeof window !== 'undefined' ? window : globalThis);
