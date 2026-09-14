# Workflow Notes

This note explains how the two n8n workflows work for the client intake and onboarding process.

## Workflow A: Lead Captured

### Purpose
Workflow A handles a new lead when the person submits the form.

### Flow
1. **Typeform Webhook**
   - Receives the form submission.
   - Starts the workflow with the lead's data.

2. **Edit Fields**
   - Cleans and standardizes the incoming data.
   - Makes the fields easier to use in later nodes.

3. **Create Record**
   - Creates a new lead record in Airtable.
   - Stores key details like name, email, and source.

4. **Send Lead Details to Team**
   - Sends an internal alert to the team in Slack and/or email.
   - Lets the team know a new lead came in.

5. **Send Lead Email**
   - Sends a confirmation or follow-up email to the lead.
   - Thanks them for reaching out and keeps communication moving.

### Output
Workflow A creates the lead record, notifies the team, and sends the lead an email.

---

## Workflow B: Booking Confirmed

### Purpose
Workflow B handles the lead after they book a meeting in Calendly.

### Flow
1. **Calendly Trigger**
   - Fires when the lead books a meeting.
   - Sends booking information into the workflow.

2. **Edit Fields1**
   - Normalizes the booking data.
   - Pulls out values like booking time, meeting link, and email.

3. **Search records**
   - Finds the matching lead in Airtable.
   - Uses the lead's email or another unique field.

4. **If**
   - Checks that the lead exists and meets the required condition.
   - Confirms the workflow should continue.

5. **Update record**
   - Updates the lead status to something like `Booked`.
   - Stores the booking details on the lead record.

6. **Create record for Client Onboarding**
   - Creates a new onboarding/project record.
   - Links the new record back to the lead.
   - Stores fields like client name, status, booking time, and meeting link.

7. **Create record for Tasks**
   - Creates onboarding tasks for the team.
   - Links each task to the onboarding project.
   - Can include assignee, task name, status, and date.

8. **Send onboarding email**
   - Sends the client a booking confirmation or onboarding message.
   - Confirms the next step and sets expectations.

9. **Send internal notification**
   - Alerts the team that onboarding has started.
   - Helps the team prepare for the meeting and follow-up work.

### Output
Workflow B updates the CRM, creates the onboarding record, creates tasks, and sends both the client and the team a message.

---

## Simple Summary

- **Workflow A** = new lead comes in
- **Workflow B** = lead books a meeting
- **Airtable** stores the lead, onboarding, and task data
- **Email and Slack** keep the team and client informed

## Notes

- Linked record fields must use Airtable record IDs, not names.
- The `Lead` field in Client Onboarding should link to the lead record.
- The `Project` field in Tasks should link to the Client Onboarding record.
- The `Assigned` field can be manual for now, then automated later if needed.

---

## Client Intake, Booking, and Follow-Up Flow

### Purpose
This flow captures a new lead, tracks whether they book a meeting, creates onboarding records after booking, and sends follow-up emails to leads who do not book.

### What it does
1. **Captures the lead**
   - Stores the lead's name, email, phone, company, service need, budget, source, and submission time in Airtable.
   - Sets the lead status to something like `New`, `Contacted`, or `Booked`.

2. **Tracks the booking**
   - When the lead books in Calendly, the workflow finds the matching lead record.
   - It updates the lead status to `Booked` and saves the meeting time and meeting link.

3. **Creates onboarding records**
   - Creates a new record in `Client Onboarding`.
   - Links the onboarding record back to the original lead.
   - Stores the client name, booking time, meeting end time, meeting link, and assigned team member.

4. **Creates team tasks**
   - Adds onboarding tasks in the `Tasks` table.
   - Links each task to the onboarding record so the team can track delivery work.

5. **Sends emails and notifications**
   - Sends a confirmation or onboarding email to the client.
   - Sends an internal message to the team so they know the booking happened.

6. **Handles unbooked leads**
   - Checks for leads that still have not booked after 7 days.
   - Sends a follow-up email to remind them to book a meeting.
   - Marks the follow-up as sent so the lead is not emailed repeatedly.

