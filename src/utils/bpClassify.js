/**
 * AHA Blood Pressure Classification Engine
 * Based on American Heart Association 2017 guidelines
 */
export function classifyBP(systolic, diastolic) {
  const s = Number(systolic);
  const d = Number(diastolic);
  if (isNaN(s) || isNaN(d) || s <= 0 || d <= 0) return { label: 'Unknown', color: 'normal' };
  if (s >= 180 || d >= 120) return { label: 'Hypertensive Crisis', color: 'crisis' };
  if (s >= 140 || d >= 90)  return { label: 'Stage 2 Hypertension', color: 'stage2' };
  if (s >= 130 || d >= 80)  return { label: 'Stage 1 Hypertension', color: 'stage1' };
  if (s >= 120 && d < 80)   return { label: 'Elevated', color: 'elevated' };
  return { label: 'Normal', color: 'normal' };
}

/** Returns Tailwind CSS class bundles for each AHA category */
export function getAHAStyles(systolic, diastolic) {
  const { label, color } = classifyBP(systolic, diastolic);
  const map = {
    normal:   { badge: 'bg-green-100 text-green-700',              row: 'hover:bg-slate-50',               numText: 'text-slate-800' },
    elevated: { badge: 'bg-yellow-100 text-yellow-700',            row: 'bg-yellow-50/60 hover:bg-yellow-100/50', numText: 'text-yellow-800' },
    stage1:   { badge: 'bg-orange-100 text-orange-700',            row: 'bg-orange-50/40 hover:bg-orange-100/40', numText: 'text-orange-700' },
    stage2:   { badge: 'bg-red-100 text-red-700',                  row: 'bg-red-50 hover:bg-red-100/50',   numText: 'text-red-700' },
    crisis:   { badge: 'bg-red-900 text-red-100 animate-pulse',    row: 'bg-red-100 hover:bg-red-200/50',  numText: 'text-red-900 font-black' },
  };
  return { label, color, ...map[color] };
}
