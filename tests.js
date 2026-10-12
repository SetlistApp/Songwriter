/* Songwriter: checks that theory.js gives the right answers.
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
    check('C G Am F with inversions off: total', T.pathTotal(T.smoothestVoicing(C, CGAmF, { notes: 3, inversions: false })), 31);
    check('Inversions off: root is always lowest', T.smoothestVoicing(C, CGAmF, { notes: 3, inversions: false }).map(function (v) { return v[0] % 12; }), [0, 7, 9, 5]);
    var locked = T.smoothestVoicing(C, CGAmF, three, { 2: [72] });
    check('Locking C5 on Am keeps it', locked[2].indexOf(72) >= 0, true);
    var groups = T.voicingGroups(C, CGAmF, three, null, 3);
    check('Groups: 3 groups, smoothest first, totals rising', groups.length === 3 && groups[0].total === 9 && groups[0].total < groups[1].total && groups[1].total < groups[2].total, true);
    check('Groups: every path in a group has that total', groups.every(function (g) { return g.paths.every(function (p) { return T.pathTotal(p) === g.total; }); }), true);
    var opts = T.chordVoicingOptions(C, CGAmF, smooth, 1, three);
    check('One-chord options sorted least to most', opts.every(function (o, i) { return !i || opts[i - 1].total <= o.total; }), true);
    check('One-chord options: smoothest is the current one', opts[0].voicing.join(), smooth[1].join());
    var c4 = T.chordVoicings(T.buildChord(C, CGAmF[0]), { notes: 4 }).map(function (v) { return v.join(' '); });
    check('4 notes: a triad with a doubled note (C4 E4 G4 C5)', c4.indexOf('60 64 67 72') >= 0, true);
    check('4 notes: smoothest C G Am F has 4 notes per chord', T.smoothestVoicing(C, CGAmF, { notes: 4 }).every(function (v) { return v.length === 4; }), true);
    var g7 = T.chordVoicings(T.buildChord(C, spec(4, 7, 'dom7')), three)[0].map(function (m) { return m % 12; }).sort(function (a, b) { return a - b; });
    check('3 notes of G7 leave out the 5th (G B F)', g7, [5, 7, 11]);
    check('All voicings fit in one octave', CGAmF.every(function (sp) { return T.chordVoicings(T.buildChord(C, sp), three).every(function (v) { return v[v.length - 1] - v[0] <= 12; }); }), true);

    return results;
  };

  // Running in Node from the command line: print a summary.
  if (typeof module !== 'undefined' && typeof window === 'undefined') {
    require('./theory.js');
    var results = SW.runTests(), failed = results.filter(function (r) { return !r.ok; });
    failed.forEach(function (r) { console.log('FAIL  ' + r.name + '\n      got:  ' + JSON.stringify(r.got) + '\n      want: ' + JSON.stringify(r.want)); });
    console.log((results.length - failed.length) + ' passed, ' + failed.length + ' failed');
    process.exitCode = failed.length ? 1 : 0;
  }
})(typeof window !== 'undefined' ? window : globalThis);
