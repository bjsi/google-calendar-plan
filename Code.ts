export class Cal {
  log: (msg: string) => void;

  constructor(private mock?: GoogleAppsScript.Calendar.Schema.Event[]) {
    this.log = mock ? console.log : Logger.log;
  }

  createEvent(summary: string, start: Date, end: Date, description?: string) {
    const event = {
      summary: summary,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
      description: description,
    };
    if (!this.mock) {
      return Calendar.Events.insert(event, "primary");
    } else {
      this.mock.push({ id: Math.random().toString(), ...event });
      return event;
    }
  }

  splitEvent(eventId: string) {
    const event = this.getEvent(eventId);
    const currentEvent = this.getCurrentEvent();
    if (event === currentEvent) {
      const now = new Date();
      const newEvent = {
        summary: event.summary,
        start: { dateTime: now.toISOString() },
        end: { dateTime: event.end.dateTime },
        description: event.description,
      };
      event.end.dateTime = now.toISOString();
      this.updateEvent(event);
      this.createEvent(
        newEvent.summary,
        new Date(newEvent.start.dateTime),
        new Date(newEvent.end.dateTime),
        newEvent.description
      );
    } else {
      const start = new Date(event.start.dateTime);
      const end = new Date(event.end.dateTime);
      const splitTime = new Date(
        start.valueOf() + (end.valueOf() - start.valueOf()) / 2
      );
      const newEvent = {
        summary: event.summary,
        start: { dateTime: splitTime.toISOString() },
        end: { dateTime: event.end.dateTime },
        description: event.description,
      };
      event.end.dateTime = splitTime.toISOString();
      this.updateEvent(event);
      this.createEvent(
        newEvent.summary,
        new Date(newEvent.start.dateTime),
        new Date(newEvent.end.dateTime),
        newEvent.description
      );
    }

    return true;
  }

  insertInterruption(summary: string, interruptionLength: number) {
    this.log(
      "Inserting interruption " +
        summary +
        " for " +
        interruptionLength +
        " minutes"
    );
    const now = new Date();
    const interruptionEnd = now;
    const interruptionStart = new Date(
      now.valueOf() - interruptionLength * 60 * 1000
    );

    const events = this.listAllOfTodaysEvents();

    const updatedEvents = [];
    const createdEvents = [];

    // Iterate over the events and adjust them based on the interruption
    for (const event of events) {
      const eventStart = new Date(event.start.dateTime).valueOf();
      const eventEnd = new Date(event.end.dateTime).valueOf();
      const interruptionStartMs = interruptionStart.valueOf();
      const interruptionEndMs = interruptionEnd.valueOf();

      if (eventStart < interruptionStartMs && eventEnd > interruptionEndMs) {
        this.log(
          "Event starts before and ends after the interruption, split into two parts"
        );
        event.end.dateTime = interruptionStart.toISOString();
        const updatedEvent2 = {
          summary: event.summary,
          start: {
            dateTime: interruptionEnd.toISOString(),
          },
          end: {
            dateTime: eventEnd,
          },
          description: event.description,
        };

        updatedEvent2.start.dateTime = interruptionEnd.toISOString();

        createdEvents.push(updatedEvent2);
        updatedEvents.push(event);
      } else if (
        eventStart >= interruptionStartMs &&
        eventEnd <= interruptionEndMs
      ) {
        // Event is completely covered by the interruption, remove it
        this.deleteEvent(event.id);
      } else if (
        eventStart < interruptionStartMs &&
        eventEnd <= interruptionEndMs &&
        eventEnd > interruptionStartMs
      ) {
        // Event starts before and ends during the interruption, truncate the end
        event.end.dateTime = interruptionStart.toISOString();
        updatedEvents.push(event);
      } else if (
        eventStart >= interruptionStartMs &&
        eventEnd > interruptionEndMs &&
        eventStart < interruptionEndMs
      ) {
        // Event starts during and ends after the interruption, truncate the start
        event.start.dateTime = interruptionEnd.toISOString();
        updatedEvents.push(event);
      }
    }

    // Update the events in the calendar
    for (const updatedEvent of updatedEvents) {
      this.updateEvent(updatedEvent);
    }

    // Create the new events in the calendar
    for (const createdEvent of createdEvents) {
      this.createEvent(
        createdEvent.summary,
        new Date(createdEvent.start.dateTime),
        new Date(createdEvent.end.dateTime),
        createdEvent.description
      );
    }

    this.createEvent(summary, interruptionStart, interruptionEnd);

    return true;
  }

  startEvent(eventId: string) {
    const now = new Date();
    const event = this.getEvent(eventId);
    const scheduledStart = new Date(event.start?.dateTime);
    if (!scheduledStart) {
      return;
    }
    if (now < scheduledStart) {
      this.startEventEarly(eventId);
    } else if (now === scheduledStart) {
      return;
    } else {
      this.startEventLate(eventId);
    }
  }

  expandEventDuration(eventId: string, minutes: number) {
    const event = this.getEvent(eventId);
    const end = new Date(event.end?.dateTime);
    if (!end) {
      return;
    }
    const newEnd = new Date(end.valueOf() + minutes * 60 * 1000);
    event.end.dateTime = newEnd.toISOString();

    let updatedEvents = [event];
    const nextEvents = this.listEventsAfter(eventId);
    this.shiftEventsLater(updatedEvents, nextEvents);

    const eventsToCompress = updatedEvents.filter((x) => x !== event);
    if (eventsToCompress.length > 0) {
      this.compressEvents(eventsToCompress, nextEvents);
    }

    updatedEvents.forEach((e) => this.updateEvent(e));
    return true;
  }

  stretchToNextEvent(eventId: string) {
    const event = this.getEvent(eventId);
    const nextEvents = this.listEventsAfter(eventId);
    if (nextEvents.length === 0) {
      return;
    }
    const nextEvent = nextEvents[0];
    const newEnd = new Date(nextEvent.start.dateTime);
    event.end.dateTime = newEnd.toISOString();

    let updatedEvents = [event];
    updatedEvents.forEach((e) => this.updateEvent(e));
    return true;
  }

  // startEventEarlyWithRedistribution(eventId: string) {
  //   const event = this.getEvent(eventId);
  //   const now = new Date();
  //   const gap = Math.abs(
  //     now.valueOf() - new Date(event.start.dateTime).valueOf()
  //   );
  //   const nextEvents = this.listEventsAfter(eventId);
  //   if (this.hasOverlappingEvents([event, ...nextEvents])) {
  //     this.log("Overlapping events, cancelling early start");
  //     return false;
  //   }
  //   let ret = this.startEventEarly(eventId);
  //   if (!ret) {
  //     return;
  //   }

  //   const updatedEvents = [event];
  //   this.shiftEventsEarlier(updatedEvents, nextEvents, gap);
  //   this.extendEvents(updatedEvents, gap);

  //   return true;
  // }

  extendEvents(
    updatedEvents: GoogleAppsScript.Calendar.Schema.Event[],
    totalGap: number
  ) {
    let lastEventExtensionAmount = 0;
    let gapRemaining = totalGap;
    const totalUpdatedEventsLength = updatedEvents.reduce((acc, e) => {
      return (
        acc +
        new Date(e.end.dateTime).valueOf() -
        new Date(e.start.dateTime).valueOf()
      );
    }, 0);

    for (let i = 0; i < updatedEvents.length; i++) {
      const curEvent = updatedEvents[i];
      if (totalGap <= 0 || isFixed(curEvent)) {
        break;
      } else {
        let length =
          new Date(curEvent.end.dateTime).valueOf() -
          new Date(curEvent.start.dateTime).valueOf();
        let extensionAmount =
          i === updatedEvents.length - 1
            ? gapRemaining
            : (length / totalUpdatedEventsLength) * totalGap;
        const updatedCurEvent = curEvent;
        updatedCurEvent.start.dateTime = new Date(
          new Date(curEvent.start.dateTime).valueOf() + lastEventExtensionAmount
        ).toISOString();
        updatedCurEvent.end.dateTime = new Date(
          new Date(curEvent.end.dateTime).valueOf() + extensionAmount
        ).toISOString();
        lastEventExtensionAmount = extensionAmount;
      }
    }
  }

  /**
   * Start an event at an earlier time than its scheduled start time.
   * TODO: fail if overlapping
   */
  startEventEarly(eventId: string) {
    const event = this.getEvent(eventId);
    const now = new Date();
    const currentEvent = this.getCurrentEvent();
    let updatedEvents: GoogleAppsScript.Calendar.Schema.Event[] = [];
    if (currentEvent) {
      // end current event early
      currentEvent.end.dateTime = now.toISOString();
      updatedEvents.push(currentEvent);
    }

    // move the event to the current time
    let eventLength =
      new Date(event.end.dateTime).valueOf() -
      new Date(event.start.dateTime).valueOf();
    event.start.dateTime = now.toISOString();
    event.end.dateTime = new Date(now.valueOf() + eventLength).toISOString();
    updatedEvents.push(event);

    // shift and compress subsequent events

    const nextEvents = this.listEventsAfter(eventId);
    this.shiftEventsLater(updatedEvents, nextEvents);

    const eventsToCompress = updatedEvents.filter((x) => x !== currentEvent);
    this.compressEvents(eventsToCompress, nextEvents);

    // update events
    updatedEvents.forEach((e) => this.updateEvent(e));

    return true;
  }

  getCurrentEvent(): GoogleAppsScript.Calendar.Schema.Event | null {
    const now = new Date().valueOf();
    const events = this.listEvents({});
    for (let i = 0; i < events.length; i++) {
      const start = new Date(events[i].start.dateTime).valueOf();
      const end = new Date(events[i].end.dateTime).valueOf();
      if (start <= now && now <= end) {
        return events[i];
      }
    }
    return null;
  }

  hasOverlappingEvents(
    events: GoogleAppsScript.Calendar.Schema.Event[]
  ): boolean {
    for (let i = 0; i < events.length - 1; i++) {
      const currentEnd = new Date(events[i].end.dateTime).valueOf();
      const nextStart = new Date(events[i + 1].start.dateTime).valueOf();
      if (currentEnd > nextStart) {
        this.log(
          "Overlapping events: " + stringifyEvents([events[i], events[i + 1]])
        );
        return true;
      }
    }
    return false;
  }

  /**
   * Start an event at a later time than its scheduled start time.
   * Shift and compress subsequent events to accommodate the delay.
   */
  startEventLate(startedEventId: string): boolean {
    const startedEvent = this.getEvent(startedEventId);
    var now = new Date();
    const rawScheduledStart = startedEvent.start?.dateTime;
    const rawScheduledEnd = startedEvent.end?.dateTime;
    if (!rawScheduledStart || !rawScheduledEnd) {
      return;
    }
    const scheduledStart = new Date(rawScheduledStart);
    const scheduledEnd = new Date(rawScheduledEnd);

    var startDelay = now.valueOf() - scheduledStart.valueOf();
    const nextEvents = this.listEventsAfter(startedEventId);
    if (this.hasOverlappingEvents([startedEvent, ...nextEvents])) {
      this.log("Overlapping events, cancelling late start");
      return false;
    }

    const updatedStartedEvent = startedEvent;
    updatedStartedEvent.start.dateTime = now.toISOString();
    const newEndTime = new Date(scheduledEnd.valueOf() + startDelay);
    updatedStartedEvent.end.dateTime = newEndTime.toISOString();

    // Shift then Compress

    const updatedEvents = [updatedStartedEvent];

    this.shiftEventsLater(updatedEvents, nextEvents);
    this.compressEvents(updatedEvents, nextEvents);

    // TODO: check for any overlaps / too short events

    // update events
    this.log(JSON.stringify({ updatedEvents }, null, 2));
    updatedEvents.forEach((e) => this.updateEvent(e));
    return true;
  }

  private shiftEventsEarlier(
    updatedEvents: GoogleAppsScript.Calendar.Schema.Event[],
    events: GoogleAppsScript.Calendar.Schema.Event[],
    shiftTime: number
  ) {
    for (let i = 0; i < events.length; i++) {
      const curEvent = events[i];
      if (shiftTime <= 0 || isFixed(curEvent)) {
        break;
      } else {
        const updatedCurEvent = curEvent;
        updatedCurEvent.start.dateTime = new Date(
          new Date(curEvent.start.dateTime).valueOf() - shiftTime
        ).toISOString();
        updatedCurEvent.end.dateTime = new Date(
          new Date(curEvent.end.dateTime).valueOf() - shiftTime
        ).toISOString();
        updatedEvents.push(updatedCurEvent);
      }
    }
  }

  /**
   * iterate over events and shift them forward if necessary
   */
  private shiftEventsLater(
    updatedEvents: GoogleAppsScript.Calendar.Schema.Event[],
    nextEvents: GoogleAppsScript.Calendar.Schema.Event[]
  ) {
    for (let i = 0; i < nextEvents.length; i++) {
      const prevEvent =
        i === 0 ? updatedEvents[updatedEvents.length - 1] : nextEvents[i - 1];
      const nextEvent = nextEvents[i];
      let shiftTime =
        new Date(prevEvent.end.dateTime).valueOf() -
        new Date(nextEvent.start.dateTime).valueOf();
      // shiftTime could be 0 if events are not back to back (there are free slots)
      if (shiftTime <= 0 || isFixed(nextEvent)) {
        break;
      } else {
        const updatedNextEvent = nextEvent;
        updatedNextEvent.start.dateTime = new Date(
          new Date(nextEvent.start.dateTime).valueOf() + shiftTime
        ).toISOString();
        updatedNextEvent.end.dateTime = new Date(
          new Date(nextEvent.end.dateTime).valueOf() + shiftTime
        ).toISOString();
        updatedEvents.push(updatedNextEvent);
      }
    }
  }

  /**
   * Compress by looking at the overlap between the final updated event and the next event (or end of day).
   * TODO: Updates in place.
   */
  private compressEvents(
    updatedEvents: GoogleAppsScript.Calendar.Schema.Event[],
    nextEvents: GoogleAppsScript.Calendar.Schema.Event[]
  ) {
    const lastUpdatedEvent = updatedEvents[updatedEvents.length - 1];
    const eventAfterLastUpdatedEvent =
      nextEvents[nextEvents.indexOf(lastUpdatedEvent) + 1];
    const totalOverlap =
      new Date(lastUpdatedEvent.end.dateTime).valueOf() -
      new Date(eventAfterLastUpdatedEvent.start.dateTime).valueOf();

    if (totalOverlap > 0) {
      // compression of event = fraction of overlap proportional to event length

      const totalUpdatedEventsLength = updatedEvents.reduce((acc, e) => {
        return (
          acc +
          new Date(e.end.dateTime).valueOf() -
          new Date(e.start.dateTime).valueOf()
        );
      }, 0);

      let prevEventEndTime: string | null = null;

      let remainingOverlap = totalOverlap;

      for (let i = 0; i < updatedEvents.length; i++) {
        const curEvent = updatedEvents[i];
        const length =
          new Date(curEvent.end.dateTime).valueOf() -
          new Date(curEvent.start.dateTime).valueOf();

        // to handle cases where the overlap doesn't divide evenly
        // among the events
        const compression =
          i === updatedEvents.length - 1
            ? remainingOverlap
            : (length / totalUpdatedEventsLength) * totalOverlap;
        // Calculate time since previous event's end time
        const minsSincePrev =
          prevEventEndTime === null
            ? 0
            : new Date(curEvent.start.dateTime).valueOf() -
              new Date(prevEventEndTime).valueOf();

        // Adjust the end time of the current event
        curEvent.end.dateTime = new Date(
          new Date(curEvent.end.dateTime).valueOf() -
            compression -
            minsSincePrev
        ).toISOString();

        if (prevEventEndTime != null) {
          curEvent.start.dateTime = new Date(
            new Date(prevEventEndTime).valueOf()
          ).toISOString();
        }
        prevEventEndTime = curEvent.end.dateTime;
        remainingOverlap -= compression;
      }
    }
  }

  listEventsAfter(eventId: string) {
    const event = this.getEvent(eventId);
    const rawScheduledStart = event.start?.dateTime;
    if (!rawScheduledStart) {
      return [];
    }
    var specifiedEventStartTime = new Date(rawScheduledStart);
    const endOfDay = new Date(
      specifiedEventStartTime.getFullYear(),
      specifiedEventStartTime.getMonth(),
      specifiedEventStartTime.getDate() + 1
    );
    return this.listEvents({
      timeMin: specifiedEventStartTime,
      timeMax: endOfDay,
    }).filter((e) => e.id !== eventId);
  }

  private concatEndOfDayEvent(
    events: GoogleAppsScript.Calendar.Schema.Event[]
  ) {
    const endOfDay = new Date();
    endOfDay.setHours(0, 0, 0, 0);
    endOfDay.setDate(endOfDay.getDate() + 1);
    const withEndOfDay = events.concat({
      description: "#fixed",
      start: { dateTime: endOfDay.toISOString() },
      end: { dateTime: endOfDay.toISOString() },
    });
    withEndOfDay.sort((a, b) => {
      return (
        new Date(a.start.dateTime).getTime() -
        new Date(b.start.dateTime).getTime()
      );
    });
    return withEndOfDay;
  }

  listAllOfTodaysEvents(): GoogleAppsScript.Calendar.Schema.Event[] {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    return this.listEvents({
      timeMin: startOfDay,
      timeMax: endOfDay,
    });
  }

  getEvent(eventId: string) {
    try {
      return this.mock
        ? this.mock.find((e) => e.id === eventId)
        : Calendar.Events.get("primary", eventId);
    } catch (e) {
      return null;
    }
  }

  listEvents(args: {
    timeMin?: Date;
    timeMax?: Date;
  }): GoogleAppsScript.Calendar.Schema.Event[] {
    function filterAndSortEvents(es: GoogleAppsScript.Calendar.Schema.Event[]) {
      return es
        .filter((e) => {
          const start = new Date(e.start.dateTime);
          return (
            (args.timeMin ? start.valueOf() >= args.timeMin.valueOf() : true) &&
            (args.timeMax ? start.valueOf() <= args.timeMax.valueOf() : true)
          );
        })
        .sort((a, b) => {
          return (
            new Date(a.start.dateTime).getTime() -
            new Date(b.start.dateTime).getTime()
          );
        });
    }

    if (!this.mock) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(0, 0, 0, 0);
      endOfDay.setDate(endOfDay.getDate() + 1);
      let opts = {
        timeMin: (args.timeMin || startOfDay).toISOString(),
        timeMax: (args.timeMax || endOfDay).toISOString(),
        singleEvents: true,
        showDeleted: false,
      };
      var res = Calendar.Events.list("primary", opts);
      const events = filterAndSortEvents(res.items || []);
      return this.concatEndOfDayEvent(events);
    } else {
      const events = filterAndSortEvents(this.mock);
      return this.concatEndOfDayEvent(events);
    }
  }

  updateEvent(updatedEvent: GoogleAppsScript.Calendar.Schema.Event) {
    if (!this.mock) {
      return Calendar.Events.update(updatedEvent, "primary", updatedEvent.id);
    } else {
      const index = this.mock.indexOf(updatedEvent);
      this.mock[index] = updatedEvent;
      return updatedEvent;
    }
  }

  deleteEvent(eventId: string) {
    if (!this.mock) {
      return Calendar.Events.remove("primary", eventId);
    } else {
      const index = this.mock.findIndex((e) => e.id === eventId);
      this.mock.splice(index, 1);
    }
  }
}

