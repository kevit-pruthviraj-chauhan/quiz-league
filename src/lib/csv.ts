// Team names are user-typed: cells starting with = + - @ get a leading ' to block spreadsheet formula injection.
export const cell = (v: unknown) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const line = (a: unknown[]) => a.map(cell).join(',');
