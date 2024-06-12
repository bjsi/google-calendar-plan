# Google Calendar Plan

A Google Calendar addon that integrates ideas from SuperMemo's Plan.

## Features

- A basic UI built directly into Google Calendar as a workspace addon.
- Start events early or late and compress or stretch activities to accommodate.
- Additional features not in SuperMemo's Plan like easily inserting interruptions.

## How to Use

1. Install the addon
2. Open Google Calendar
3. Click on the addon icon in the right sidebar
4. Click on events to open the event details panel
5. Press the buttons.

### Bugs and other limitations

- There is a delay between the time you press the button and the time the event is actually moved. This is because the addon has to make a request to the Google Calendar API to move the event. This delay can be up to 10 seconds!
- [Short events display as overlapping even though they aren't actually overlapping in terms of start and end times](https://support.google.com/calendar/thread/116152493/seamless-events-that-begin-as-others-end-are-displaying-inconsistently?hl=en)

## Developers

- Feel free to reuse this project's event manipulation functions in your own projects. They are the trickiest part of cloning SuperMemo's plan.
- We could collaborate on a better version of this project with its own UI instead of being a Google workspace addon.
