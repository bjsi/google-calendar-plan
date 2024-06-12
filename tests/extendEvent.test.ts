import { Cal } from "../Code";
import MockDate from "mockdate";
import { expectEventsEqual, mockEvent } from "./testHelpers";

beforeEach(() => {
  const mockTime = new Date();
  mockTime.setHours(0, 0, 0, 0);
  MockDate.set(mockTime);
});

test("extend event without overlap", () => {
  const events = [mockEvent([0, 0], [1, 0]), mockEvent([2, 0], [3, 0])];
  const cal = new Cal(events);
  const success = cal.expandEventDuration(events[0].id, 30);
  expect(success).toBe(true);
  const updatedEvents = cal.listEvents({});
  expectEventsEqual(updatedEvents, [
    mockEvent([0, 0], [1, 30]),
    mockEvent([2, 0], [3, 0]),
    mockEvent([24, 0], [24, 0], true),
  ]);
});

test("extend event with overlap", () => {
  const events = [mockEvent([0, 0], [1, 0]), mockEvent([1, 30], [2, 30])];
  const cal = new Cal(events);
  const success = cal.expandEventDuration(events[0].id, 60);
  expect(success).toBe(true);
  const updatedEvents = cal.listEvents({});
  expectEventsEqual(updatedEvents, [
    mockEvent([0, 0], [2, 0]),
    mockEvent([2, 0], [3, 0]),
    mockEvent([24, 0], [24, 0], true),
  ]);
});

test("extend event with blocker", () => {
  const events = [
    mockEvent([0, 0], [1, 0]),
    mockEvent([1, 0], [2, 0], true),
    mockEvent([2, 0], [3, 0]),
  ];
  const cal = new Cal(events);
  const success = cal.expandEventDuration(events[0].id, 60);
  expect(success).toBe(true); // TODO: should be false
  const updatedEvents = cal.listEvents({});
  expectEventsEqual(updatedEvents, [
    ...events,
    mockEvent([24, 0], [24, 0], true),
  ]);
});

test("extend event overlapping with multiple events", () => {
  const events = [
    mockEvent([0, 0], [1, 0]),
    mockEvent([1, 0], [2, 0]),
    mockEvent([2, 0], [3, 0]),
  ];
  const cal = new Cal(events);
  const success = cal.expandEventDuration(events[0].id, 10);
  expect(success).toBe(true);
  const updatedEvents = cal.listEvents({});
  expectEventsEqual(updatedEvents, [
    mockEvent([0, 0], [1, 10]),
    mockEvent([1, 10], [2, 10]),
    mockEvent([2, 10], [3, 10]),
    mockEvent([24, 0], [24, 0], true),
  ]);
});

test("extend event with one event in between", () => {
  const events = [
    mockEvent([0, 0], [1, 0]),
    mockEvent([1, 30], [2, 30]),
    mockEvent([2, 30], [3, 30]),
  ];
  const cal = new Cal(events);
  const success = cal.expandEventDuration(events[0].id, 60);
  expect(success).toBe(true);
  const updatedEvents = cal.listEvents({});
  expectEventsEqual(updatedEvents, [
    mockEvent([0, 0], [2, 0]),
    mockEvent([2, 0], [3, 0]),
    mockEvent([3, 0], [4, 0]),
    mockEvent([24, 0], [24, 0], true),
  ]);
});

test("extend event with overlapping events and blocker", () => {
  const events = [
    mockEvent([0, 0], [1, 0]),
    mockEvent([1, 0], [2, 0]),
    mockEvent([2, 0], [3, 0], true),
  ];
  const cal = new Cal(events);
  const success = cal.expandEventDuration(events[0].id, 30);
  expect(success).toBe(true);
  const updatedEvents = cal.listEvents({});
  expectEventsEqual(updatedEvents, [
    mockEvent([0, 0], [1, 30]),
    mockEvent([1, 30], [2, 0]),
    mockEvent([2, 0], [3, 0], true),
    mockEvent([24, 0], [24, 0], true),
  ]);
});