// Utility function to determine if an event is flexible
function isEventFlexible(event) {
  // Check if the event has guests
  var hasNoGuests = !event.attendees || event.attendees.length === 0;

  // Check if the description does not contain the word "fixed"
  var description = event.description || "";
  var doesNotContainFixed = !description.toLowerCase().includes("fixed");

  // The event is flexible if it has no guests and does not contain 'fixed' in the description
  return hasNoGuests && doesNotContainFixed;
}

function insertInterruptionCallback(e: any) {
  const cal = new Cal();
  const interruptionName = e.formInputs.interruptionName;
  const interruptionLength = parseInt(e.formInputs.interruptionLength);
  cal.insertInterruption(interruptionName, interruptionLength);
}

function insertInterruption() {
  // show text inputs to get the interruption name and length
  var interruptionName = CardService.newTextInput()
    .setFieldName("interruptionName")
    .setTitle("Interruption Name");

  var interruptionLength = CardService.newTextInput()
    .setFieldName("interruptionLength")
    .setTitle("Interruption Length (minutes)");

  var section = CardService.newCardSection()
    .addWidget(interruptionName)
    .addWidget(interruptionLength);

  var action = CardService.newAction()
    .setFunctionName("insertInterruptionCallback")
    .setParameters({});

  const button = CardService.newTextButton()
    .setText("Submit")
    .setOnClickAction(action);

  const card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("Insert Interruption"))
    .addSection(section)
    .addSection(CardService.newCardSection().addWidget(button))
    .build();

  return card;
}

