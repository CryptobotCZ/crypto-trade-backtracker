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
