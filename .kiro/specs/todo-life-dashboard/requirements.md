# Requirements Document

## Introduction

The To-Do List Life Dashboard is a client-side web application that serves as a personal productivity homepage. It provides users with a live clock and greeting, a customizable Pomodoro focus timer, a persistent to-do list, and a quick-links panel — all stored in the browser's Local Storage with no backend required. The application is built with plain HTML, CSS, and Vanilla JavaScript, and supports both light and dark visual themes.

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **User**: A person who opens the Dashboard in a modern web browser.
- **Clock**: The live display showing the current time and date.
- **Greeting**: A time-sensitive welcome message that addresses the User by name.
- **Custom_Name**: A user-defined display name stored in Local Storage and shown in the Greeting.
- **Focus_Timer**: A countdown timer based on the Pomodoro technique, with a configurable duration.
- **Timer_Duration**: The number of minutes set for the Focus_Timer session (default: 25 minutes).
- **Task**: A single to-do item with a text description and a completion state.
- **Task_List**: The ordered collection of all Tasks managed by the Dashboard.
- **Quick_Link**: A saved URL and label pair that opens a website in a new browser tab.
- **Local_Storage**: The browser's `localStorage` API used to persist all user data client-side.
- **Theme**: The active visual mode of the Dashboard — either Light or Dark.
- **Storage_Manager**: The internal module responsible for reading and writing all data to Local Storage.
- **Renderer**: The internal module responsible for updating the DOM to reflect current application state.

---

## Requirements

### Requirement 1: Live Clock and Date Display

**User Story:** As a User, I want to see the current time and date on the Dashboard, so that I can stay aware of the time without switching tabs.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Clock SHALL display the current time in HH:MM:SS 24-hour format using the user's local timezone.
2. WHILE the Dashboard is open, THE Clock SHALL update the displayed time every 1 second without requiring a page refresh.
3. WHEN the Dashboard loads, THE Clock SHALL display the current date showing the full weekday name, day number, full month name, and 4-digit year (e.g., "Monday, 19 October 2026").
4. IF the system clock changes (e.g., daylight saving adjustment), THEN THE Clock SHALL reflect the updated time within 1 second of the change.
5. WHEN the browser tab regains focus after being backgrounded, THE Clock SHALL immediately re-synchronize to the current system time and resume updating every 1 second.

---

### Requirement 2: Personalized Greeting

**User Story:** As a User, I want to see a greeting that uses my name and reflects the time of day, so that the Dashboard feels personal and contextually relevant.

#### Acceptance Criteria

1. WHEN the Dashboard loads and no Custom_Name is stored, THE Greeting SHALL display the text "Good [time-of-day prefix], Friend" using the appropriate time-of-day prefix.
2. WHEN the Dashboard loads and a Custom_Name is stored in Local_Storage, THE Greeting SHALL display the Custom_Name in place of "Friend".
3. WHILE the current local time is between 05:00 and 11:59, THE Greeting SHALL display the prefix "Good Morning".
4. WHILE the current local time is between 12:00 and 17:59, THE Greeting SHALL display the prefix "Good Afternoon".
5. WHILE the current local time is between 18:00 and 21:59, THE Greeting SHALL display the prefix "Good Evening".
6. WHILE the current local time is between 22:00 and 04:59, THE Greeting SHALL display the prefix "Good Night".
7. WHEN the User submits a new Custom_Name by pressing Enter or clicking the confirm button in the name input field, THE Storage_Manager SHALL save the Custom_Name to Local_Storage.
8. WHEN the Storage_Manager successfully saves the Custom_Name, THE Greeting SHALL update to display the new Custom_Name without a page reload.
9. IF the User submits an empty or whitespace-only value as Custom_Name, THEN THE Greeting SHALL revert to displaying "Friend" as the placeholder and THE Storage_Manager SHALL remove any previously stored Custom_Name from Local_Storage.
10. THE Custom_Name SHALL be no more than 50 characters in length; IF the input exceeds 50 characters, THEN THE name input field SHALL prevent entry beyond 50 characters.

---

### Requirement 3: Focus Timer (Pomodoro)

