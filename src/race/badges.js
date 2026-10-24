// Performance badge from real results (net WPM + accuracy).
export function raceBadge(wpm, accuracy){
  let badge;
  if(wpm>=100 && accuracy>=95) badge = { name:'Legend', tone:'gold', note:'Triple-digit speed with near-perfect control.' };
  else if(wpm>=80) badge = { name:'Turbo Ace', tone:'violet', note:'Turbo-tier pace sustained across the run.' };
  else if(wpm>=60) badge = { name:'Velocity Pro', tone:'cyan', note:'High-speed racing territory.' };
  else if(wpm>=40) badge = { name:'Street Racer', tone:'blue', note:'Solid racing pace. Push the rhythm for nitro.' };
  else if(wpm>=20) badge = { name:'Rider', tone:'slate', note:'Moderate pace. Smooth, steady keys build speed.' };
  else badge = { name:'Rookie', tone:'slate', note:'Every lap counts. Focus on accuracy first.' };
  if(accuracy>=98 && wpm>=20) badge.extra = 'Precision';
  else if(accuracy<85) badge.extra = 'Accuracy cost you speed';
  return badge;
}
