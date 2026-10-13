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
   (One side adding a sound at the end, star / start, lands under vowel.)
   Strictness 0-2 (Perfect, Family, Vowel) lists that kind and every closer kind.

   Also here: ranking synonyms and antonyms from Datamuse (the screen does the asking). */
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
  var TYPES = ['perfect', 'family', 'vowel'];
  var STRICTNESS = ['Perfect', 'Family', 'Vowel'];
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
  var nearVowel = function (v) { return v === 'AO' ? 'AA' : v; };
  var sameFamily = function (a, b) { return a === b || (FAMILY[a] && FAMILY[a] === FAMILY[b]); };

  /** How two tails rhyme: 0 perfect, 1 family, 2 vowel, or -1 not at all. */
  function compareTails(a, b) {
    var i;
    if (a.join() === b.join()) return 0;
    var va = a.filter(isVowelToken).map(nearVowel), vb = b.filter(isVowelToken).map(nearVowel);
    var sameVowels = va.join() === vb.join();
    if (sameVowels && a.length === b.length) {
      for (i = 0; i < a.length; i++) {
        if (isVowelToken(a[i]) !== isVowelToken(b[i])) break;
        if (isVowelToken(a[i]) ? nearVowel(a[i]) !== nearVowel(b[i]) : !sameFamily(a[i], b[i])) break;
      }
      if (i === a.length) return 1;
    }
    if (sameVowels) return 2;
    return -1;
  }
  function isVowelToken(t) { return VOWELS.indexOf(t) >= 0 || t === 'UH0'; }

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

  /** How two words rhyme: 'perfect' | 'family' | 'vowel' | null (unknown word or no rhyme). */
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
    var mine = dict.tails[i], found = [];
    for (var j = 0; j < dict.words.length; j++) {
      if (j === i) continue;
      var t = compareTails(mine, dict.tails[j]);
      if (t < 0 || t > strictness) continue;
      var w = dict.words[j];
      found.push({ word: w, syllables: dict.phones[j].filter(isVowel).length, type: TYPES[t], t: t, rank: j });
    }
    found.sort(function (x, y) { return x.t - y.t || x.rank - y.rank; });
    var perType = [0, 0, 0];
    return found.filter(function (r) { return ++perType[r.t] <= MAX_PER_TYPE; }).map(function (r) { return { word: r.word, syllables: r.syllables, type: r.type }; });
  }

  // ---------- Synonyms & antonyms (Datamuse) ----------
  // Datamuse lists every meaning of a word in no useful order ("point" and "period" for stop,
  // from "full stop"). These sort its answers so the likely ones come first: words that are
  // true synonyms, closely related, common, and used the same way (a verb for a verb).
  // Each list item is Datamuse's { word, tags } (asked with md=fp: frequency + part of speech).
  var MIN_FREQ = 0.3;   // per million words; rarer ones (kibosh) are left out
  var freqOf = function (x) {
    var f = (x.tags || []).filter(function (t) { return t.indexOf('f:') === 0; })[0];
    return f ? +f.slice(2) : 0;
  };
  var posOf = function (x) { return (x.tags || []).filter(function (t) { return /^(n|v|adj|adv)$/.test(t); })[0] || null; };
  var popularity = function (f) { return Math.min(1, Math.log10(f + 1) / 2.5); };   // 0 rare … 1 very common
  var usable = function (word) { return function (x) { return x.word !== word && /^[a-z'-]+$/.test(x.word) && freqOf(x) >= MIN_FREQ; }; };

  /** Synonyms, best first. me = Datamuse's own entry for the word (for its part of speech),
      syns = rel_syn answers, related = ml ("means like") answers in Datamuse's order. */
  function rankSynonyms(word, me, syns, related) {
    var myPos = me && me.word === word ? posOf(me) : null;
    var strict = {}, all = {};
    syns.forEach(function (x) { strict[x.word] = true; });
    related.forEach(function (x, i) { all[x.word] = { x: x, rel: Math.pow(1 - i / related.length, 2) }; });
    syns.forEach(function (x) { if (!all[x.word]) all[x.word] = { x: x, rel: 0.3 }; });
    return Object.keys(all).map(function (k) { return all[k]; }).filter(function (o) { return usable(word)(o.x); })
      .map(function (o) {
        var score = 0.45 * o.rel + 0.3 * popularity(freqOf(o.x)) + (strict[o.x.word] ? 0.25 : 0) + (myPos && posOf(o.x) === myPos ? 0.2 : 0);
        return { word: o.x.word, score: score };
      })
      .sort(function (a, b) { return b.score - a.score; })
      .map(function (o) { return o.word; });
  }

  /** Antonyms, best first: Datamuse's order counts a little, how common the word is counts more. */
  function rankAntonyms(word, ants) {
    return ants.map(function (x, i) { return { x: x, score: 0.25 * (1 - i / ants.length) + 0.75 * popularity(freqOf(x)) }; })
      .filter(function (o) { return usable(word)(o.x); })
      .sort(function (a, b) { return b.score - a.score; })
      .map(function (o) { return o.x.word; });
  }

  SW.rhymes = {
    CODE: CODE, SYMBOLS: SYMBOLS, TYPES: TYPES, STRICTNESS: STRICTNESS, FAMILY: FAMILY,
    encode: encode, decode: decode, tail: tail, compareTails: compareTails,
    load: load, clean: clean, find: find, syllables: syllables, rhymeType: rhymeType, rhymes: rhymes,
    rankSynonyms: rankSynonyms, rankAntonyms: rankAntonyms
  };
})(typeof window !== 'undefined' ? window : globalThis);