**User Story:** As a User, I want a configurable countdown timer with start, stop, and reset controls, so that I can manage focused work sessions.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Focus_Timer SHALL display the Timer_Duration in MM:SS format with seconds set to 00.
2. WHEN the Dashboard loads and no Timer_Duration is stored, THE Focus_Timer SHALL default to a Timer_Duration of 25 minutes.
3. WHEN the Dashboard loads and a Timer_Duration is stored in Local_Storage, THE Focus_Timer SHALL restore that Timer_Duration.
4. WHEN the User presses the Start button and the Focus_Timer is not running, THE Focus_Timer SHALL begin counting down once per second.
5. WHEN the Focus_Timer is counting down and the User presses the Stop button, THE Focus_Timer SHALL pause the countdown and retain the remaining time.
6. WHEN the User presses the Reset button, THE Focus_Timer SHALL stop counting down and restore the display to the current Timer_Duration.
7. WHEN the Focus_Timer countdown reaches 00:00, THE Focus_Timer SHALL stop automatically and play an audible audio cue to notify the User.
8. WHILE the Focus_Timer is counting down and the User presses the Start button, THE Focus_Timer SHALL ignore the input and continue counting down without interruption.
9. WHEN the User confirms a new Timer_Duration via the duration input field and the value is between 1 and 120 minutes, THE Storage_Manager SHALL save the new Timer_Duration to Local_Storage.
10. WHEN the User confirms a new Timer_Duration via the duration input field and the value is between 1 and 120 minutes, THE Focus_Timer SHALL reset to display the new Timer_Duration.
11. IF the User confirms a Timer_Duration outside the range of 1 to 120 minutes, THEN THE Focus_Timer SHALL display a validation message indicating the allowed range and retain the previous Timer_Duration until a valid value is confirmed.

---

### Requirement 4: To-Do List Management

**User Story:** As a User, I want to add, edit, complete, and delete tasks that persist across sessions, so that I can track my daily work without losing data on refresh.

#### Acceptance Criteria

1. WHEN the User submits text in the task input field, THE Task_List SHALL add a new Task with the submitted text (1–200 characters) and a completion state of false.
2. IF the User submits an empty or whitespace-only string as a task, THEN THE Task_List SHALL not add a Task and SHALL display an inline validation message.
3. WHEN the User clicks the complete button on a Task, THE Task_List SHALL toggle the completion state of that Task.
4. WHEN the completion state of a Task is toggled to true, THE Renderer SHALL apply a strikethrough style to the Task text and reduce the opacity of the Task row.
5. WHEN the User clicks the edit button on a Task, THE Renderer SHALL display the Task text in an editable inline field with a confirm button and a cancel button.
6. WHEN the User confirms an edit and the updated text is non-empty and at most 200 characters, THE Task_List SHALL update the Task text, THE Renderer SHALL close the inline edit field and display the updated text, and THE Storage_Manager SHALL persist the change to Local_Storage.
7. IF the User confirms an edit with empty or whitespace-only text, THEN THE Task_List SHALL retain the original Task text unchanged and THE Renderer SHALL close the inline edit field displaying the original text.
8. WHEN the User clicks the cancel button during an edit, THE Renderer SHALL close the inline edit field and display the original Task text unchanged.
9. WHEN the User clicks the delete button on a Task, THE Task_List SHALL remove that Task and THE Storage_Manager SHALL persist the updated Task_List to Local_Storage.
10. WHEN the Dashboard loads, THE Storage_Manager SHALL read all Tasks from Local_Storage and THE Renderer SHALL display them in the order they were saved.
11. WHEN any Task is added, edited, completed, or deleted, THE Storage_Manager SHALL write the full Task_List to Local_Storage before the next user interaction is processed.
12. IF a write operation to Local_Storage fails when saving the Task_List, THEN THE Dashboard SHALL display an error message and retain the current in-memory Task_List state for the remainder of the session.

---

### Requirement 5: Quick Links Panel

**User Story:** As a User, I want to save and open links to my favorite websites directly from the Dashboard, so that I can navigate quickly without typing URLs.

#### Acceptance Criteria

1. WHEN the User submits an add-link form with a non-empty label of at most 50 characters and a URL beginning with "http://" or "https://" of at most 2048 characters, THE Quick_Link SHALL be appended to the links panel.
2. WHEN the User submits an add-link form with a non-empty label of at most 50 characters and a URL beginning with "http://" or "https://" of at most 2048 characters, THE Storage_Manager SHALL persist the updated Quick_Links list to Local_Storage.
3. IF the User submits an add-link form with an empty label, a label exceeding 50 characters, an empty URL field, or a URL exceeding 2048 characters, THEN THE Dashboard SHALL display an inline validation message adjacent to the offending field and SHALL NOT add the Quick_Link.
4. IF the User submits a URL that does not begin with "http://" or "https://", THEN THE Dashboard SHALL display an inline validation message adjacent to the URL field and SHALL NOT add the Quick_Link.
5. IF the Quick_Links panel already contains 20 Quick_Links, THEN THE Dashboard SHALL display an inline message indicating the maximum limit has been reached and SHALL NOT add the Quick_Link.
6. WHEN the User clicks a Quick_Link button, THE Dashboard SHALL open the associated URL in a new browser tab.
7. WHEN the User clicks the delete button on a Quick_Link, THE Dashboard SHALL remove that Quick_Link from the links panel.
8. WHEN the User clicks the delete button on a Quick_Link, THE Storage_Manager SHALL persist the updated Quick_Links list to Local_Storage.
9. WHEN the Dashboard loads and Local_Storage contains persisted Quick_Links, THE Storage_Manager SHALL read all Quick_Links from Local_Storage and THE Renderer SHALL display them in the order they were saved.
10. IF Local_Storage is unavailable when the Dashboard loads, THEN THE Dashboard SHALL display an empty Quick_Links panel and SHALL display an error message indicating links cannot be saved in this session.

