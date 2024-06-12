import { Cal } from "../Code";
import MockDate from "mockdate";
import { expectEventsEqual, mockEvent } from "./testHelpers";

beforeEach(() => {
  const mockTime = new Date();
  mockTime.setHours(0, 10, 0, 0);
  MockDate.set(mockTime);
});

test("insert interruption with no affected events", () => {
  const events = [
    mockEvent([0, 0], [0, 5]), // Event before the interruption
    mockEvent([0, 20], [0, 30]), // Event after the interruption
  ];

  const cal = new Cal(events);
  const success = cal.insertInterruption("Urgent Phone Call", 5);
  expect(success).toBe(true);
  const updatedEvents = cal.listEvents({});
  expectEventsEqual(updatedEvents, [
    mockEvent([0, 0], [0, 5]),
    mockEvent([0, 5], [0, 10]),
    mockEvent([0, 20], [0, 30]),
    mockEvent([24, 0], [24, 0], true),
  ]);
});

test("insert interruption that completely covers an event", () => {
  const events = [
    mockEvent([0, 0], [0, 10]), // Event completely covered by interruption
  ];

  const cal = new Cal(events);
  const success = cal.insertInterruption("Urgent Phone Call", 10);
  expect(success).toBe(true);
  const updatedEvents = cal.listEvents({});
  expectEventsEqual(updatedEvents, [
    mockEvent([0, 0], [0, 10]),
    mockEvent([24, 0], [24, 0], true),
  ]);
});

test("insert interruption that truncates the start of an event", () => {
  const events = [mockEvent([0, 5], [0, 30])];

  const cal = new Cal(events);
  const success = cal.insertInterruption("Urgent Phone Call", 10); // 10-minute interruption
  expect(success).toBe(true);
  const updatedEvents = cal.listEvents({});
  expectEventsEqual(updatedEvents, [
    mockEvent([0, 0], [0, 10]),
    mockEvent([0, 10], [0, 30]),
    mockEvent([24, 0], [24, 0], true),
  ]);
});

test("insert interruption that truncates the end of an event", () => {
  const events = [
    mockEvent([0, 0], [0, 10]), // Event partially affected by interruption
  ];

  const cal = new Cal(events);
  const success = cal.insertInterruption("Urgent Phone Call", 5);
  expect(success).toBe(true);
  const updatedEvents = cal.listEvents({});
  expectEventsEqual(updatedEvents, [
    mockEvent([0, 0], [0, 5]),
    mockEvent([0, 5], [0, 10]),
    mockEvent([24, 0], [24, 0], true),
  ]);
});

test("insert interruption that splits an event into two", () => {
  const events = [mockEvent([0, 0], [0, 15])];

  const cal = new Cal(events);
  const success = cal.insertInterruption("Urgent Phone Call", 5);
  expect(success).toBe(true);
  const updatedEvents = cal.listEvents({});
  expectEventsEqual(updatedEvents, [
    mockEvent([0, 0], [0, 5]), // First part of the split event
    mockEvent([0, 5], [0, 10]), // Interruption
    mockEvent([0, 10], [0, 15]),
    mockEvent([24, 0], [24, 0], true),
  ]);
});
