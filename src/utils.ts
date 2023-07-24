export function getDateFromTimestampOrDateStr(date: number|string) {
    if (typeof date === "number") {
        return new Date(parseInt(date));
    } else {
        return new Date(date);
    }
}
