# Requirements Document

## Introduction

The Expense and Budget Visualizer is a client-side web application that allows users to track personal expenses by category, view a running total balance, and visualize spending distribution through an interactive pie chart. The application requires no backend server, stores all data in the browser's Local Storage, and runs as a standalone HTML/CSS/JavaScript application compatible with modern browsers.

## Glossary

- **App**: The Expense and Budget Visualizer web application
- **Transaction**: A single expense entry consisting of an item name, a monetary amount, and a category
- **Category**: One of three predefined labels used to classify transactions — Food, Transport, or Fun
- **Transaction_List**: The scrollable UI component that displays all recorded transactions
- **Input_Form**: The HTML form component used to capture item name, amount, and category before adding a transaction
- **Balance_Display**: The UI component at the top of the App that shows the total sum of all transaction amounts
- **Chart**: The pie chart component that visualizes the spending distribution across categories
- **Local_Storage**: The browser's Web Storage API used to persist transaction data client-side
- **Validator**: The client-side logic responsible for verifying that all required form fields contain valid values before a transaction is submitted

---

## Requirements

### Requirement 1: Transaction Entry via Input Form

**User Story:** As a user, I want to fill in a form with an item name, amount, and category so that I can record a new expense transaction.

#### Acceptance Criteria

1. THE Input_Form SHALL provide a text field for the item name accepting up to 100 characters, a numeric field for the amount, and a dropdown selector for the category.
2. THE Input_Form SHALL present exactly three category options: Food, Transport, and Fun.
3. WHEN the user submits the Input_Form, THE Validator SHALL verify that the item name field is not empty, the amount field contains a numeric value between 0.01 and 999,999,999.99 inclusive, and a category has been selected.
4. IF the Validator detects that any required field is empty, exceeds its allowed bounds, or contains an invalid value, THEN THE Input_Form SHALL display an inline error message identifying each failing field and SHALL NOT add a transaction.
5. WHEN all fields pass validation, THE App SHALL add a new Transaction to the Transaction_List and SHALL reset the item name and amount fields to empty and the category dropdown to its unselected placeholder state.

---

### Requirement 2: Transaction List Display

**User Story:** As a user, I want to see a scrollable list of all my recorded transactions so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display all recorded transactions ordered by the date and time they were added, with ties broken by showing the most recently created transaction first.
2. THE Transaction_List SHALL render each transaction as a row showing: the item name truncated with an ellipsis if it exceeds 40 characters, the monetary amount formatted to two decimal places with a leading minus sign for expense amounts and no sign for income amounts, and the category label.
3. WHILE the number of transactions exceeds the visible area of the Transaction_List, THE Transaction_List SHALL remain scrollable without clipping or hiding any transaction row.
4. WHEN no transactions have been recorded, THE Transaction_List SHALL display a placeholder message indicating that no transactions exist.

---

### Requirement 3: Transaction Deletion

**User Story:** As a user, I want to delete individual transactions from the list so that I can correct mistakes or remove outdated entries.

#### Acceptance Criteria

1. THE Transaction_List SHALL render a delete control for each transaction row.
2. WHEN the user activates the delete control for a transaction, THE App SHALL remove that transaction from the Transaction_List and persist the deletion to the data store.
3. IF the data store fails to persist the deletion, THEN THE App SHALL display an error message indicating the deletion failed and retain the transaction in the Transaction_List.
4. WHEN a transaction is deleted, THE Balance_Display SHALL update to reflect the recalculated total within 300ms.
5. WHEN a transaction is deleted, THE Chart SHALL update to reflect the new category distribution within 300ms.

---

### Requirement 4: Total Balance Display

**User Story:** As a user, I want to see my total balance prominently at the top of the page so that I always know the cumulative amount I have spent.

#### Acceptance Criteria

1. THE Balance_Display SHALL appear at the top of the App and SHALL show the sum of all transaction amounts formatted as a currency value with a currency symbol prefix and exactly two decimal places.
2. WHEN a new transaction is added, THE Balance_Display SHALL update within one rendering frame without requiring a page reload.
3. WHEN a transaction is deleted, THE Balance_Display SHALL update within one rendering frame without requiring a page reload.
4. WHEN a transaction amount is edited, THE Balance_Display SHALL update within one rendering frame without requiring a page reload.
5. WHILE no transactions exist, THE Balance_Display SHALL show a value of 0.00.
6. IF the computed balance is negative, THEN THE Balance_Display SHALL show the value prefixed with a minus sign (e.g. -$10.00).

