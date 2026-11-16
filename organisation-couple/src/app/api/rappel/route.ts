// Fichier agenda (.ics) : « Notre point du dimanche » chaque dimanche à 20 h (heure de Paris).
// Il s'ouvre dans l'agenda de l'iPhone ou d'Android et ajoute un rappel qui se répète.
export const dynamic = "force-static";

export function GET() {
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//KS & EK//Point du dimanche//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE",
    "TZID:Europe/Paris",
    "BEGIN:DAYLIGHT",
    "TZOFFSETFROM:+0100",
    "TZOFFSETTO:+0200",
    "TZNAME:CEST",
    "DTSTART:19700329T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
    "END:DAYLIGHT",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0200",
    "TZOFFSETTO:+0100",
    "TZNAME:CET",
    "DTSTART:19701025T030000",
    "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
    "END:STANDARD",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    "UID:point-du-dimanche@ks-ek",
    "DTSTAMP:20261115T120000Z",
    "DTSTART;TZID=Europe/Paris:20261122T200000",
    "DTEND;TZID=Europe/Paris:20261122T204500",
    "RRULE:FREQ=WEEKLY;BYDAY=SU",
    "SUMMARY:💞 Notre point du dimanche",
    "DESCRIPTION:C'est l'heure de notre point 💞 FaceTime + l'app KS & EK.",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:C'est l'heure de notre point 💞",
    "TRIGGER:PT0M",
    "END:VALARM",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Notre point dans 30 minutes 💞",
    "TRIGGER:-PT30M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="point-du-dimanche.ics"',
    },
  });
}