function onHomepageOpened(e: any) {
  var button = CardService.newTextButton()
    .setText("Insert Interruption")
    .setOnClickAction(
      CardService.newAction().setFunctionName("insertInterruption")
    );

  var section = CardService.newCardSection().addWidget(button);
  return CardService.newCardBuilder().addSection(section).build();
}

function isFixed(e: GoogleAppsScript.Calendar.Schema.Event) {
  return e.description?.includes("#fixed");
}

function deleteEvent(e: {
  parameters: { calendarId: string; eventId: string };
}) {
  const cal = new Cal();
  var eventId = e.parameters.eventId;
  cal.deleteEvent(eventId);

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("Event Deleted"))
    .addSection(
      CardService.newCardSection().addWidget(
        CardService.newTextParagraph().setText("Event deleted.")
      )
    )
    .build();
}

function stretchEvent(e: {
  parameters: { calendarId: string; eventId: string };
}) {
  const cal = new Cal();
  var eventId = e.parameters.eventId;
  cal.stretchToNextEvent(eventId);

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("Event Updated"))
    .addSection(
      CardService.newCardSection().addWidget(
        CardService.newTextParagraph().setText("Event stretched to next event.")
      )
    )
    .build();
}

// Callback function for the button
function startEvent(e: {
  parameters: { calendarId: string; eventId: string };
}) {
  const cal = new Cal();
  var eventId = e.parameters.eventId;
  cal.startEvent(eventId);

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("Event Updated"))
    .addSection(
      CardService.newCardSection().addWidget(
        CardService.newTextParagraph().setText("Event marked as started.")
      )
    )
    .build();
}

