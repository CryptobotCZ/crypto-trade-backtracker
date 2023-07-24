export function getDateFromTimestampOrDateStr(date: number|string) {
  const timestamp = typeof date === 'string' 
    ? parseInt(date)
    : date;

    if (!isNaN(timestamp)) {
        return new Date(timestamp);
    } else {
        return new Date(date);
    }
}

// https://stackoverflow.com/a/75697695
const divMod = (n: number, m: number) => [
  Math.floor(n / m),
  n % m
];

export function createDurationFormatter(locale: string, unitDisplay: 'long'|'short'|'narrow' = 'long') {
  const timeUnitFormatter = (locale: string, unit: string, unitDisplay: 'long'|'short'|'narrow') =>
    Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay }).format;

  const  fmtDays = timeUnitFormatter(locale, 'day', unitDisplay),
    fmtHours = timeUnitFormatter(locale, 'hour', unitDisplay),
    fmtMinutes = timeUnitFormatter(locale, 'minute', unitDisplay),
    fmtSeconds = timeUnitFormatter(locale, 'second', unitDisplay),
    fmtMilliseconds = timeUnitFormatter(locale, 'millisecond', unitDisplay),
    fmtList = new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' });
  
  return (milliseconds: number) => {
    let days, hours, minutes, seconds;
    [days, milliseconds] = divMod(milliseconds, 864e5);
    [hours, milliseconds] = divMod(milliseconds, 36e5);
    [minutes, milliseconds] = divMod(milliseconds, 6e4);
    [seconds, milliseconds] = divMod(milliseconds, 1e3);

    return fmtList.format([
      days ? fmtDays(days) : null,
      hours ? fmtHours(hours) : null,
      minutes ? fmtMinutes(minutes) : null,
      seconds ? fmtSeconds(seconds) : null,
      milliseconds ? fmtMilliseconds(milliseconds) : null
    ].filter(v => v !== null) as Iterable<string>);
  }
}

export function getTradeDuration(openDate: Date, closeDate: Date|null) {
    closeDate ??= new Date();
    const ms = closeDate.getTime() - openDate.getTime();
    return ms;
}

export function getFormattedTradeDuration(openDate: Date, closeDate: Date|null, formatter: (ms: number) => string) {
  const ms = getTradeDuration(openDate, closeDate);
  const result = formatter(ms);

  if (closeDate == null) {
    return result + '+';
  }

  return result;
}
