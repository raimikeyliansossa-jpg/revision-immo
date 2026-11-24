// Fichier agenda (.ics) : nos 4 rendez-vous qui se répètent (heure de Paris) :
//   dimanche 20 h, mercredi 21 h, dernier jour du mois 21 h, fin de trimestre 21 h.
// Il s'ouvre dans l'agenda de l'iPhone ou d'Android et ajoute un rappel qui se répète.
export const dynamic = "force-static";

type Ev = { uid: string; start: string; end: string; rrule: string; title: string; desc: string; alarms: string[] };

const EVENTS: Ev[] = [
  {
    uid: "point-du-dimanche@ks-ek",
    start: "20261122T200000",
    end: "20261122T204500",
    rrule: "FREQ=WEEKLY;BYDAY=SU",
    title: "💞 Notre point du dimanche",
    desc: "C'est l'heure de notre point 💞 FaceTime + l'app KS & EK.",
    alarms: ["-PT30M", "PT0M"],
  },
  {
    uid: "point-du-mercredi@ks-ek",
    start: "20261125T210000",
    end: "20261125T212000",
    rrule: "FREQ=WEEKLY;BYDAY=WE",
    title: "🔔 Point du mercredi « Mi-temps » 💞",
    desc: "Mes objectifs du dimanche, mon constat, ma note de la 1re partie, ce que je fais pour la 2e.",
    alarms: ["-PT30M", "PT0M"],
  },
  {
    uid: "bilan-du-mois@ks-ek",
    start: "20261130T210000",
    end: "20261130T220000",
    rrule: "FREQ=MONTHLY;BYMONTH=1,2,4,5,7,8,10,11;BYMONTHDAY=-1",
    title: "📅 Bilan du mois 💞",
    desc: "Dernier jour du mois : synthèse, fierté, points noirs et solutions, objectifs du mois prochain.",
    alarms: ["-P1D", "-PT30M"],
  },
  {
    uid: "point-du-trimestre@ks-ek",
    start: "20261231T210000",
    end: "20261231T223000",
    rrule: "FREQ=MONTHLY;BYMONTH=3,6,9,12;BYMONTHDAY=-1",
    title: "🌱 Point du trimestre 💞",
    desc: "Score perso, analyse des 3 mois, avis sur l'autre, les 3 prochains mois.",
    alarms: ["-P1D", "-PT30M"],
  },
];

function event(e: Ev) {
  return [
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    "DTSTAMP:20261124T120000Z",
    `DTSTART;TZID=Europe/Paris:${e.start}`,
    `DTEND;TZID=Europe/Paris:${e.end}`,
    `RRULE:${e.rrule}`,
    `SUMMARY:${e.title}`,
    `DESCRIPTION:${e.desc.replace(/,/g, "\\,")}`,
    ...e.alarms.flatMap((t) => ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${e.title}`, `TRIGGER:${t}`, "END:VALARM"]),
    "END:VEVENT",
  ];
}

export function GET() {
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//KS & EK//Nos points//FR",
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
    ...EVENTS.flatMap(event),
    "END:VCALENDAR",
  ].join("\r\n");
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="nos-points-ks-ek.ics"',
    },
  });
}