---

### Requirement 5: Pie Chart Visualization

**User Story:** As a user, I want to see a pie chart of my spending by category so that I can understand how my money is distributed across Food, Transport, and Fun.

#### Acceptance Criteria

1. THE Chart SHALL display a pie chart where each slice's arc angle is proportional to that category's total spending divided by the sum of all transaction amounts, rounded to two decimal places.
2. THE Chart SHALL render a visually distinct, fixed color for each of the three categories: Food, Transport, and Fun, such that no two categories share the same color.
3. THE Chart SHALL include a legend that maps each category's color to its corresponding category label, displaying all three categories regardless of whether they have spending data.
4. WHEN a transaction is added, THE Chart SHALL re-render within one rendering frame to reflect the updated category totals.
5. WHEN a transaction is deleted, THE Chart SHALL re-render within one rendering frame to reflect the updated category totals.
6. WHILE no transactions exist, THE Chart SHALL display a placeholder state replacing the pie chart and legend with a message indicating no data is available.
7. IF a category has a total spending of zero while other categories have non-zero totals, THEN THE Chart SHALL exclude that category's slice from the pie chart while retaining its entry in the legend.

---

### Requirement 6: Data Persistence via Local Storage

**User Story:** As a user, I want my transaction data to be saved automatically so that my records are not lost when I close or refresh the browser.

#### Acceptance Criteria

1. WHEN a transaction is added, THE App SHALL write the complete Transaction_List to Local_Storage before the operation is considered complete.
2. WHEN a transaction is deleted, THE App SHALL write the updated Transaction_List to Local_Storage before the operation is considered complete.
3. WHEN the App initializes, THE App SHALL read the Transaction_List from Local_Storage and SHALL restore all previously saved transactions within 500ms of page load.
4. IF Local_Storage is unavailable or returns a parse error on initialization, THEN THE App SHALL initialize with an empty Transaction_List and SHALL display a non-blocking warning message indicating that saved data could not be loaded.
5. IF a Local_Storage write fails after adding or deleting a transaction, THEN THE App SHALL retain the transaction change in memory and display a non-blocking warning message indicating that the change could not be saved persistently.
6. THE App SHALL not store more than 1000 transactions in Local_Storage; IF the Transaction_List reaches 1000 entries, THEN THE App SHALL reject new transaction additions and notify the user that the storage limit has been reached.

---

### Requirement 7: Single-File Structure and Compatibility

**User Story:** As a user, I want the application to run directly in any modern browser without installation or configuration so that I can use it immediately after opening the file.

#### Acceptance Criteria

1. THE App SHALL be delivered as a single entry-point HTML file that references exactly one CSS file located in a `css/` directory and exactly one JavaScript file located in a `js/` directory.
2. THE App SHALL function correctly in the current stable releases of Chrome, Firefox, Edge, and Safari without requiring a build step or server.
3. THE App SHALL load and render the initial UI in under 2 seconds on a device with a mid-range CPU released within the last 5 years and an SSD, measured from a local file load with an empty cache.
4. WHERE the App is used as a browser extension, THE App SHALL load Chart.js exclusively from a CDN and SHALL make no other external network requests during initialization or runtime.
5. IF the CDN request for Chart.js fails, THEN THE App SHALL display a non-blocking warning indicating the chart is unavailable and SHALL continue to function for transaction entry, display, and persistence.

---

### Requirement 8: Input Validation and Data Integrity

**User Story:** As a user, I want the application to prevent invalid data entry so that my transaction records remain accurate and consistent.

#### Acceptance Criteria

1. THE Validator SHALL reject any transaction where the item name contains only whitespace characters or exceeds 100 characters in length.
2. THE Validator SHALL reject any transaction where the amount is zero, negative, non-numeric, or exceeds 999,999,999.99.
3. THE Validator SHALL reject any transaction where the selected category is not one of the three defined values: Food, Transport, or Fun.
4. WHEN the Validator rejects a transaction, THE Input_Form SHALL preserve the values the user entered so that the user can correct only the invalid field without re-entering valid data.
5. IF the Validator rejects a transaction, THEN THE Input_Form SHALL display an error message indicating which field failed validation and why, adjacent to the invalid field.
