import { Cal } from "../Code";
import MockDate from "mockdate";
import { expectEventsEqual, mockEvent } from "./testHelpers";

beforeEach(() => {
  const mockTime = new Date();
  mockTime.setHours(0, 10, 0, 0);
  MockDate.set(mockTime);
});

test("start early with no current event", () => {
  const events = [mockEvent([1, 0], [2, 0])];
  const cal = new Cal(events);
  const success = cal.startEventEarly(events[0].id);
  expect(success).toBe(true);
  const updatedEvents = cal.listEvents({});
  expectEventsEqual(updatedEvents, [
    mockEvent([0, 10], [1, 10]),
    mockEvent([24, 0], [24, 0], true),
  ]);
});

test("start early with ongoing event", () => {
  const events = [mockEvent([0, 0], [1, 0]), mockEvent([1, 0], [2, 0])];
  const cal = new Cal(events);
  const success = cal.startEventEarly(events[1].id);
  expect(success).toBe(true);
  const updatedEvents = cal.listEvents({});
  expectEventsEqual(updatedEvents, [
    mockEvent([0, 0], [0, 10]),
    mockEvent([0, 10], [1, 10]),
    mockEvent([24, 0], [24, 0], true),
  ]);
});

test("start early with blocker", () => {
  const events = [
    mockEvent([0, 0], [1, 0]),
    mockEvent([1, 0], [2, 0], true),
    mockEvent([2, 0], [3, 0]),
  ];
  const cal = new Cal(events);
  const success = cal.startEventEarly(events[2].id);
  expect(success).toBe(true);
  const updatedEvents = cal.listEvents({});
  expectEventsEqual(updatedEvents, [
    mockEvent([0, 0], [0, 10]),
    mockEvent([0, 10], [1, 0]),
    mockEvent([1, 0], [2, 0], true),
    mockEvent([24, 0], [24, 0], true),
  ]);
});

test("start early with one event in between", () => {
  const events = [
    mockEvent([0, 0], [1, 0]),
    mockEvent([1, 0], [2, 0]),
    mockEvent([2, 0], [3, 0]),
  ];
  const cal = new Cal(events);
  const success = cal.startEventEarly(events[2].id);
  expect(success).toBe(true);
  const updatedEvents = cal.listEvents({});
  expectEventsEqual(updatedEvents, [
    mockEvent([0, 0], [0, 10]),
    mockEvent([0, 10], [1, 10]),
    mockEvent([1, 10], [2, 10]),
    mockEvent([24, 0], [24, 0], true),
  ]);
});

test("start early with one event in between and blocker", () => {
  const events = [
    mockEvent([0, 0], [1, 0]),
    mockEvent([1, 0], [2, 0]),
    mockEvent([2, 0], [3, 0], true),
    mockEvent([3, 0], [4, 0]),
  ];
  const cal = new Cal(events);
  const success = cal.startEventEarly(events[3].id);
  expect(success).toBe(true);
  const updatedEvents = cal.listEvents({});
  expectEventsEqual(updatedEvents, [
    mockEvent([0, 0], [0, 10]),
    mockEvent([0, 10], [1, 5]),
    mockEvent([1, 5], [2, 0]),
    mockEvent([2, 0], [3, 0], true),
    mockEvent([24, 0], [24, 0], true),
  ]);
});
