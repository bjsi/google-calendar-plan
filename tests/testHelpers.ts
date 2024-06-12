import { randomUUID } from "crypto";

function setTimeFromString(d: Date, timeString: string) {
  // Split the input string into hours, minutes, seconds, and milliseconds
  const [hours, minutes, secondsWithMs] = timeString.split(":");
  const [seconds, milliseconds] = secondsWithMs.split(".");

  // Set the hours, minutes, seconds, and milliseconds on the Date object
  d.setHours(parseInt(hours, 10));
  d.setMinutes(parseInt(minutes, 10));
  d.setSeconds(parseInt(seconds, 10));
  d.setMilliseconds(parseInt(milliseconds, 10));
}

export function mockEvent(
  start: [number, number] | string,
  end: [number, number] | string,
  fixed?: boolean
): GoogleAppsScript.Calendar.Schema.Event {
  const startDate = new Date();
  if (Array.isArray(start)) {
    startDate.setHours(
      start[0],
      start[1],
      /* handle float minutes */ (start[1] % 1) * 60,
      0
    );
  } else {
    setTimeFromString(startDate, start);
  }
  const endDate = new Date();
  if (Array.isArray(end)) {
    endDate.setHours(
      end[0],
      end[1],
      /* handle float minutes */ (end[1] % 1) * 60,
      0
    );
  } else {
    setTimeFromString(endDate, end);
  }
  const ev = {
    id: randomUUID(),
    start: { dateTime: startDate.toISOString() },
    end: { dateTime: endDate.toISOString() },
  };
  if (fixed) {
    ev["description"] = "#fixed";
  }
  return ev;
}

export function expectEventsEqual(
  actual: GoogleAppsScript.Calendar.Schema.Event[],
  expected: GoogleAppsScript.Calendar.Schema.Event[]
) {
  expect(actual.length).toBe(expected.length);
  for (let i = 0; i < actual.length; i++) {
    expect(actual[i].start.dateTime).toBe(expected[i].start.dateTime);
    expect(actual[i].end.dateTime).toBe(expected[i].end.dateTime);
  }
}