function formatHHMM(date: Date) {
  return date.toISOString().slice(11, 16);
}

function onEventOpened(e) {
  var calendarId = e.calendar.calendarId; // Or 'primary' if you always want the primary calendar
  var eventId = e.calendar.id;
  var event = new Cal().getEvent(eventId);
  if (!event) {
    return CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader().setTitle("Event not found"))
      .build();
  }

  var card = CardService.newCardBuilder();

  var section = CardService.newCardSection();
  section.addWidget(
    CardService.newTextParagraph().setText(event.summary || "(No title)")
  );

  // Assuming event.start.dateTime and event.end.dateTime are defined and valid
  var startTime = new Date(event.start.dateTime);
  var endTime = new Date(event.end.dateTime);

  // Calculate event duration in milliseconds
  var durationMillis = endTime.valueOf() - startTime.valueOf();

  // Convert duration to hours and minutes
  var lengthHours = Math.floor(durationMillis / (1000 * 60 * 60));
  var lengthMinutes = Math.floor(
    (durationMillis % (1000 * 60 * 60)) / (1000 * 60)
  );

  // Format and add to card section
  section.addWidget(
    CardService.newTextParagraph().setText(
      formatHHMM(startTime) +
        " - " +
        formatHHMM(endTime) +
        " (" +
        lengthHours.toString() +
        " hrs " +
        lengthMinutes.toString() +
        " mins" +
        ")"
    )
  );
  section.addWidget(
    CardService.newTextParagraph().setText(
      event.start.dateTime + " - " + event.end.dateTime
    )
  );

  // event decsription
  if (event.description) {
    section.addWidget(
      CardService.newTextParagraph().setText(
        "Description:\n" + event.description
      )
    );
  }

  // Button to mark the event as started
  var startButton = CardService.newTextButton()
    .setText("Start")
    .setOnClickAction(
      CardService.newAction()
        .setFunctionName("startEvent")
        .setParameters({ calendarId: calendarId, eventId: eventId })
    );

  const deleteButton = CardService.newTextButton()
    .setText("Delete")
    .setOnClickAction(
      CardService.newAction()
        .setFunctionName("deleteEvent")
        .setParameters({ calendarId: calendarId, eventId: eventId })
    );

  const stretchButton = CardService.newTextButton()
    .setText("Stretch")
    .setOnClickAction(
      CardService.newAction()
        .setFunctionName("stretchEvent")
        .setParameters({ calendarId: calendarId, eventId: eventId })
    );

  var buttonSet = CardService.newButtonSet()
    .addButton(startButton)
    .addButton(stretchButton);

  section.addWidget(buttonSet);

  section.addWidget(CardService.newTextParagraph().setText("\n"));

  section.addWidget(deleteButton);

  card.addSection(section);

  return card.build();
}

function stringifyEvents(events: GoogleAppsScript.Calendar.Schema.Event[]) {
  return events
    .map((e) => {
      return `${e.summary} ${e.start.dateTime} ${e.end.dateTime}`;
    })
    .join("\n");
}
