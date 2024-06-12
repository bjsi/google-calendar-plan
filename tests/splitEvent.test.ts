import { Cal } from "../Code";
import MockDate from "mockdate";
import { expectEventsEqual, mockEvent } from "./testHelpers";

beforeEach(() => {
  const mockTime = new Date();
  mockTime.setHours(0, 10, 0, 0);
  MockDate.set(mockTime);
});

test("split non current event", () => {
  const events = [mockEvent([1, 0], [2, 0])];
  const cal = new Cal(events);
  const success = cal.splitEvent(events[0].id);
  expect(success).toBe(true);
  const updatedEvents = cal.listEvents({});
  expectEventsEqual(updatedEvents, [
    mockEvent([1, 0], [1, 30]),
    mockEvent([1, 30], [2, 0]),
    mockEvent([24, 0], [24, 0], true),
  ]);
});

test("split current event", () => {
  const events = [mockEvent([0, 0], [1, 0])];
  const cal = new Cal(events);
  const success = cal.splitEvent(events[0].id);
  expect(success).toBe(true);
  const updatedEvents = cal.listEvents({});
  expectEventsEqual(updatedEvents, [
    mockEvent([0, 0], [0, 10]),
    mockEvent([0, 10], [1, 0]),
    mockEvent([24, 0], [24, 0], true),
  ]);
});
