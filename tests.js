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

    // --- Borrowed chords ---
    check('Borrowed in C major', symbols(T.borrowedChords(N('C'), 'major')), 'Fm E♭ A♭ B♭ D° Gm D');
    check('Borrowed numerals in C major', numerals(T.borrowedChords(N('C'), 'major')), 'iv ♭III ♭VI ♭VII ii° v II');
    check('Borrowed in D major', symbols(T.borrowedChords(N('D'), 'major')), 'Gm F B♭ C E° Am E');
    check('Borrowed in A minor', symbols(T.borrowedChords(N('A'), 'minor')), 'D E E7 A');
    check('Borrowed in D Dorian (IV already in key)', symbols(T.borrowedChords(N('D'), 'dorian')), 'A A7 D');
    check('Borrowed in A harmonic minor (V already in key)', symbols(T.borrowedChords(N('A'), 'harmonicMinor')), 'D A');
    check('Borrowed in G Mixolydian (♭VII and v already in key)', symbols(T.borrowedChords(N('G'), 'mixolydian')), 'Cm B♭ E♭ A° A');

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
    check('C is borrowed in D', T.findChord(N('D'), 'major', { deg: 6, semi: 10, quality: 'maj' }), { tab: 'borrowed' });
    check('E♭maj7 is "any chord" in D', T.findChord(N('D'), 'major', { deg: 1, semi: 1, quality: 'maj7' }), { tab: 'any' });

    // --- Degree labels for notes outside the scale ---
    check('B♭ in D major is ♭6', T.degreeLabel(N('D'), 'major', 10), '♭6');
    check('E♭ in A blues is ♭5', T.degreeLabel(N('A'), 'blues', 3), '♭5');

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
