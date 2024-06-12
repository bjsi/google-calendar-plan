import { Cal } from "../Code";
import MockDate from "mockdate";
import { expectEventsEqual, mockEvent } from "./testHelpers";

beforeEach(() => {
  const mockTime = new Date();
  mockTime.setHours(0, 10, 0, 0);
  MockDate.set(mockTime);
});

test("start late no blocker", () => {
  const events = [mockEvent([0, 0], [1, 0]), mockEvent([1, 0], [2, 0])];
  const cal = new Cal(events);
  const success = cal.startEventLate(events[0].id);
  expect(success).toBe(true);
  const updatedEvents = cal.listEvents({});
  expectEventsEqual(updatedEvents, [
    mockEvent([0, 10], [1, 10]),
    mockEvent([1, 10], [2, 10]),
    mockEvent([24, 0], [24, 0], true),
  ]);
});

test("start late with blocker 2 compressed", () => {
  const events = [
    mockEvent([0, 0], [1, 0]),
    mockEvent([1, 0], [2, 0]),
    mockEvent([2, 0], [3, 0], true),
  ];
  const cal = new Cal(events);
  const success = cal.startEventLate(events[0].id);
  expect(success).toBe(true);
  const updatedEvents = cal.listEvents({});
  expectEventsEqual(updatedEvents, [
    mockEvent([0, 10], [1, 5]),
    mockEvent([1, 5], [2, 0]),
    mockEvent([2, 0], [3, 0], true),
    mockEvent([24, 0], [24, 0], true),
  ]);
});

test("start late with blocker 4 compressed (even)", () => {
  const mockTime = new Date();
  mockTime.setHours(0, 20, 0, 0); // Set the mock time to 00:20
  MockDate.set(mockTime);
  const events = [
    mockEvent([0, 0], [1, 0]),
    mockEvent([1, 0], [2, 0]),
    mockEvent([2, 0], [3, 0]),
    mockEvent([3, 0], [4, 0]),
    mockEvent([4, 0], [5, 0], true),
  ];
  const cal = new Cal(events);
  const success = cal.startEventLate(events[0].id);
  expect(success).toBe(true);
  const updatedEvents = cal.listEvents({});
  expectEventsEqual(updatedEvents, [
    mockEvent([0, 20], [1, 15]),
    mockEvent([1, 15], [2, 10]),
    mockEvent([2, 10], [3, 5]),
    mockEvent([3, 5], [4, 0]),
    mockEvent([4, 0], [5, 0], true),
    mockEvent([24, 0], [24, 0], true),
  ]);
});

test("start late with blocker and events of different lengths compressed", () => {
  const mockTime = new Date();
  mockTime.setHours(0, 15, 0, 0); // Set the mock time to 00:15
  MockDate.set(mockTime);
  const events = [
    mockEvent([0, 0], [0, 30]), // 30 minutes event
    mockEvent([0, 30], [1, 30]), // 60 minutes event
    mockEvent([1, 30], [3, 0]), // 90 minutes event
    mockEvent([3, 0], [4, 0], true), // Blocker event
  ];
  const cal = new Cal(events);
  const success = cal.startEventLate(events[0].id);
  expect(success).toBe(true);
  const updatedEvents = cal.listEvents({});
  expectEventsEqual(updatedEvents, [
    mockEvent([0, 15], [0, 42.5]), // Compressed 30 minutes event
    mockEvent([0, 42.5], [1, 37.5]), // Compressed 60 minutes event
    mockEvent([1, 37.5], [3, 0]), // Compressed 90 minutes event
    mockEvent([3, 0], [4, 0], true), // Blocker event
    mockEvent([24, 0], [24, 0], true),
  ]);
});

test("start late 1 activity in between", () => {
  const events = [
    mockEvent([0, 0], [0, 5]),
    mockEvent([0, 5], [0, 10]),
    mockEvent([2, 0], [3, 0]),
    mockEvent([3, 0], [4, 0]),
  ];
  const cal = new Cal(events);
  const success = cal.startEventLate(events[0].id);
  expect(success).toBe(true);
  const updatedEvents = cal.listEvents({});
  expectEventsEqual(updatedEvents, [
    mockEvent([0, 10], [0, 15]),
    mockEvent([0, 15], [0, 20]),
    mockEvent([2, 0], [3, 0]),
    mockEvent([3, 0], [4, 0]),
    mockEvent([24, 0], [24, 0], true),
  ]);
});

test("start late 1 activity in between with blocker", () => {
  const events = [
    mockEvent([0, 0], [0, 5]),
    mockEvent([0, 5], [0, 10]),
    mockEvent([0, 15], [3, 0], true),
  ];
  const cal = new Cal(events);
  const success = cal.startEventLate(events[0].id);
  expect(success).toBe(true);
  const updatedEvents = cal.listEvents({});
  expectEventsEqual(updatedEvents, [
    mockEvent([0, 10], [0, 12.5]),
    mockEvent([0, 12.5], [0, 15]),
    mockEvent([0, 15], [3, 0], true),
    mockEvent([24, 0], [24, 0], true),
  ]);
});

test("should fail if there are overlapping events", () => {
  const events = [mockEvent([0, 0], [0, 5]), mockEvent([0, 4], [0, 10])];
  const cal = new Cal(events);
  expectEventsEqual(
    cal.listEvents({}),
    events.concat([mockEvent([24, 0], [24, 0], true)])
  );
  const success = cal.startEventLate(events[0].id);
  expect(success).toBe(false);
  const updatedEvents = cal.listEvents({});
  expectEventsEqual(
    updatedEvents,
    events.concat([mockEvent([24, 0], [24, 0], true)])
  );
});