---

### Requirement 6: Light / Dark Theme Toggle

**User Story:** As a User, I want to switch between a light and dark visual theme, so that I can use the Dashboard comfortably in different lighting conditions.

#### Acceptance Criteria

1. WHEN the Dashboard loads and no Theme preference is stored, THE Dashboard SHALL render in Light theme by default.
2. WHEN the Dashboard loads and a Theme preference is stored in Local_Storage, THE Dashboard SHALL render in that stored Theme.
3. WHEN the User clicks the theme toggle control, THE Renderer SHALL switch the active Theme to the opposite of the currently active Theme.
4. WHEN the User clicks the theme toggle control, THE Storage_Manager SHALL persist the new Theme preference to Local_Storage.
5. WHILE the Dark theme is active, THE Dashboard SHALL apply a background and text color combination across all panels that meets a minimum contrast ratio of 4.5:1 between text and background, with the background being the darker of the two colors.
6. WHILE the Light theme is active, THE Dashboard SHALL apply a background and text color combination across all panels that meets a minimum contrast ratio of 4.5:1 between text and background, with the background being the lighter of the two colors.
7. WHEN the Theme changes, THE Renderer SHALL apply the new styles across all panels within 300 milliseconds without a page reload.
8. IF Local_Storage is unavailable or the Theme preference write operation fails, THEN THE Storage_Manager SHALL still apply the new Theme visually for the current session and display an error indication to the User.

---

### Requirement 7: Data Persistence via Local Storage

**User Story:** As a User, I want all my settings and data to survive a page refresh, so that I never lose my tasks, links, or preferences.

#### Acceptance Criteria

1. THE Storage_Manager SHALL store Task_List data, Quick_Links data, Custom_Name, Timer_Duration, and Theme preference as serialized JSON in separate Local_Storage keys.
2. WHEN the Dashboard loads, THE Storage_Manager SHALL read all persisted data from Local_Storage before THE Renderer displays any content.
3. IF Local_Storage is unavailable or a read operation for a Local_Storage key returns malformed JSON, THEN THE Storage_Manager SHALL fall back to that key's default value (empty list for Task_List and Quick_Links, empty string for Custom_Name, 25 minutes for Timer_Duration, and light for Theme) and THE Dashboard SHALL render using those default values without displaying an error state.
4. IF a write operation to Local_Storage fails, THEN THE Dashboard SHALL display a non-blocking warning message to the User indicating that data may not be saved, and the warning SHALL remain visible until dismissed by the User or for a maximum of 5 seconds, whichever comes first.
5. WHEN any Task_List data, Quick_Links data, Custom_Name, Timer_Duration, or Theme preference is modified, THE Storage_Manager SHALL immediately write the updated value to its corresponding Local_Storage key before the next user interaction is accepted.

---

### Requirement 8: Responsive Layout and Browser Compatibility

**User Story:** As a User, I want the Dashboard to look good and work correctly on different screen sizes and modern browsers, so that I can use it on any device.

#### Acceptance Criteria

1. THE Dashboard SHALL render correctly and remain fully functional in the latest stable versions of Chrome, Firefox, Edge, and Safari.
2. WHEN the viewport width is 768 pixels or wider, THE Dashboard SHALL display panels in a multi-column grid layout with a minimum of 2 columns.
3. WHEN the viewport width is below 768 pixels, THE Dashboard SHALL display panels in a single-column stacked layout where each panel occupies 100% of the viewport width.
4. WHEN the viewport width changes between below 768 pixels and 768 pixels or wider, THE Dashboard SHALL switch between single-column and multi-column layouts without requiring a page reload.
5. THE Dashboard SHALL use a single CSS file located at `css/style.css` and a single JavaScript file located at `js/app.js`.
6. THE Dashboard SHALL load and render all visible content within 3 seconds on a standard broadband connection of 25 Mbps or faster.
7. IF any layout panel fails to render within 3 seconds on a standard broadband connection, THEN THE Dashboard SHALL display a loading indicator in place of the unrendered panel.
