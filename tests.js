/* Songwriter: checks that theory.js and rhymes.js give the right answers.
   Open tests.html to see the results (or run: node tests.js). */
(function (root) {
  var SW = root.SW = root.SW || {};

  SW.runTests = function () {
    var T = SW.theory;
    var results = [];
    var N = T.parseNote;

    function check(name, got, want) {
      var ok = JSON.stringify(got) === JSON.stringify(want);
      results.push({ name: name, ok: ok, got: got, want: want });
    }
    function names(list) { return list.map(function (n) { return n.name; }).join(' '); }
    function symbols(list) { return list.map(function (c) { return c.symbol; }).join(' '); }
    function numerals(list) { return list.map(function (c) { return c.numeral; }).join(' '); }
    function keyNames(scaleId) { return T.keyChoices(scaleId).map(function (k) { return k.note.name; }).join(' '); }

    // --- Key buttons ---
    check('Major key names', keyNames('major'), 'C D♭ D E♭ E F F♯ G A♭ A B♭ B');
    check('Minor key names', keyNames('minor'), 'C C♯ D E♭ E F F♯ G G♯ A B♭ B');
    check('F♯ major can be spelled G♭', T.keyChoices('major')[6].alt.name, 'G♭');
    check('C major has no other spelling', T.keyChoices('major')[0].alt, null);
    check('Keeps G♭ when switching to Lydian', T.respellTonic(N('G♭'), 'lydian').name, 'G♭');
    check('Respells D♭ for minor', T.respellTonic(N('D♭'), 'minor').name, 'C♯');

    // --- Every key and scale is spelled correctly ---
    T.SCALES.forEach(function (scale) {
      T.keyChoices(scale.id).forEach(function (k) {
        [k.note].concat(k.alt ? [k.alt] : []).forEach(function (tonic) {
          var notes = T.scaleNotes(tonic, scale.id);
          var pcsOk = notes.every(function (n, i) { return n.pc === (tonic.pc + scale.steps[i]) % 12; });
          var letters = notes.map(function (n) { return n.letter; });
          var lettersOk = scale.letters ? true : letters.slice().sort().join() === '0,1,2,3,4,5,6';
          var noDoubles = scale.id === 'harmonicMinor' || notes.every(function (n) { return Math.abs(n.acc) < 2; });
          if (!(pcsOk && lettersOk && noDoubles)) check(tonic.name + ' ' + scale.name + ' spelled right', names(notes), 'each letter once, right notes');
        });
      });
    });
    check('All keys × all scales spelled right (no failures above)', true, true);

    // --- Scale spellings ---
    check('F major', names(T.scaleNotes(N('F'), 'major')), 'F G A B♭ C D E');
    check('D major', names(T.scaleNotes(N('D'), 'major')), 'D E F♯ G A B C♯');
    check('E♭ major', names(T.scaleNotes(N('E♭'), 'major')), 'E♭ F G A♭ B♭ C D');
    check('F♯ major', names(T.scaleNotes(N('F♯'), 'major')), 'F♯ G♯ A♯ B C♯ D♯ E♯');
    check('A harmonic minor', names(T.scaleNotes(N('A'), 'harmonicMinor')), 'A B C D E F G♯');
    check('G♯ harmonic minor (double sharp)', names(T.scaleNotes(N('G♯'), 'harmonicMinor')), 'G♯ A♯ B C♯ D♯ E F𝄪');
    check('A blues', names(T.scaleNotes(N('A'), 'blues')), 'A C D E♭ E G');
    check('E♭ blues (blue note written as A)', names(T.scaleNotes(N('E♭'), 'blues')), 'E♭ G♭ A♭ A B♭ D♭');
    check('A minor pentatonic', names(T.scaleNotes(N('A'), 'minorPentatonic')), 'A C D E G');
    check('C major pentatonic', names(T.scaleNotes(N('C'), 'majorPentatonic')), 'C D E G A');
    check('D Dorian degrees', T.scaleNotes(N('D'), 'dorian').map(function (n) { return n.degree; }).join(' '), '1 2 ♭3 4 5 6 ♭7');
    check('A blues degrees', T.scaleNotes(N('A'), 'blues').map(function (n) { return n.degree; }).join(' '), '1 ♭3 4 ♭5 5 ♭7');

    // --- Chords in a key ---
    var cTri = T.diatonicChords(N('C'), 'major', 3), cSev = T.diatonicChords(N('C'), 'major', 4);
    check('C major triads', symbols(cTri), 'C Dm Em F G Am B°');
    check('C major numerals', numerals(cTri), 'I ii iii IV V vi vii°');
    check('C major 7ths', symbols(cSev), 'Cmaj7 Dm7 Em7 Fmaj7 G7 Am7 Bm7♭5');
    check('C major 7th numerals', numerals(cSev), 'Imaj7 ii7 iii7 IVmaj7 V7 vi7 viiø7');
    check('D major triads', symbols(T.diatonicChords(N('D'), 'major', 3)), 'D Em F♯m G A Bm C♯°');
    check('D Dorian chords', symbols(T.diatonicChords(N('D'), 'dorian', 3)), 'Dm Em F G Am B° C');
    check('D Dorian numerals', numerals(T.diatonicChords(N('D'), 'dorian', 3)), 'i ii ♭III IV v vi° ♭VII');
    check('A natural minor numerals', numerals(T.diatonicChords(N('A'), 'minor', 3)), 'i ii° ♭III iv v ♭VI ♭VII');
    check('A harmonic minor triads', symbols(T.diatonicChords(N('A'), 'harmonicMinor', 3)), 'Am B° C+ Dm E F G♯°');
    check('A harmonic minor numerals', numerals(T.diatonicChords(N('A'), 'harmonicMinor', 3)), 'i ii° ♭III+ iv V ♭VI vii°');
    check('A harmonic minor 7ths', symbols(T.diatonicChords(N('A'), 'harmonicMinor', 4)), 'Am(maj7) Bm7♭5 Cmaj7♯5 Dm7 E7 Fmaj7 G♯°7');
    check('Major pentatonic uses major chords', symbols(T.diatonicChords(N('C'), 'majorPentatonic', 3)), 'C Dm Em F G Am B°');
    check('Blues uses natural-minor chords', symbols(T.diatonicChords(N('A'), 'blues', 3)), 'Am B° C Dm Em F G');

    // --- Chord notes ---
    function chordNotes(tonic, spec) { return names(T.buildChord(N(tonic), spec).notes); }
    check('B♭ chord notes', chordNotes('B♭', { deg: 0, semi: 0, quality: 'maj' }), 'B♭ D F');
    check('F♯° chord notes', chordNotes('F♯', { deg: 0, semi: 0, quality: 'dim' }), 'F♯ A C');
    check('G♯°7 chord notes', chordNotes('G♯', { deg: 0, semi: 0, quality: 'dim7' }), 'G♯ B D F');
    check('C major chord as MIDI', T.chordMidi(cTri[0], 4), [60, 64, 67]);

    // --- Borrowed chords (+ secondary dominants) ---
    function borrowed(tonic, scaleId, size) { return T.borrowedChords(N(tonic), scaleId, size); }
    check('Borrowed in C major', symbols(borrowed('C', 'major', 3)), 'Fm E♭ A♭ B♭ D° Gm A B D E');
    check('Borrowed numerals in C major', numerals(borrowed('C', 'major', 3)), 'iv ♭III ♭VI ♭VII ii° v V/ii V/iii V/V V/vi');
    check('Borrowed 7ths in C major', symbols(borrowed('C', 'major', 4)), 'Fm7 E♭maj7 A♭maj7 B♭7 Dm7♭5 Gm7 A7 B7 C7 D7 E7');
    check('Borrowed 7th numerals in C major', numerals(borrowed('C', 'major', 4)), 'iv7 ♭IIImaj7 ♭VImaj7 ♭VII7 iiø7 v7 V7/ii V7/iii V7/IV V7/V V7/vi');
    check('Borrowed in D major', symbols(borrowed('D', 'major', 3)), 'Gm F B♭ C E° Am B C♯ E F♯');
    check('Borrowed in A minor', symbols(borrowed('A', 'minor', 3)), 'D E A B');
    check('Borrowed 7ths in A minor', symbols(borrowed('A', 'minor', 4)), 'D7 E7 Amaj7 A7 B7 C7');
    check('Borrowed in D Dorian (IV already in key)', symbols(borrowed('D', 'dorian', 3)), 'A D B E');
    check('Borrowed in A harmonic minor (V already in key)', symbols(borrowed('A', 'harmonicMinor', 3)), 'D A B C');
    check('Borrowed in G Mixolydian (♭VII and v already in key)', symbols(borrowed('G', 'mixolydian', 3)), 'Cm B♭ E♭ A° E A B');
    check('Secondary dominant keeps its name in a new key', T.buildChord(N('G'), { deg: 5, semi: 9, quality: 'dom7', of: 'ii' }).symbol + ' ' + T.buildChord(N('G'), { deg: 5, semi: 9, quality: 'dom7', of: 'ii' }).numeral, 'E7 V7/ii');

    // --- Progressions change key ---
    var prog = [cTri[0], cTri[4], cTri[5], cTri[3]].map(function (c) { return { deg: c.deg, semi: c.semi, quality: c.quality }; });
    function inKey(tonic) { return prog.map(function (s) { return T.buildChord(N(tonic), s).symbol; }).join(' '); }
    check('I V vi IV in C', inKey('C'), 'C G Am F');
    check('I V vi IV in G', inKey('G'), 'G D Em C');
    check('I V vi IV in E♭', inKey('E♭'), 'E♭ B♭ Cm A♭');

    // --- Any chord ---
    check('Any-chord roots in D major', T.anyRoots(N('D'), 'major').map(function (r) { return r.name; }).join(' '), 'C C♯ D E♭ E F F♯ G A♭ A B♭ B');
    var eb = T.anyRoots(N('D'), 'major').filter(function (r) { return r.name === 'E♭'; })[0];
    var ebMaj7 = T.buildChord(N('D'), { deg: eb.deg, semi: eb.semi, quality: 'maj7' });
    check('E♭maj7 in D', ebMaj7.symbol + ' ' + ebMaj7.numeral + ' ' + names(ebMaj7.notes), 'E♭maj7 ♭IImaj7 E♭ G B♭ D');

    // --- Which tab a chord lives in ---
    check('Bm is in key (triads) in D', T.findChord(N('D'), 'major', { deg: 5, semi: 9, quality: 'min' }), { tab: 'key', size: 3 });
    check('Bm7 is in key (7ths) in D', T.findChord(N('D'), 'major', { deg: 5, semi: 9, quality: 'min7' }), { tab: 'key', size: 4 });
    check('C is borrowed in D', T.findChord(N('D'), 'major', { deg: 6, semi: 10, quality: 'maj' }), { tab: 'borrowed', size: 3 });
    check('A7 (V7/ii) is borrowed (7ths) in C', T.findChord(N('C'), 'major', { deg: 5, semi: 9, quality: 'dom7' }), { tab: 'borrowed', size: 4 });
    check('E♭maj7 is "any chord" in D', T.findChord(N('D'), 'major', { deg: 1, semi: 1, quality: 'maj7' }), { tab: 'any' });

    // --- Degree labels for notes outside the scale ---
    check('B♭ in D major is ♭6', T.degreeLabel(N('D'), 'major', 10), '♭6');
    check('E♭ in A blues is ♭5', T.degreeLabel(N('A'), 'blues', 3), '♭5');

    // --- Chord tones (1, 3, 5, 7) ---
    function tones(tonic, sp) { return T.buildChord(N(tonic), sp).tones.join(' '); }
    check('Chord tones of Cmaj7', tones('C', { deg: 0, semi: 0, quality: 'maj7' }), '1 3 5 7');
    check('Chord tones of Am7', tones('C', { deg: 5, semi: 9, quality: 'min7' }), '1 ♭3 5 ♭7');
    check('Chord tones of B°', tones('C', { deg: 6, semi: 11, quality: 'dim' }), '1 ♭3 ♭5');
    check('Chord tones of Gsus4', tones('C', { deg: 4, semi: 7, quality: 'sus4' }), '1 4 5');

    // --- Voice leading ---
    var C = N('C');
    var spec = function (deg, semi, quality) { return { deg: deg, semi: semi, quality: quality }; };
    var CGAmF = [spec(0, 0, 'maj'), spec(4, 7, 'maj'), spec(5, 9, 'min'), spec(3, 5, 'maj')];
    var three = { notes: 3, inversions: true };
    var cVoicings = T.chordVoicings(T.buildChord(C, CGAmF[0]), three).map(function (v) { return v.join(' '); });
    check('C triad voicings include C4 E4 G4 and its inversions', ['60 64 67', '64 67 72', '55 60 64'].every(function (k) { return cVoicings.indexOf(k) >= 0; }), true);
    check('Half-steps from C4 E4 G4 to B3 D4 G4', T.voiceMove([60, 64, 67], [59, 62, 67]), 3);
    var smooth = T.smoothestVoicing(C, CGAmF, three);
    check('C G Am F: smoothest total', T.pathTotal(smooth), 9);
    check('C G Am F: shared notes stay put (G in C → G, C in Am → F)', [smooth[1].indexOf(67) >= 0 && smooth[0].indexOf(67) >= 0, smooth[2].indexOf(60) >= 0 && smooth[3].indexOf(60) >= 0], [true, true]);
    check('C G Am F with inversions off: total (open voicings help)', T.pathTotal(T.smoothestVoicing(C, CGAmF, { notes: 3, inversions: false })), 27);
    check('Inversions off: root is always lowest', T.smoothestVoicing(C, CGAmF, { notes: 3, inversions: false }).map(function (v) { return v[0] % 12; }), [0, 7, 9, 5]);
    var locked = T.smoothestVoicing(C, CGAmF, three, { 2: [72] });
    check('Locking C5 on Am keeps it', locked[2].indexOf(72) >= 0, true);
    var groups = T.voicingGroups(C, CGAmF, three, null, 3);
    check('Groups: 3 groups, smoothest first, totals rising', groups.length === 3 && groups[0].total === 9 && groups[0].total < groups[1].total && groups[1].total < groups[2].total, true);
    check('Groups: the smoothest group lists all 3 ways', groups[0].paths.length, 3);
    check('Groups: every path in a group has that total', groups.every(function (g) { return g.paths.every(function (p) { return T.pathTotal(p) === g.total; }); }), true);
    var opts = T.chordVoicingOptions(C, CGAmF, smooth, 1, three);
    check('One-chord options sorted least to most', opts.every(function (o, i) { return !i || opts[i - 1].total <= o.total; }), true);
    check('One-chord options: smoothest is the current one', opts[0].voicing.join(), smooth[1].join());
    var c4 = T.chordVoicings(T.buildChord(C, CGAmF[0]), { notes: 4 }).map(function (v) { return v.join(' '); });
    check('4 notes: a triad with a doubled note (C4 E4 G4 C5)', c4.indexOf('60 64 67 72') >= 0, true);
    check('4 notes: smoothest C G Am F has 4 notes per chord', T.smoothestVoicing(C, CGAmF, { notes: 4 }).every(function (v) { return v.length === 4; }), true);
    var g7 = T.chordVoicings(T.buildChord(C, spec(4, 7, 'dom7')), three)[0].map(function (m) { return m % 12; }).sort(function (a, b) { return a - b; });
    check('3 notes of G7 leave out the 5th (G B F)', g7, [5, 7, 11]);
    check('Voicings span at most a 10th', CGAmF.every(function (sp) { return T.chordVoicings(T.buildChord(C, sp), three).every(function (v) { return v[v.length - 1] - v[0] <= 16; }); }), true);
    check('Open voicings are allowed (C4 G4 E5)', T.chordVoicings(T.buildChord(C, CGAmF[0]), three).some(function (v) { return v.join() === '60,67,76'; }), true);
    check('Ties go to close voicings: smoothest C G Am F is all close', T.smoothestVoicing(C, CGAmF, three).every(function (v) { return v[v.length - 1] - v[0] <= 12; }), true);

    // --- Rhymes and syllables (rhymes.js + words.js) ---
    var R = SW.rhymes, D = R.load(SW.WORDS);
    var words = function (list) { return list.map(function (r) { return r.word; }); };
    check('Sound code round-trips', R.decode(R.encode(['S', 'T', 'AA1', 'P'])), ['S', 'T', 'AA1', 'P']);
    check('Every sound has its own code letter', R.CODE.length === R.SYMBOLS.length && new Set(R.CODE).size === R.CODE.length, true);
    check('Word list has 35,000 words, most common first', [D.words.length, D.words[0]], [35000, 'you']);
    check('Rhyme part starts at the loud vowel (golden → OW L D uh N)', R.tail(['G', 'OW1', 'L', 'D', 'AH0', 'N']), ['OW', 'L', 'D', 'UH0', 'N']);
    check('stop / top: perfect', R.rhymeType(D, 'stop', 'top'), 'perfect');
    check('stop / lot: family (P and T are both stop sounds)', R.rhymeType(D, 'stop', 'lot'), 'family');
    check('time / line: family (M and N hum)', R.rhymeType(D, 'time', 'line'), 'family');
    check('stop / mob: vowel', R.rhymeType(D, 'stop', 'mob'), 'vowel');
    check('stop / step: no rhyme (Loose was removed)', R.rhymeType(D, 'stop', 'step'), null);
    check('row / road: family (open vowel + a soft sound)', R.rhymeType(D, 'row', 'road'), 'family');
    check('stop / tree: no rhyme', R.rhymeType(D, 'stop', 'tree'), null);
    check('stop / talk: AA and AO count as one vowel beyond Perfect', R.rhymeType(D, 'stop', 'talk'), 'family');
    check('Alternate pronunciations: live rhymes with give and five; read with bed and need', [R.rhymeType(D, 'live', 'give'), R.rhymeType(D, 'live', 'five'), R.rhymeType(D, 'read', 'bed'), R.rhymeType(D, 'read', 'need')], ['perfect', 'perfect', 'perfect', 'perfect']);
    check('golden / holding: family (quiet vowels match, N and NG hum)', R.rhymeType(D, 'golden', 'holding'), 'family');
    var perfect = R.rhymes(D, 'stop', 0), family = R.rhymes(D, 'stop', 1), loose = R.rhymes(D, 'stop', 2);
    check('Perfect rhymes for stop start with top, drop', words(perfect).slice(0, 2), ['top', 'drop']);
    check('Perfect only lists perfect rhymes', perfect.every(function (r) { return r.type === 'perfect'; }), true);
    check('Family adds lot', words(family).indexOf('lot') >= 0 && words(perfect).indexOf('lot') < 0, true);
    check('Each step only adds rhymes', perfect.length < family.length && family.length < loose.length, true);
    check('Most usable first: common "lot" (family) before obscure "plop" (perfect)', words(family).indexOf('lot') < words(family).indexOf('plop'), true);
    check('Most usable first: names (scott) after real words (shot, rock)', words(family).indexOf('scott') > Math.max(words(family).indexOf('shot'), words(family).indexOf('rock')), true);
    check('Names are marked in the word list (george), everyday words aren\'t (something)', [D.real[D.index.george], D.real[D.index.something]], [false, true]);
    check('The word itself is left out', words(loose).indexOf('stop') < 0, true);
    check('Results know their syllables (nonstop = 2)', perfect.filter(function (r) { return r.word === 'nonstop'; })[0].syllables, 2);
    check('Unknown word: no rhymes (null)', R.rhymes(D, 'skrrtzz', 2), null);
    check('Three strictness steps: Perfect, Family, Vowel', R.STRICTNESS, ['Perfect', 'Family', 'Vowel']);
    check('Lookups ignore case and punctuation ("Stop!")', R.rhymeType(D, 'Stop!', '“top,”'), 'perfect');
    check('Curly apostrophes work (couldn’t)', R.find(D, 'couldn’t') >= 0, true);
    check('Contractions are in the list', ['don\'t', 'i\'m', 'you\'re', 'it\'s', 'ain\'t'].every(function (w) { return R.find(D, w) >= 0; }), true);
    check("runnin' is looked up as running", R.syllables(D, "runnin'"), 2);
    check('Syllables from the list', ['every', 'orange', 'golden', 'a'].map(function (w) { return R.syllables(D, w); }), [3, 2, 2, 1]);
    // --- Synonyms & antonyms ranking (sample Datamuse answers for "stop", trimmed) ---
    var dm = function (word, f, pos) { return { word: word, tags: (pos ? [pos] : []).concat(['f:' + f]) }; };
    var stopMe = { word: 'stop', tags: ['v', 'n'] };
    var stopSyns = [dm('break', 45.6, 'v'), dm('point', 274.9, 'n'), dm('period', 187.8, 'n'), dm('cease', 9.1, 'v'),
      dm('kibosh', 0.02, 'n'), dm('quit', 8.4, 'v'), dm('give up', 18.6, 'v'), dm('halt', 6.3, 'n')];
    var stopRelated = [dm('stoppage', 0.7, 'n'), dm('cease', 9.1, 'v'), dm('kibosh', 0.02, 'n'), dm('quit', 8.4, 'v'),
      dm('halt', 6.3, 'n'), dm('pause', 20.1, 'v'), dm('point', 274.9, 'n'), dm('end', 160.2, 'v'), dm('diaphragm', 4.5, 'n')];
    var syn = R.rankSynonyms('stop', stopMe, stopSyns, stopRelated);
    check('Synonyms: rare words kept, but last (kibosh)', syn[syn.length - 1], 'kibosh');
    check('Synonyms: a limit trims common words, never rare ones', R.rankSynonyms('stop', stopMe, stopSyns, stopRelated, 2), syn.slice(0, 2).concat(['kibosh']));
    check('Online synonyms: phrases kept (give up)', syn.indexOf('give up') >= 0, true);
    check('Synonyms: close verbs come before other meanings (cease before point)', syn.indexOf('cease') < syn.indexOf('point'), true);
    check('Synonyms: related words are included too (end)', syn.indexOf('end') >= 0, true);
    var ant = R.rankAntonyms('stop', [dm('preserve', 14.5), dm('start', 79.1), dm('carry on', 8.6), dm('continue', 63.3), dm('continuant', 0.1), dm('go', 300)]);
    check('Antonyms: common ones first, rare ones last (continuant)', ant, ['go', 'start', 'continue', 'preserve', 'carry on', 'continuant']);
    // --- Offline thesaurus (thesaurus.js, from WordNet) ---
    var TH = R.loadThesaurus(SW.THESAURUS);
    var stopM = R.meanings(TH, D, 'stop');
    var withEnd = stopM.groups.filter(function (g) { return g.synonyms.indexOf('end') >= 0; })[0];
    check('Thesaurus: stop has a meaning with end, finish, cease', !!withEnd && ['finish', 'cease'].every(function (w) { return withEnd.synonyms.indexOf(w) >= 0; }), true);
    check('Thesaurus: that meaning is a verb with begin as its opposite', withEnd && [withEnd.pos, withEnd.antonyms.indexOf('begin') >= 0], ['verb', true]);
    var punct = stopM.groups.findIndex(function (g) { return /punctuation/.test(g.gloss); });
    check('Thesaurus: everyday meanings come before "punctuation mark"', punct < 0 || stopM.groups.indexOf(withEnd) < punct, true);
    check('Thesaurus: go\'s first meaning is move / travel (its main use, verb, leads)', ['move', 'travel'].every(function (w) { return R.meanings(TH, D, 'go').groups[0].synonyms.indexOf(w) >= 0; }), true);
    check('Thesaurus: phrases are included (give up)', stopM.groups.some(function (g) { return g.synonyms.indexOf('give up') >= 0; }), true);
    check('Thesaurus: the word itself is left out of its synonyms', stopM.groups.every(function (g) { return g.synonyms.indexOf('stop') < 0; }), true);
    var rareAfterCommon = function (list) { var seenRare = false; return list.every(function (w) { var rare = !w.split(' ').every(function (part) { return part in D.index; }); if (!rare && seenRare) return false; seenRare = seenRare || rare; return true; }); };
    check('Thesaurus: in every group, rare words come after common ones', ['stop', 'cold', 'happy', 'run', 'light'].every(function (w) { return R.meanings(TH, D, w).groups.every(function (g) { return rareAfterCommon(g.synonyms); }); }), true);
    check('Thesaurus: word forms find their base (went → go, happier → happy, stopped → stop)', ['went', 'happier', 'stopped', "lovin'"].map(function (w) { return R.baseWord(TH, w); }), ['go', 'happy', 'stop', 'love']);
    check('Thesaurus: "running" shows its own meanings, then run\'s', (function (m) { return [m.groups[0].word, m.groups[m.groups.length - 1].word]; })(R.meanings(TH, D, 'running')), ['running', 'run']);
    check('Thesaurus: happy ↔ unhappy', R.meanings(TH, D, 'happy').groups[0].antonyms.indexOf('unhappy') >= 0, true);
    check('Thesaurus: unknown word gives null', R.meanings(TH, D, 'skrrt'), null);
    var best = stopM.best.synonyms.words.map(function (x) { return x.word; });
    check('One list: stop\'s top 15 include halt, quit, cease, end', ['halt', 'quit', 'cease', 'end'].every(function (w) { var i = best.indexOf(w); return i >= 0 && i < 15; }), true);
    check('One list: each word once', best.length === new Set(best).size, true);
    check('One list: rare words last (kibosh after end)', best.indexOf('kibosh') > best.indexOf('end'), true);
    check('One list: antonyms for stop start with start', stopM.best.antonyms.words[0].word, 'start');
    var firstPhrase = best.findIndex(function (w) { return w.indexOf(' ') >= 0; });
    check('One list: everyday single words come before any phrase', best.slice(firstPhrase).every(function (w) { return w.indexOf(' ') >= 0 || !(w in D.index); }), true);
    var loveM = R.meanings(TH, D, 'love'), loveWords = loveM.best.synonyms.words.map(function (x) { return x.word; });
    check('Vulgar: hidden from love\'s list (fuck, screw), kept aside', [loveWords.indexOf('fuck'), loveWords.indexOf('screw'), loveM.best.synonyms.hidden.indexOf('fuck') >= 0], [-1, -1, true]);
    check('Vulgar: love\'s normal words stay (enjoy, passion, darling)', ['enjoy', 'passion', 'darling'].every(function (w) { return loveWords.indexOf(w) >= 0; }), true);
    check('Vulgar: stop hides nothing', stopM.best.synonyms.hidden, []);
    check('Vulgar: a vulgar search shows everything', (function (m) { return [m.vulgarSearch, m.best.synonyms.hidden.length]; })(R.meanings(TH, D, 'fuck')), [true, 0]);
    check('Vulgar: swear words are known even outside WordNet labels', [R.isVulgar(TH, 'shit'), R.isVulgar(TH, 'stop')], [true, false]);
    // --- Lyric lines: syllables & rhyme letters ---
    var verse = ['Small town, one road, one parking lot', 'Ten years of waiting at the light', 'Engine running, couldn’t stop', 'Maybe I’ll be gone tonight'];
    var vs = R.rhymeScheme(D, verse);
    check('Lines: syllables per line (8 8 7 7)', vs.lines.map(function (l) { return l.syllables; }), [8, 8, 7, 7]);
    check('Lines: lot / stop share a letter as a near (family) rhyme → ABAB', [vs.scheme, vs.lines[2].near, vs.lines[3].near], ['ABAB', true, false]);
    check('Lines: a letter needs two lines (AA·, not AAB)', R.rhymeScheme(D, ['I saw the light', 'it felt so right', 'and then the rain']).scheme, 'AA·');
    check('Lines: blank lines are skipped in the scheme', R.rhymeScheme(D, ['the night', '', 'so bright']).scheme, 'AA');
    check('Lines: same last word counts as a rhyme', R.rhymeScheme(D, ['I love you', 'I need you']).scheme, 'AA');
    check('"ih"/"ee" only blur before m, n, ng: live / leave, live / please, his / he\'s don\'t rhyme', [R.rhymeType(D, 'live', 'leave'), R.rhymeType(D, 'live', 'please'), R.rhymeType(D, 'his', "he's")], [null, null, null]);
    check('…but him / team (before m) and fear / here (before r) still do', [R.rhymeType(D, 'him', 'team'), R.rhymeType(D, 'fear', 'here')], ['family', 'perfect']);
    check('Close vowels: thing / mean, sing / seen, good / food are near (family) rhymes', [R.rhymeType(D, 'thing', 'mean'), R.rhymeType(D, 'sing', 'seen'), R.rhymeType(D, 'good', 'food')], ['family', 'family', 'family']);
    check('Open endings + a soft sound are family: day / rain, me / seen, go / home', [R.rhymeType(D, 'day', 'rain'), R.rhymeType(D, 'me', 'seen'), R.rhymeType(D, 'go', 'home')], ['family', 'family', 'family']);
    check('…but a hard sound stays a vowel rhyme (day / date)', R.rhymeType(D, 'day', 'date'), 'vowel');
    check('…with the exact vowel only: me / in is not family (close vowel + added sound is too loose)', R.rhymeType(D, 'me', 'in') === 'family', false);
    check('Family list for "me" now has words (seen, need)', ['seen', 'need'].every(function (w) { return R.rhymes(D, 'me', 1).some(function (r) { return r.word === w && r.type === 'family'; }); }), true);
    check('Close vowels: Perfect stays exact (thing / sing perfect, thing / mean not)', [R.rhymeType(D, 'thing', 'sing'), R.rhymes(D, 'thing', 0).some(function (r) { return r.word === 'mean'; })], ['perfect', false]);
    var ks = R.rhymeScheme(D, ['my heart', 'a star', 'one thing', 'so mean']);
    check('Lines: vowel rhymes get a letter too (heart / star dotted, thing / mean dashed)', [ks.scheme, ks.lines[1].kind, ks.lines[3].kind], ['AABB', 'vowel', 'family']);
    var chorusL = ['its those things that you tell me', 'without saying a thing', 'just that look that you give me', 'and I know what you mean'];
    check('Lines: each line pairs with its best rhyme (me/me + thing/mean = ABAB, not AAAA)', R.rhymeScheme(D, chorusL).scheme, 'ABAB');
    check('Lines: letters you pick are kept (mean = C, thing = C)', R.rhymeScheme(D, chorusL, { mean: 'C', thing: 'C' }).scheme, 'ACAC');
    check('Lines: picking the same letter rhymes any two endings', R.rhymeScheme(D, ['say skrrt', 'we fly'], { skrrt: 'A', fly: 'A' }).lines.map(function (l) { return l.kind; }), ['picked', 'picked']);
    check('Lines: "-" means no letter, even if the dictionary found a rhyme', R.rhymeScheme(D, ['one thing', 'so mean'], { mean: '-' }).scheme, '');
    check('Lines: automatic letters skip ones you picked (B picked → auto group is A, then C)', R.rhymeScheme(D, ['the night', 'so bright', 'my fear', 'is here', 'what you mean'], { mean: 'B' }).scheme, 'AACCB');
    var ul = function (lines, picked) { var s = R.rhymeScheme(D, lines, picked); return s.lines.map(function (l, i) { return l.underline.map(function (u) { return lines[i].slice(u.start, u.end) + ':' + u.letter; }).join('+'); }); };
    check('Multi-syllable: broken / hopin\' rhyme (near)', R.rhymeScheme(D, ['I keep it broken', 'still I keep on hopin’']).lines.map(function (l) { return l.letter + l.kind; }), ['Afamily', 'Afamily']);
    check('Multi-syllable: "hold it" / "golden" underline both words of "hold it"', ul(['you told me hold it', 'the days were golden']), ['hold it:A', 'golden:A']);
    check('Multi-syllable: tell me / sell me underline the whole ending', ul(['you tell me', 'you sell me']), ['tell me:A', 'sell me:A']);
    check('Multi-syllable: tell me / give me still rhyme on "me" (one word)', ul(['you tell me', 'you give me']), ['me:A', 'me:A']);
    check('Inner rhymes: words you letter mid-line get underlined', ul(['the fire in my eyes', 'a liar in disguise'], { fire: 'C', liar: 'C' }), ['fire:C+eyes:A', 'liar:C+disguise:A']);
    check('Lines: hyphenated words count both parts (well-known = 2)', R.lineSyllables(D, 'well-known'), 2);
    check('Lines: punctuation and curly quotes are ignored', R.lineWords('“Stop!” she said—no, don’t.'), ['Stop', 'she', 'said', 'no', 'don’t']);

    // --- Converting old plain-text lyrics into sections (songs.js) ---
    var I = SW.songs.importLyrics;
    var shape = function (txt) { return I(txt).map(function (s) { return s.tag + (s.repeatOf !== null ? '↻' + s.repeatOf : '') + (s.body ? ':' + s.body.split('\n').length : ''); }).join(' '); };
    check('Import: labels split sections; "Repeat Chorus x2" and a bare [Chorus] repeat it',
      shape('Verse 1:\nOne road\nTen years\n\nChorus\nDrive on\nLeave the map\n\nVerse 2\nAnother line\nOne more\n\n[Chorus]\n\nBridge: we drove all night\nand never stopped\n\nRepeat Chorus x2'),
      'Verse:2 Chorus:2 Verse:2 Chorus↻1 Bridge:2 Chorus↻1');
    check('Import: without labels, a block that appears twice is the Chorus', shape('a one\na two\n\nhook one\nhook two\n\nb one\nb two\n\nhook one\nhook two'), 'Verse:2 Chorus:2 Verse:2 Chorus↻1');
    check('Import: chord-only lines are left out', I('G        D/F#\nSmall town\nAm7 | F | C/E\nTen years').map(function (s) { return s.body; }), ['Small town\nTen years']);
    check('Import: chord lines recognised (G D/F# Em7 | Cmaj7, N.C.)', ['G  D/F#  Em7 | Cmaj7', 'N.C.', 'Bb  F/A  Gm', 'Asus4 x2'].map(SW.songs.isChordLine), [true, true, true, true]);
    check('Import: lyric lines aren\'t mistaken for chords (A day, Be mine)', ['A day in the life', 'Be mine', 'Em and I'].map(SW.songs.isChordLine), [false, false, false]);
    check('Import: custom labels keep their name; empty labeled sections stay', shape('[Intro riff]\nG D\n(Chorus - half time)\nslow words\nOutro:\nfade out'), 'Intro riff Chorus - half time:1 Outro:1');
    check('Import: a long run-on block is split where lines repeat', shape(['v1', 'v2', 'v3', 'c1', 'c2', 'w1', 'w2', 'w3', 'c1', 'c2'].map(function (x) { return 'line ' + x; }).join('\n')), 'Verse:3 Chorus:2 Verse:3 Chorus↻1');
    check('Import: empty text gives no sections', I('  \n\n'), []);

    // --- Definitions (definitions.js) ---
    var DF = R.loadDefinitions(SW.DEFINITIONS);
    var loveD = R.definitions(DF, TH, 'love');
    check('Definitions: love\'s first meaning is the everyday one, with an example', [loveD[0].pos, loveD[0].def, !!loveD[0].example], ['verb', 'have a great affection or liking for', true]);
    check('Definitions: every meaning is kept (the app shows 4, then Show more)', loveD.length > 4, true);
    var stopD = R.definitions(DF, TH, 'stop');
    check('Definitions: stop starts with "come to a halt"', /come to a halt/.test(stopD[0].def), true);
    check('Definitions: word forms find their base (stopped → stop\'s meanings too)', R.definitions(DF, TH, 'stopped').some(function (d) { return d.word === 'stop'; }), true);
    check('Definitions: examples have no quote marks', stopD.every(function (d) { return d.example.indexOf('"') < 0; }), true);
    check('Definitions: unknown word gives null', R.definitions(DF, TH, 'skrrt'), null);
    check('Syllables guessed for unknown words', ['skrrt', 'flombake', 'zibbletable'].map(function (w) { return R.syllables(D, w); }), [1, 2, 4]);

    return results;
  };

  // Running in Node from the command line: print a summary.
  if (typeof module !== 'undefined' && typeof window === 'undefined') {
    require('./theory.js');
    require('./words.js');
    require('./thesaurus.js');
    require('./definitions.js');
    require('./songs.js');
    require('./rhymes.js');
    var results = SW.runTests();
    // Every editor button (data-act="ed-…") must have a matching case in editor.js's act().
    var fs = require('fs'), src = fs.readFileSync(__dirname + '/editor.js', 'utf8');
    var acts = {}, cases = {};
    (src.match(/data-act="(ed-[a-z-]+)"/g) || []).forEach(function (m) { acts[m.slice(10, -1)] = true; });
    (src.match(/case '(ed-[a-z-]+)'/g) || []).forEach(function (m) { cases[m.slice(6, -1)] = true; });
    var missing = Object.keys(acts).filter(function (a) { return !cases[a]; });
    results.push({ name: 'Editor: every button has code behind it', ok: missing.length === 0, got: missing, want: [] });
    var failed = results.filter(function (r) { return !r.ok; });
    failed.forEach(function (r) { console.log('FAIL  ' + r.name + '\n      got:  ' + JSON.stringify(r.got) + '\n      want: ' + JSON.stringify(r.want)); });
    console.log((results.length - failed.length) + ' passed, ' + failed.length + ' failed');
    process.exitCode = failed.length ? 1 : 0;
  }
})(typeof window !== 'undefined' ? window : globalThis);
