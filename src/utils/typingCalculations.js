/*
 * THE TYPER — typing calculation strategy (used everywhere in the app)
 *
 *   Net WPM   = correctly typed characters / 5 / elapsed minutes
 *               (the headline "WPM": shown live, saved to history and used for race speed)
 *   Gross WPM = all typed characters (correct + incorrect) / 5 / elapsed minutes
 *   Accuracy  = correct keystrokes / total keystrokes × 100
 *               (every character key press counts as an attempt; fixing a mistake
 *                with Backspace does not erase the original miss)
 *
 * Elapsed time excludes paused time and the pre-race countdown.
 */

// Avoid absurd spikes in the first fraction of a second of a test.
const MIN_ELAPSED_FOR_WPM = 1;

export function calculateWPM(correctChars, elapsedSeconds){
  if(!(elapsedSeconds>0) || correctChars<=0) return 0;
  const minutes = Math.max(elapsedSeconds, MIN_ELAPSED_FOR_WPM)/60;
  return Math.round((correctChars/5)/minutes);
}

export function calculateGrossWPM(typedChars, elapsedSeconds){
  return calculateWPM(typedChars, elapsedSeconds);
}

export function calculateAccuracy(correctChars, totalChars){
  if(totalChars<=0) return 100;
  return Math.round((correctChars/totalChars)*100);
}

export function formatTime(sec){
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s/60).toString().padStart(2,'0');
  return `${m}:${(s%60).toString().padStart(2,'0')}`;
}
