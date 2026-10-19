Sound Effect Assets for Lexify Quiz
=====================================

Place the following short audio files here (MP3 or OGG, keep each < 100KB):

  correct.mp3   - Played when the user answers a quiz question correctly
  wrong.mp3     - Played when the user answers incorrectly
  win.mp3       - Played when the quiz completes successfully (hearts remaining)
  lose.mp3      - Played when the quiz ends due to running out of hearts

The code in js/quiz.js preloads all four via the Audio() constructor and plays
them at the appropriate moment. The audio gracefully silences if the files
are missing (no error thrown to the user).

Free sources for short game SFX:
  - https://freesound.org
  - https://mixkit.co/free-sound-effects
  - https://opengameart.org
