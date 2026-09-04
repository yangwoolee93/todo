/**
 * 관공서 공휴일(법정 쉬는 날) 여부.
 * 음력 설·추석·부처님오신날은 2000–2040 양력 대응일을 쓴다.
 * 선거일·임시공휴일은 넣지 않는다.
 */

const LUNAR_YEAR_START = 2000;

/** 설날, 부처님오신날, 추석 — 양력 MMDD */
const LUNAR_MD: ReadonlyArray<readonly [number, number, number]> = [
  [205, 511, 912],
  [124, 501, 1001],
  [212, 519, 921],
  [201, 508, 911],
  [122, 526, 928],
  [209, 515, 918],
  [129, 505, 1006],
  [218, 524, 925],
  [207, 512, 914],
  [126, 502, 1003],
  [214, 521, 922],
  [203, 510, 912],
  [123, 528, 930],
  [210, 517, 919],
  [131, 506, 908],
  [219, 525, 927],
  [208, 514, 915],
  [128, 503, 1004],
  [216, 522, 924],
  [205, 512, 913],
  [125, 430, 1001],
  [212, 519, 921],
  [201, 508, 910],
  [122, 527, 929],
  [210, 515, 917],
  [129, 505, 1006],
  [217, 524, 925],
  [207, 513, 915],
  [127, 502, 1003],
  [213, 520, 922],
  [203, 509, 912],
  [123, 528, 1001],
  [211, 516, 919],
  [131, 506, 908],
  [219, 525, 927],
  [208, 515, 916],
  [128, 503, 1004],
  [215, 522, 924],
  [204, 511, 913],
  [124, 430, 1002],
  [212, 518, 921],
];

type SubRule = "none" | "sun" | "weekend";

const holidayCache = new Map<number, Set<number>>();

function toKey(year: number, month: number, day: number) {
  return year * 10000 + month * 100 + day;
}

function fromKey(key: number) {
  return {
    year: Math.floor(key / 10000),
    month: Math.floor(key / 100) % 100,
    day: key % 100,
  };
}

function fromMmdd(year: number, mmdd: number) {
  return { year, month: Math.floor(mmdd / 100), day: mmdd % 100 };
}

function weekday(year: number, month: number, day: number) {
  return new Date(year, month - 1, day).getDay();
}

function shiftDay(year: number, month: number, day: number, delta: number) {
  const date = new Date(year, month - 1, day + delta);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

function nextOpenDay(taken: Set<number>, year: number, month: number, day: number) {
  let next = shiftDay(year, month, day, 1);
  while (true) {
    const dow = weekday(next.year, next.month, next.day);
    const key = toKey(next.year, next.month, next.day);
    if (dow !== 0 && dow !== 6 && !taken.has(key)) return key;
    next = shiftDay(next.year, next.month, next.day, 1);
  }
}

function addHoliday(
  dates: Map<number, SubRule[]>,
  year: number,
  month: number,
  day: number,
  rule: SubRule,
) {
  const key = toKey(year, month, day);
  const list = dates.get(key);
  if (list) list.push(rule);
  else dates.set(key, [rule]);
}

function holidaysInYear(year: number): Set<number> {
  const cached = holidayCache.get(year);
  if (cached) return cached;

  const dates = new Map<number, SubRule[]>();
  const hangulOn = year >= 2013;
  const laborConstitutionOn = year >= 2026;

  addHoliday(dates, year, 1, 1, "none");
  addHoliday(dates, year, 3, 1, year >= 2023 ? "weekend" : "none");
  if (laborConstitutionOn) addHoliday(dates, year, 5, 1, "weekend");
  addHoliday(dates, year, 5, 5, year >= 2021 ? "weekend" : year >= 2014 ? "sun" : "none");
  addHoliday(dates, year, 6, 6, "none");
  if (laborConstitutionOn) addHoliday(dates, year, 7, 17, "weekend");
  addHoliday(dates, year, 8, 15, year >= 2023 ? "weekend" : "none");
  addHoliday(dates, year, 10, 3, year >= 2023 ? "weekend" : "none");
  if (hangulOn) addHoliday(dates, year, 10, 9, year >= 2023 ? "weekend" : "none");
  addHoliday(dates, year, 12, 25, year >= 2023 ? "weekend" : "none");

  const lunar = LUNAR_MD[year - LUNAR_YEAR_START];
  if (lunar) {
    const seollal = fromMmdd(year, lunar[0]);
    const buddha = fromMmdd(year, lunar[1]);
    const chuseok = fromMmdd(year, lunar[2]);
    const lunarSun = year >= 2013 ? "sun" : "none";
    const eve = shiftDay(seollal.year, seollal.month, seollal.day, -1);
    const seollalNext = shiftDay(seollal.year, seollal.month, seollal.day, 1);
    addHoliday(dates, eve.year, eve.month, eve.day, lunarSun);
    addHoliday(dates, seollal.year, seollal.month, seollal.day, lunarSun);
    addHoliday(dates, seollalNext.year, seollalNext.month, seollalNext.day, lunarSun);
    addHoliday(dates, buddha.year, buddha.month, buddha.day, year >= 2023 ? "weekend" : "none");
    const chuseokEve = shiftDay(chuseok.year, chuseok.month, chuseok.day, -1);
    const chuseokNext = shiftDay(chuseok.year, chuseok.month, chuseok.day, 1);
    addHoliday(dates, chuseokEve.year, chuseokEve.month, chuseokEve.day, lunarSun);
    addHoliday(dates, chuseok.year, chuseok.month, chuseok.day, lunarSun);
    addHoliday(dates, chuseokNext.year, chuseokNext.month, chuseokNext.day, lunarSun);
  }

  const taken = new Set(dates.keys());
  const needSub: number[] = [];

  dates.forEach((rules, key) => {
    const { year: y, month: m, day: d } = fromKey(key);
    const dow = weekday(y, m, d);
    const overlap = rules.length > 1 && dow !== 0 && dow !== 6;
    const weekendHit = rules.some((rule) => {
      if (rule === "weekend") return dow === 0 || dow === 6;
      if (rule === "sun") return dow === 0;
      return false;
    });
    const overlapHit = overlap && rules.some((rule) => rule !== "none");
    if (weekendHit || overlapHit) needSub.push(key);
  });

  needSub.sort((a, b) => a - b);
  const extras = new Set<number>();
  for (const key of needSub) {
    const { year: y, month: m, day: d } = fromKey(key);
    const combined = new Set(taken);
    extras.forEach((item) => combined.add(item));
    let extra = nextOpenDay(combined, y, m, d);
    while (extras.has(extra)) {
      const next = fromKey(extra);
      extra = nextOpenDay(combined, next.year, next.month, next.day);
    }
    extras.add(extra);
  }
  extras.forEach((key) => taken.add(key));

  holidayCache.set(year, taken);
  return taken;
}

export function isKoreanPublicHoliday(year: number, month: number, day: number): boolean {
  return holidaysInYear(year).has(toKey(year, month, day));
}
