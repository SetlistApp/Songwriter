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

   Also here: the offline thesaurus (thesaurus.js, from WordNet: synonyms and antonyms grouped by
   meaning) and ranking the extra online words from Datamuse (the screen does the asking). */
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
  // Vowels that sound alike when sung count as one beyond Perfect: "cot"/"caught" (AA/AO), "ih"/"ee"
  // (thing/mean: "-ing" is usually sung "-een"), and "oo" as in good/food (UH/UW).
  var CLOSE = { AO: 'AA', IY: 'IH', UW: 'UH' };
  var nearVowel = function (v) { return CLOSE[v] || v; };
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
    return found.map(function (r) { return { word: r.word, syllables: r.syllables, type: r.type }; });
  }

  // ---------- Lyric lines: syllables and rhyme letters ----------
  /** The words of a lyric line, as typed ("Engine running, couldn't stop" → Engine, running, couldn't, stop). */
  function lineWords(line) { return (String(line).match(/[A-Za-z‘’'][A-Za-z‘’'-]*/g) || []).filter(function (w) { return /[a-z]/i.test(w); }); }

  /** Syllables in a line (words the list doesn't know are guessed from spelling). */
  function lineSyllables(dict, line) {
    return lineWords(line).reduce(function (n, w) {
      return n + w.split('-').reduce(function (m, part) { return m + (part ? syllables(dict, part) : 0); }, 0);
    }, 0);
  }

  /** A user's own rhyme choice for two words in a section: true (rhyme), false (don't), undefined (let the dictionary decide). */
  function linkOf(links, a, b) {
    var hit = (links || []).filter(function (l) { return (l.a === a && l.b === b) || (l.a === b && l.b === a); })[0];
    return hit ? hit.on : undefined;
  }
  var LEVEL = { perfect: 0, linked: 0, family: 1, vowel: 2 };

  /** How two line-ending words rhyme for the editor's letters: 'perfect' | 'linked' | 'family' | 'vowel' | null. */
  function lineRhyme(dict, a, b, links) {
    if (a === b) return 'perfect';
    var l = linkOf(links, a, b);
    if (l === true) return 'linked';
    if (l === false) return null;
    return rhymeType(dict, a, b);
  }

  /** Rhyme letters for a section's lines (A, B, C… by first appearance). Line endings that rhyme
      share a letter; kind says how closely: perfect or linked (solid), family (dashed), vowel (dotted).
      links = the section's own choices [{ a, b, on }] (words you linked or unlinked yourself).
      Blank lines get no letter; neither does a line whose ending rhymes with nothing.
      Returns { lines: [{ letter, kind, near, word, end, syllables }], scheme: "ABAB" }. */
  function rhymeScheme(dict, lines, links) {
    var groups = [];   // { letter, words: [] }
    var out = lines.map(function (line) {
      var words = lineWords(line), last = words.length ? clean(words[words.length - 1]) : '';
      var info = { letter: '', kind: '', near: false, word: words.length ? words[words.length - 1] : '', end: last, syllables: lineSyllables(dict, line) };
      if (!last) return info;
      // Join the group this ending rhymes with most closely (a word you linked counts as perfect).
      var best = null;
      groups.forEach(function (g) {
        var kind = null;
        g.words.forEach(function (other) {
          var t = lineRhyme(dict, last, other, links);
          if (t && (!kind || LEVEL[t] < LEVEL[kind])) kind = t;
        });
        if (kind && (!best || LEVEL[kind] < LEVEL[best.kind])) best = { g: g, kind: kind };
      });
      if (best) { best.g.words.push(last); info.letter = best.g.letter; info.kind = best.kind; return info; }
      var letter = String.fromCharCode(65 + (groups.length % 26));
      groups.push({ letter: letter, words: [last] });
      info.letter = letter; info.kind = 'perfect';   // the first line of a group
      return info;
    });
    // A letter only means something if at least two lines share it.
    var count = {};
    out.forEach(function (l) { if (l.letter) count[l.letter] = (count[l.letter] || 0) + 1; });
    out.forEach(function (l) { if (l.letter && count[l.letter] < 2) { l.letter = ''; l.kind = ''; } });
    // Re-letter in order of appearance so the scheme reads ABAB, not ACAC.
    var map = {}, next = 0;
    out.forEach(function (l) {
      if (l.letter) { if (!map[l.letter]) map[l.letter] = String.fromCharCode(65 + next++ % 26); l.letter = map[l.letter]; }
      l.near = l.kind === 'family' || l.kind === 'vowel';
    });
    var scheme = out.filter(function (l, i) { return lines[i].trim(); }).map(function (l) { return l.letter || '·'; }).join('');
    return { lines: out, scheme: /[A-Z]/.test(scheme) ? scheme : '' };
  }

  // ---------- Synonyms & antonyms (Datamuse) ----------
  // Datamuse lists every meaning of a word in no useful order ("point" and "period" for stop,
  // from "full stop"). These sort its answers so the likely ones come first: words that are
  // true synonyms, closely related, common, and used the same way (a verb for a verb).
  // Each list item is Datamuse's { word, tags } (asked with md=fp: frequency + part of speech).
  var RARE = 0.3;   // per million words; rarer ones (kibosh) still show, but after all the others
  var freqOf = function (x) {
    var f = (x.tags || []).filter(function (t) { return t.indexOf('f:') === 0; })[0];
    return f ? +f.slice(2) : 0;
  };
  var posOf = function (x) { return (x.tags || []).filter(function (t) { return /^(n|v|adj|adv)$/.test(t); })[0] || null; };
  var popularity = function (f) { return Math.min(1, Math.log10(f + 1) / 2.5); };   // 0 rare … 1 very common
  var usable = function (word) { return function (x) { return x.word !== word && /^[a-z' -]+$/.test(x.word); }; };
  var rarePenalty = function (x) { return freqOf(x) < RARE ? 10 : 0; };   // sinks rare words below every common one

  /** Synonyms, best first. me = Datamuse's own entry for the word (for its part of speech),
      syns = rel_syn answers, related = ml ("means like") answers in Datamuse's order.
      maxCommon (optional) limits the common words; rare ones always follow, all of them. */
  function rankSynonyms(word, me, syns, related, maxCommon) {
    var myPos = me && me.word === word ? posOf(me) : null;
    var strict = {}, all = {};
    syns.forEach(function (x) { strict[x.word] = true; });
    related.forEach(function (x, i) { all[x.word] = { x: x, rel: Math.pow(1 - i / related.length, 2) }; });
    syns.forEach(function (x) { if (!all[x.word]) all[x.word] = { x: x, rel: 0.3 }; });
    return Object.keys(all).map(function (k) { return all[k]; }).filter(function (o) { return usable(word)(o.x); })
      .map(function (o) {
        var score = 0.45 * o.rel + 0.3 * popularity(freqOf(o.x)) + (strict[o.x.word] ? 0.25 : 0) + (myPos && posOf(o.x) === myPos ? 0.2 : 0) - rarePenalty(o.x);
        return { word: o.x.word, score: score, rare: !!rarePenalty(o.x) };
      })
      .sort(function (a, b) { return b.score - a.score; })
      .filter(function (o, i) { return o.rare || !maxCommon || i < maxCommon; })
      .map(function (o) { return o.word; });
  }

  /** Antonyms, best first: Datamuse's order counts a little, how common the word is counts more. */
  function rankAntonyms(word, ants) {
    return ants.map(function (x, i) { return { x: x, score: 0.25 * (1 - i / ants.length) + 0.75 * popularity(freqOf(x)) - rarePenalty(x) }; })
      .filter(function (o) { return usable(word)(o.x); })
      .sort(function (a, b) { return b.score - a.score; })
      .map(function (o) { return o.x.word; });
  }

  // ---------- Offline thesaurus (thesaurus.js) ----------
  /** Turns SW.THESAURUS into something fast to look up. Meanings are unpacked when first asked for. */
  function loadThesaurus(th) {
    var words = th.words.split('|'), heads = Object.create(null), forms = Object.create(null);
    var id = function (s) { return parseInt(s, 36); };
    th.heads.split('|').forEach(function (h) {
      var p = h.split(':');
      // Each meaning: "number" or "number.usage count" (base 36)
      heads[words[id(p[0])]] = p[1].split(',').map(function (m) { var x = m.split('.'); return { sense: id(x[0]), used: x[1] ? id(x[1]) : 0 }; });
    });
    th.forms.split('|').forEach(function (f) {
      var p = f.split('>');
      if (p[1]) forms[p[0]] = words[id(p[1])];
    });
    var vulgar = Object.create(null);
    (th.vulgar || '').split('|').concat(SWEARS).forEach(function (w) { if (w) vulgar[w] = true; });
    return { words: words, senses: th.senses.split('\n'), heads: heads, forms: forms, vulgar: vulgar };
  }

  // Backstop for words from outside WordNet's labels (Datamuse extras): core swear words and slurs.
  var SWEARS = ['fuck', 'fucking', 'fucked', 'fucker', 'motherfucker', 'shit', 'shitty', 'bullshit', 'cunt', 'twat',
    'bitch', 'bitches', 'asshole', 'dick', 'dickhead', 'cock', 'pussy', 'whore', 'slut', 'bastard', 'piss',
    'pissed', 'damn', 'goddamn', 'nigger', 'nigga', 'fag', 'faggot', 'dyke', 'retard', 'skank', 'wanker', 'bollocks'];

  /** True if a word is vulgar wherever it shows up (it's then hidden unless the search itself is vulgar). */
  function isVulgar(th, w) { return !!th.vulgar[w]; }

  /** The plain form of what was typed, if the thesaurus has it: "stopped" → stop, "running" → run,
      "went" → go. Returns the word itself if it's already plain, null if unknown. */
  function baseWord(th, word, has) {
    has = has || function (x) { return !!th.heads[x]; };
    var w = clean(word);
    if (th.forms[w]) return th.forms[w];
    var rules = [['ies', 'y'], ['ied', 'y'], ['ier', 'y'], ['iest', 'y'], ['es', ''], ['s', ''], ['ed', ''], ['ed', 'e'],
      ['ing', ''], ['ing', 'e'], ['er', ''], ['er', 'e'], ['est', ''], ['est', 'e'], ["in'", ''], ["in'", 'e']];
    for (var i = 0; i < rules.length; i++) {
      var end = rules[i][0];
      if (w.length <= end.length + 1 || w.slice(-end.length) !== end) continue;
      var stem = w.slice(0, -end.length);
      if (has(stem + rules[i][1])) return stem + rules[i][1];
      // stopped → stop, running → run
      if (stem.length > 2 && stem[stem.length - 1] === stem[stem.length - 2] && has(stem.slice(0, -1))) return stem.slice(0, -1);
    }
    return has(w) ? w : null;
  }

  // ---------- Definitions (definitions.js) ----------
  function loadDefinitions(d) {
    var words = Object.create(null);
    d.words.split('|').forEach(function (e) {
      var p = e.split(':');
      words[p[0]] = p[1].split(',').map(function (x) { return parseInt(x, 36); });
    });
    return { texts: d.texts.split('\n'), words: words };
  }

  /** A word's definitions, most used meaning first: [{ word, pos, def, example }].
      "running" gives its own and then run's (word forms come from the thesaurus). null if unknown. */
  function definitions(defs, th, word) {
    var typed = clean(word), has = function (x) { return !!defs.words[x]; };
    var base = baseWord(th, word, has), owners = [];
    if (has(typed)) owners.push(typed);
    if (base && base !== typed) owners.push(base);
    if (!owners.length) return null;
    var name = { n: 'noun', v: 'verb', a: 'adjective', r: 'adverb' }, out = [];
    owners.forEach(function (o) {
      defs.words[o].forEach(function (i) {
        var parts = defs.texts[i].split('\t');
        out.push({ word: o, pos: name[parts[0][0]], def: parts[0].slice(1), example: parts[1] || '' });
      });
    });
    return out;
  }

  /** How common a word is, for sorting: its place in the word list (0 = most common).
      A phrase counts as its rarest word, a bit lower; words not in the list (rare) come last. */
  function commonRank(dict, w) {
    if (w in dict.index) return dict.index[w];
    var parts = w.split(' ');
    if (parts.length > 1 && parts.every(function (p) { return p in dict.index; })) {
      return 1.5 * Math.max.apply(null, parts.map(function (p) { return dict.index[p]; }));
    }
    return Infinity;
  }
  function byCommon(dict, list) {
    return list.map(function (w, i) { return { w: w, r: commonRank(dict, w), i: i }; })
      .sort(function (a, b) { return a.r - b.r || a.i - b.i; })
      .map(function (o) { return o.w; });
  }

  /** How everyday a word is, 0 (rare) … 1 (most common). A phrase counts as its rarest word, a bit less. */
  function commonness(dict, w) {
    var n = dict.words.length;
    if (w in dict.index) return 1 - dict.index[w] / n;
    var parts = w.split(' ');
    if (parts.length > 1 && parts.every(function (p) { return p in dict.index; })) {
      return 0.7 * (1 - Math.max.apply(null, parts.map(function (p) { return dict.index[p]; })) / n);
    }
    return 0;
  }

  /** Which of four bands a word sorts into: 0 everyday single word, 1 everyday phrase, 2 rare single, 3 rare phrase. */
  function band(dict, w) { return (commonness(dict, w) > 0 ? 0 : 2) + (w.indexOf(' ') >= 0 ? 1 : 0); }

  /** Every word from every meaning in one list, best first, each word once: single words before
      phrases, everyday words before rare ones; inside each band, words from often-used meanings that
      are most common come first ("stop": halt, block, break, quit, cease…).
      Words that are vulgar in every meaning they came from go to hidden (unless showVulgar).
      Returns { words: [{ word, band }], hidden: [word] }. */
  function bestOf(th, dict, groups, key, showVulgar) {
    var score = {}, order = [], vulgarOnly = {};
    groups.forEach(function (g) {
      g[key].forEach(function (w) {
        var vul = th.vulgar[w] || (key === 'synonyms' && (g.vulgarAll || g.vulgarWords[w]));
        if (vul && !showVulgar) { if (!(w in score)) vulgarOnly[w] = true; return; }
        if (!(w in score)) { score[w] = 0; order.push(w); delete vulgarOnly[w]; }
        var c = commonness(dict, w);
        score[w] += Math.log2(g.used + 2) * c * c;
      });
    });
    var words = order.map(function (w, i) { return { word: w, band: band(dict, w), s: score[w], i: i }; })
      .sort(function (a, b) { return a.band - b.band || b.s - a.s || a.i - b.i; })
      .map(function (o) { return { word: o.word, band: o.band }; });
    return { words: words, hidden: Object.keys(vulgarOnly) };
  }

  /** A word's meanings, most useful first:
      { base, vulgarSearch, best: { synonyms, antonyms }, groups: [{ word, pos, gloss, used, synonyms, antonyms }] }.
      best = all of them in one list, best first (see bestOf). vulgarSearch = the word itself is
      vulgar in all its meanings ("fuck"), so nothing is hidden; "love" or "screw" aren't.
      "running" gives its own meanings ("running water") and then run's. Inside each group, common
      words come first, then phrases, then rare words. null if the thesaurus doesn't know it. */
  function meanings(th, dict, word) {
    var typed = clean(word), base = baseWord(th, word);
    var owners = [];
    if (th.heads[typed]) owners.push(typed);
    if (base && base !== typed) owners.push(base);
    if (!owners.length) return null;
    var name = { n: 'noun', v: 'verb', a: 'adjective', r: 'adverb' };
    var list = function (s) { return s ? s.split(',').map(function (x) { return th.words[parseInt(x, 36)]; }) : []; };
    var groups = [];
    owners.forEach(function (owner) {
      th.heads[owner].forEach(function (m) {
        var parts = th.senses[m.sense].split('\t'), vulgarWords = {};
        list(parts[3] === '*' ? '' : parts[3]).forEach(function (w) { vulgarWords[w] = true; });
        groups.push({
          word: owner, pos: name[parts[0][0]], gloss: parts[0].slice(1), used: m.used,
          vulgarAll: parts[3] === '*', vulgarWords: vulgarWords,
          selfVulgar: parts[3] === '*' || !!vulgarWords[owner] || !!th.vulgar[owner],
          synonyms: byCommon(dict, list(parts[1]).filter(function (w) { return w !== owner && w !== typed; })),
          antonyms: byCommon(dict, list(parts[2]))
        });
      });
    });
    var vulgarSearch = !!th.vulgar[typed] || groups.every(function (g) { return g.selfVulgar; });
    return {
      base: base || typed, vulgarSearch: vulgarSearch, groups: groups,
      best: { synonyms: bestOf(th, dict, groups, 'synonyms', vulgarSearch), antonyms: bestOf(th, dict, groups, 'antonyms', vulgarSearch) }
    };
  }

  SW.rhymes = {
    CODE: CODE, SYMBOLS: SYMBOLS, TYPES: TYPES, STRICTNESS: STRICTNESS, FAMILY: FAMILY,
    encode: encode, decode: decode, tail: tail, compareTails: compareTails,
    load: load, clean: clean, find: find, syllables: syllables, rhymeType: rhymeType, rhymes: rhymes,
    rankSynonyms: rankSynonyms, rankAntonyms: rankAntonyms,
    lineWords: lineWords, lineSyllables: lineSyllables, rhymeScheme: rhymeScheme, lineRhyme: lineRhyme,
    loadThesaurus: loadThesaurus, baseWord: baseWord, loadDefinitions: loadDefinitions, definitions: definitions, meanings: meanings, isVulgar: isVulgar, band: band
  };
})(typeof window !== 'undefined' ? window : globalThis);
