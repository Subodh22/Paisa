Product Requirements Document (PRD): Cashflow Calendar
1. Overview
Problem: Individuals want a simple, visual way to monitor cashflow across the month, including paydays and recurring bills.
Solution: A calendar-centric web app showing daily and running balances, with support for manual entries, recurring rules, CSV import, and Open Banking integration (Basiq) for automated transaction sync.
2. Objectives and Success Metrics
Objectives:
Visualize cashflow per day and cumulative running balance.
Minimize manual data entry via recurring rules and imports.
Enable bank connectivity compliant with AU Open Banking (via Basiq).
Success Metrics:
Time-to-setup < 10 minutes (from new user to populated calendar).
≥80% of transactions auto-categorized or correctly inferred.
<2s monthly calendar render on typical device.
<30s for initial 90-day bank import.
3. Target Users and Personas
Everyday Budgeter: Needs a quick view of when pay hits and bills are due.
Freelancer/Contractor: Irregular income; wants cash runway visibility.
Power User: Wants automated sync via bank connection and export/backup.
4. Scope
In Scope:
Calendar view by month with daily transactions and running balance.
Manual add/edit/delete of income/expenses.
Recurring rules (weekly/fortnightly/monthly).
Starting balance per month.
CSV import/export (JSON backup).
Bank connection via Basiq (read-only) with consent flow and 90-day fetch.
Local persistence (for standalone mode); backend for bank proxy.
Out of Scope (v1):
Multi-currency handling.
Shared accounts/multi-user collaboration.
Bill pay or money movement.
Advanced analytics (cashflow projections beyond visible month).
5. Key Features and Requirements
5.1 Calendar and Transactions
Render monthly grid with days aligned to weekdays.
Each day:
Show day number, add income/expense (+ / -).
List transactions (note, amount, sign/color based on type).
Daily delta and end-of-day running balance.
Month header: month navigation, Today button, starting balance field, import/export controls, Basiq controls.
5.2 Recurring Rules
Frequencies: weekly (by weekday), fortnightly (anchor on start date every 14 days), monthly (specific day 1–31 with clamping end-of-month).
Fields: type (income/expense), amount, note, frequency, start date, optional end date, weekday/dayOfMonth as applicable.
Recurring rules list with edit/delete; occurrences appear on the calendar but are editable only via rule (no one-off edit in v1).
 
5.4 Bank Integration (Basiq)
Read-only:
Create Basiq user.
Establish connection/consent (CDR) and list institutions (optionally filter to CommBank).
Fetch transactions (e.g., last 90 days) and import into app.
Backend proxy:
Securely store API key server-side.
Rate limiting and error handling.
Consent experience:
Redirect to provider consent; display status; allow re-sync.
Permissions (Basiq permission set):
users: create/get/delete
connections: create/get/list/delete, jobs:get
institutions: list (optional)
accounts: list/get
accounts.balances: list (optional)
transactions: list
webhooks: create/get (optional)
categories/enrichment read (optional)
5.5 Data Persistence
Standalone mode: browser localStorage.
Connected mode: localStorage for UI state, server for bank calls (no PII at rest beyond what is necessary for sync unless user opts-in to store data server-side).
6. Non-Functional Requirements
Performance: render a month with up to 400 transactions in <2 seconds.
Accessibility: keyboard navigable actions, semantic HTML, aria labels on controls and dialog.
Security:
API keys never exposed client-side.
HTTPS enforced in hosted environments.
Least-privilege permission sets with Basiq.
Privacy:
Explicit user consent for bank connections.
Clear data retention policy; allow local-only usage.
7. UX Flows
First-time setup:
Pick month or use current.
Set starting balance.
Add recurring rules for pay and bills (optional).
Import CSV or connect to bank (optional).
Adding a transaction:
Click day’s + or -, fill dialog (type, amount, note, date), save.
Recurring rule:
Go to Recurring tab, create rule; occurrences appear automatically each month.
Bank connect:
Click “Connect (Basiq)” → consent flow → return and store userId → “Fetch (90d)” → imported into calendar.
Backup:
Click Export JSON; later can re-import by JSON (future enhancement).