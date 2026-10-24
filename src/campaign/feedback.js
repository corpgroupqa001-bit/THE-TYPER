// Plain-language explanations shown on the result screens.
export const DEFEAT_REASONS = {
  'behind-at-time': 'Time ran out with your opponent ahead.',
  'ai-finished-first': 'Your opponent finished the passage first.',
  'tie': 'Dead heat. In the campaign, a tie goes to the opponent: you have to win outright.',
  'no-input': 'No characters were typed, so the race can’t count as a win.',
  'abandoned': 'The race was left before the finish (refresh, closed tab or forfeit). That counts as a defeat.',
};

export function raceFeedback({ win, reason, player, ai, level }){
  const tips = [];
  const gap = (ai?.completed ?? 0) - (player?.completed ?? 0);
  if(win){
    tips.push(player.completed>=player.length
      ? `You finished the whole passage before ${level.opponent.name}.`
      : `You finished ${Math.abs(gap)} characters ahead of ${level.opponent.name}.`);
    if(player.accuracy<92) tips.push(`Accuracy was ${player.accuracy}%. Tighten it up: the next opponents punish mistakes.`);
    else tips.push(`Solid ${player.accuracy}% accuracy. Keep that rhythm for the next level.`);
    return tips;
  }
  if(reason==='no-input' || reason==='abandoned') return [DEFEAT_REASONS[reason]];
  if(gap>0) tips.push(`You were ${gap} characters behind ${level.opponent.name}, who averaged ${ai.wpm} WPM.`);
  const needed = Math.ceil((ai?.wpm ?? level.ai.target) + 2);
  if((player?.wpm ?? 0) < needed) tips.push(`Aim for about ${needed}+ net WPM to beat this opponent; you reached ${player.wpm}.`);
  if((player?.accuracy ?? 100) < 92) tips.push(`Accuracy was ${player.accuracy}%. Every mistake brakes your bike and only correct characters count. Slow down slightly to stay above 95%.`);
  if(tips.length===0) tips.push('It was close. Keep a steady rhythm instead of short bursts.');
  return tips;
}