### Output
This flow keeps the CRM organized, helps the team follow up on booked and unbooked leads, and creates a smooth path from first contact to onboarding.

---

## Scheduled Follow-Up Workflow

### Purpose
This workflow checks Airtable on a schedule and sends a follow-up email to leads who still have not booked after a set number of days.

### Node Chain
1. **Schedule Trigger**
   - Starts the workflow on a recurring schedule.
   - Usually runs once a day.

2. **Search records1**
   - Looks for leads in Airtable that still need a follow-up.
   - Finds records where the lead has not booked yet and the follow-up has not already been sent.

3. **Send a message**
   - Sends a reminder email to the lead.
   - Encourages them to book a meeting.

4. **Update record1**
   - Marks the lead as followed up.
   - Prevents the same lead from receiving the same reminder again.

### What it does
- Runs automatically on a schedule
- Finds leads that are still unbooked
- Sends a follow-up email
- Updates Airtable so the lead is not emailed twice

### Output
This workflow helps recover leads that did not book right away by sending a polite reminder after a delay.

---

# Workflow C: AI Receptionist

## Purpose
Workflow C handles the front desk experience for salons.

It should answer common questions, capture leads, book appointments, route urgent requests, and hand off to a human when needed.

## Goals

- Answer calls and messages quickly
- Book appointments without staff involvement
- Capture lead details when someone is not ready to book
- Reactivate missed or inactive guests
- Reduce no-shows with reminders and confirmations
- Escalate to a human when the request is sensitive or unclear

## Entry Points

- Phone call
- SMS
- Web chat
- Missed call follow-up

## Core Flow

1. **Incoming message or call**
   - A guest contacts the salon by phone or text.
   - The system opens a new conversation session.

2. **Identify intent**
   - Classify the request as booking, pricing, hours, services, cancellation, reschedule, lead follow-up, or support.
   - If intent is unclear, ask one short clarifying question.

3. **Check salon knowledge base**
   - Pull approved salon-specific answers from the knowledge base.
   - Use only business-approved details for pricing, hours, policies, and services.

4. **Resolve request**
   - If the guest wants information, answer directly.
   - If the guest wants to book, collect the minimum required booking details.
   - If the guest wants to reschedule or cancel, locate the existing appointment and update it.

5. **Book or route**
   - Check availability through the scheduling system.
   - Offer the best matching time slots.
   - If the request requires a stylist preference, service-specific timing, or manager approval, route to a human.

6. **Capture lead data**
   - If the person does not book right away, store name, phone, email, service interest, and source.
   - Tag the lead by intent so follow-up can be automated.

7. **Confirm and follow up**
   - Send a confirmation by SMS or email.
   - Send reminders before the appointment.
   - If the call was missed, send a quick callback or booking text.

8. **Escalate when needed**
   - Transfer to a team member or create an internal alert for urgent issues, upset guests, refunds, complaints, or special cases.

## Decision Rules

- Book automatically when the service, timing, and staff availability are clear.
- Ask a human when the guest is upset, the policy is sensitive, or the request affects revenue in a high-stakes way.
- Never invent salon policies, prices, or promotions.
- Keep questions short and move toward resolution fast.

## Data To Store

- Guest name
- Phone number
- Email address
- Service requested
- Preferred stylist
- Preferred time
- Conversation transcript
- Appointment status
- Lead status
- Follow-up status

## Integrations

- Phone system
- SMS provider
- Calendar or booking system
- CRM or Airtable
- Knowledge base
- Internal notifications through Slack or email

## MVP Version

Start with this first version:

- Answer FAQs
- Capture leads
- Book appointments
- Send confirmations
- Send missed-call follow-up texts
- Escalate to a human when unsure

## Nice-To-Have Later

- Voice sentiment detection
- Automated reactivation campaigns
- Membership and retail upsells
- Multi-location routing
- AI coach for front desk staff

## Output

Workflow C becomes the salon's AI front desk.

It turns incoming calls and messages into bookings, leads, and clean handoffs instead of missed opportunities.
