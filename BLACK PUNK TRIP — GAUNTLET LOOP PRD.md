# BLACK PUNK TRIP — GAUNTLET LOOP PRD

## Mission

Build a production-quality MVP of **Black Punk Trip**, a collaborative trip finance and expense-splitting application optimized primarily for **mobile PWA usage**.

Black Punk Trip helps a group of friends record who paid for expenses during a trip, determine how each expense should be allocated between participants, calculate each person's final balance, and generate the simplest possible settlement instructions at the end of the trip.

Think:

**Splitwise for trips, but simpler, more visual, and optimized around “talangan” workflows.**

The core scenario is:

- Anyone in the trip can pay first / “talangin”.
- Anyone can record an expense.
- Expenses can be split equally.
- Expenses can be assigned only to selected participants.
- Expenses can have different amounts per person.
- At the end, the admin reviews everything.
- The system calculates who owes whom.
- The trip can then be finalized and locked.

The product name is:

# Black Punk Trip

Do not rename the product.

---

# 1. Gauntlet Objective

Your job is not merely to scaffold screens.

Your job is to produce a polished, coherent, working application that survives repeated product, UX, calculation, responsive, and implementation review.

Work in a **Gauntlet Loop**:

1. Inspect the repository.
2. Read `DESIGN.md` completely.
3. Understand the product requirements in this PRD.
4. Plan the smallest coherent architecture.
5. Implement one complete vertical flow.
6. Run the app.
7. Test the flow.
8. Inspect the UI at mobile PWA sizes.
9. Find visual, functional, data, state, and calculation defects.
10. Fix them.
11. Repeat until the critical flows work end-to-end.
12. Only then polish secondary states.

Do not declare completion because components compile.

Completion means the app actually works as a usable trip-finance product.

---

# 2. Product Principles

Black Punk Trip should feel:

- effortless
- social
- trustworthy
- slightly playful
- financial without feeling like accounting software
- mobile-first
- fast to operate while traveling

A user should be able to add a new expense in a few seconds.

Avoid enterprise-finance complexity.

Avoid dashboards overloaded with charts.

Avoid excessive configuration.

Avoid exposing database terminology in the UI.

The app should always answer three questions clearly:

1. **Berapa total trip ini?**
2. **Saldo gue sekarang berapa?**
3. **Siapa akhirnya harus bayar siapa?**

---

# 3. Design Source of Truth

A `DESIGN.md` file is provided alongside this PRD.

You MUST read it before implementing UI.

Treat `DESIGN.md` as the visual source of truth for:

- colors
- typography
- spacing
- border radius
- buttons
- cards
- forms
- navigation
- elevation
- responsive behavior
- interaction styling

Do not replace it with a generic shadcn dashboard aesthetic.

Do not invent an unrelated fintech design system.

The name **Black Punk Trip** may have attitude, but the interface must remain aligned with `DESIGN.md`.

Express the “Black Punk” personality primarily through:

- concise copy
- iconography
- naming
- microcopy
- subtle illustrations if appropriate
- empty states

Do NOT accomplish it by introducing random neon colors, giant gradients, excessive black surfaces, or visual noise.

If the exact custom font referenced by `DESIGN.md` is not included in the repository, use the specified system fallback rather than inventing or downloading an arbitrary replacement.

---

# 4. Technical Stack

Keep infrastructure deliberately simple.

## Frontend

Use:

- Next.js
- TypeScript
- App Router
- Tailwind CSS
- shadcn/ui / Radix primitives where useful
- React Hook Form
- Zod
- TanStack Query where server-state caching materially helps
- Lucide icons

Do not introduce Redux unless a real requirement makes it necessary.

Prefer React state, server state, URL state, and small focused stores.

---

# 5. Deployment

Frontend deployment:

**Vercel**

Primary production experience:

**PWA**

The application must work well when opened from a mobile browser and when installed to the home screen.

Implement:

- web app manifest
- application name
- short name
- theme/background metadata
- standalone display mode
- responsive viewport behavior
- PWA icons/placeholders structured correctly
- mobile safe-area handling
- installable application shell

The installed PWA should not feel like a desktop website squeezed onto a phone.

---

# 6. Backend

Use:

**Supabase**

Use Supabase for:

- PostgreSQL database
- Authentication
- Storage
- Row Level Security

Do NOT build a separate Express/Nest/Fastify backend for this MVP.

Do NOT introduce Firebase.

Do NOT introduce a second database.

The architecture should roughly be:

Next.js PWA  
→ Supabase Auth  
→ Supabase PostgreSQL  
→ Supabase Storage

Vercel hosts the application.

Supabase owns application data.

---

# 7. Financial Data Rule

Never use floating-point arithmetic for Rupiah calculations.

Store monetary values as integer Rupiah values.

Example:

Rp125.000

must be represented internally as:

125000

Every expense allocation must satisfy:

SUM(allocation.amount) = expense.amount

The UI should refuse final submission when this invariant is not true.

Money formatting should consistently use Indonesian Rupiah formatting.

---

# 8. Authentication

Keep authentication simple.

Support:

- sign up
- sign in
- sign out

Use Supabase Auth.

For MVP, email/password authentication is sufficient.

Create a user profile after registration.

Profile fields:

- id
- display_name
- avatar_url nullable
- created_at

Do not build social login unless already trivial in the existing repository.

---

# 9. Core Entities

The minimum domain model is:

## profiles

- id
- display_name
- avatar_url
- created_at

## trips

- id
- name
- description nullable
- cover_url nullable
- start_date nullable
- end_date nullable
- invite_code
- status
- created_by
- created_at
- finalized_at nullable

Trip status:

- active
- finalized

## trip_members

- trip_id
- user_id
- role
- joined_at

Roles:

- admin
- member

A trip can have more than one admin if the architecture naturally supports it.

## expenses

- id
- trip_id
- title
- notes nullable
- category
- amount
- expense_date
- paid_by
- created_by
- split_type
- receipt_url nullable
- created_at
- updated_at

Suggested split types:

- equal
- selected_equal
- custom

## expense_allocations

- id
- expense_id
- user_id
- amount

## settlements

- id
- trip_id
- from_user_id
- to_user_id
- amount
- status
- paid_at nullable
- created_at

Settlement status:

- pending
- paid

---

# 10. Critical Data Architecture Rule

Never calculate someone's financial obligation only from `split_type`.

Whenever an expense is successfully created, produce concrete records inside:

`expense_allocations`

Example:

Restaurant total:

Rp800.000

Paid by Budi.

Allocation:

- Andi → 100000
- Budi → 250000
- Caca → 150000
- Deni → 300000

The calculation engine should consume these allocations.

This allows:

- equal splits
- custom splits
- participant-only splits

to share exactly the same accounting engine.

`split_type` exists mainly to describe how the allocations were generated.

---

# 11. Trip Creation Flow

A signed-in user can create a trip.

Minimum fields:

- Trip name
- Optional date range
- Optional description

Example:

**Bali Chaos 2026**

After creation:

- creator automatically becomes admin
- generate an invite code
- show share/join information

A user can join another trip using the invite code.

Prevent duplicate membership.

---

# 12. Trip Home

The Trip Home screen is the center of the product.

Mobile layout should prioritize:

### Header

- trip name
- dates if available
- member avatars
- settings / overflow action

### Primary financial summary

Show:

- total trip spending
- user's current net balance

Examples:

**+ Rp1.250.000**

Label:

`Kamu harus menerima`

or

**- Rp425.000**

Label:

`Kamu masih harus bayar`

Do not rely on color alone to communicate positive/negative status.

### Primary CTA

Prominent:

**+ Tambah Talangan**

### Recent expenses

Each item should show:

- category/icon
- title
- payer
- amount
- date
- compact split information

Example:

Villa  
Andi menalangi  
Rp2.400.000  
Dibagi 4 orang

### Navigation

For mobile PWA, use an appropriate compact navigation pattern.

Likely destinations:

- Home
- Expenses
- Members
- Settlement

Admin-only management actions can live in settings or contextually relevant screens.

---

# 13. Add Expense / Tambah Talangan

This is the most important interaction in the app.

Optimize it heavily.

Fields:

## Amount

Large, highly visible input.

Example:

`Rp 850.000`

## Title

Example:

`Makan Jimbaran`

## Paid By

Default to current user.

But allow selecting any trip member.

This is critical:

`created_by` and `paid_by` are different concepts.

Example:

Caca enters the receipt.

Budi actually paid.

Therefore:

created_by = Caca  
paid_by = Budi

Never assume the creator is the payer.

## Expense date

Default to now/today.

Allow editing.

## Category

Suggested categories:

- Accommodation
- Food
- Transport
- Activity
- Shopping
- Other

Keep category selection quick.

## Receipt

Optional image upload.

Store in Supabase Storage.

Compress or resize unnecessarily large mobile images before upload when practical.

## Split Method

Three required modes:

### A. Equal

Split equally among all trip participants.

Example:

Rp2.400.000 / 4 participants

→ Rp600.000 each.

Account for non-even integer division safely.

If the total cannot be divided exactly into Rupiah integers, distribute the remainder deterministically so allocations still sum exactly to the expense total.

### B. Selected Equal

Select participating members.

Then divide equally only between them.

Example:

Jetski Rp600.000

Participants:

- Andi
- Budi

Allocation:

- Andi Rp300.000
- Budi Rp300.000

Other members owe zero.

### C. Custom

Enter an explicit Rupiah amount for every selected participant.

Example:

Restaurant Rp800.000

- Andi Rp100.000
- Budi Rp250.000
- Caca Rp150.000
- Deni Rp300.000

Show a live reconciliation indicator:

Assigned  
Rp800.000 / Rp800.000

If mismatch:

Assigned  
Rp750.000 / Rp800.000

Sisa Rp50.000

Submission must be disabled until allocations equal expense total.

---

# 14. Expense Detail

Expense detail should show:

- title
- total
- category
- date
- payer
- creator
- receipt if available
- notes
- allocation breakdown

Example:

**Villa — Rp2.400.000**

Dibayar oleh Andi

Bagian:
- Andi Rp600.000
- Budi Rp600.000
- Caca Rp600.000
- Deni Rp600.000

Allow editing according to permissions.

---

# 15. Editing Permissions

While a trip is active:

Trip members may:

- create expenses
- view trip expenses
- view member balances
- view settlement preview

An expense creator should be able to edit their own expense.

Trip admins should be able to edit any expense.

Admins should be able to correct:

- payer
- amount
- participants
- allocations
- title
- receipt
- date

All recalculations must remain internally consistent.

Do not allow modifications after the trip has been finalized unless the app explicitly implements a safe “reopen trip” mechanism.

For MVP, finalized can simply mean locked.

---

# 16. Members Screen

Display each trip member with:

- avatar
- name
- role if admin
- total paid
- total owed/share
- net balance

Example:

Andi  
Paid Rp3.000.000  
Share Rp1.050.000  
**+ Rp1.950.000**

Budi  
Paid Rp500.000  
Share Rp900.000  
**- Rp400.000**

Make the distinction between:

- paid
- owed/share
- balance

extremely clear.

---

# 17. Balance Calculation

For every user:

NET BALANCE =
TOTAL PAID
-
TOTAL ALLOCATED TO USER

Meaning:

Positive balance:

the user should receive money.

Negative balance:

the user owes money.

Zero:

the user is settled.

Example:

Andi paid:

Rp3.000.000

Andi's allocations:

Rp1.050.000

Net:

+Rp1.950.000

Andi should receive Rp1.950.000.

Use database-derived values as the source of truth.

Avoid storing redundant balances unless they are clearly treated as caches.

---

# 18. Settlement Algorithm

Generate a simplified list of payments that resolves all balances.

Create two groups:

### Creditors

Members whose balance is positive.

### Debtors

Members whose balance is negative.

Repeatedly match a debtor with a creditor.

For each match:

payment =
min(abs(debtor_balance), creditor_balance)

Create:

debtor → creditor → payment

Update temporary balances and continue until everyone reaches zero.

Example output:

Deni  
→ bayar Rp425.000 ke Andi

Caca  
→ bayar Rp175.000 ke Budi

Budi  
→ bayar Rp125.000 ke Andi

The generated settlements must preserve the total financial balance of the trip.

Do not introduce rounding inconsistencies.

---

# 19. Settlement Screen

The settlement view is one of the product's primary payoff moments.

Show:

## Trip status

Active / Ready to finalize / Finalized

## Financial validation

Before finalizing verify:

- every expense has allocations
- every allocation sum equals expense amount
- no invalid member references exist
- net sum of all member balances equals zero

## Settlement plan

Present clearly:

`Deni bayar Andi`

`Rp425.000`

Allow marking a settlement:

**Sudah Dibayar**

Once paid:

- status becomes paid
- show paid timestamp

Do not automatically alter historical expenses when marking settlements paid.

Expenses represent spending.

Settlements represent repayments.

Keep these concepts separate.

---

# 20. Admin Finalization

Admins receive an explicit:

**Review Trip**

screen.

Show expenses requiring attention first.

Examples:

- allocation mismatch
- missing payer
- invalid split
- failed receipt state

When everything is valid:

**Hitung Settlement**

Then:

**Finalize Trip**

Use a confirmation step.

Explain clearly:

“Setelah trip difinalisasi, pengeluaran akan dikunci dan settlement akhir dibuat.”

After confirmation:

- persist settlements
- set trip status = finalized
- record finalized_at
- lock expense modifications

Do not silently finalize.

---

# 21. Empty States

Design intentional empty states.

Examples:

No expenses:

**Belum ada yang nombok.**

`Jadi orang pertama yang talangin sesuatu di trip ini.`

CTA:

**Tambah Talangan**

No settlement required:

**Semua beres.**

`Tidak ada pembayaran antar-member yang tersisa.`

Avoid generic:

“No data available.”

---

# 22. PWA & Mobile UX Requirements

Main usage is expected from a phone.

Design mobile-first around approximately:

- 360px
- 390px
- 430px

Then enhance for:

- tablet
- desktop

Critical actions should remain easy to reach one-handed.

Respect safe areas.

Avoid tiny interactive controls.

Forms should work correctly with virtual keyboards.

Numerical expense inputs should use an appropriate mobile numeric keyboard.

Do not allow bottom navigation or primary CTAs to become hidden behind mobile browser UI where reasonably preventable.

The desktop version should feel like a widened version of the same product—not a separate enterprise dashboard.

---

# 23. PWA Offline Behavior

Do not pretend financial data has synced when the network is unavailable.

At minimum:

- cache the application shell
- provide a graceful offline state
- do not show false success for failed Supabase mutations

If practical without destabilizing the MVP:

- preserve an unfinished expense form locally
- restore the draft after reconnect/reload

Full offline database synchronization is NOT required for V1.

Do not overengineer offline conflict resolution.

---

# 24. Supabase Security

Implement Row Level Security.

A user must not be able to access arbitrary trips by changing IDs in requests.

Conceptually:

A user can read a trip if:

they exist in `trip_members`.

A user can read expenses if:

they belong to the expense's trip.

A user can create an expense if:

they belong to the trip and the trip is active.

A user can update their own expense if:

they created it and the trip is active.

An admin can update expenses belonging to their trip.

A user can access receipts only according to the same trip-membership rules.

Admin privileges must be verified using database membership/role data.

Never rely only on hiding admin buttons in the frontend.

---

# 25. Database Constraints

Use database constraints wherever useful.

Important invariants should not live only in React validation.

Use:

- foreign keys
- unique membership constraints
- sensible check constraints
- not-null constraints
- appropriate indexes

Useful unique constraint:

trip_members:

(trip_id, user_id)

Invite codes should be unique.

Financial values should not permit invalid negative expense totals.

---

# 26. Receipt Storage

Use Supabase Storage.

Suggested logical structure:

trip-receipts/
  {trip_id}/
    {expense_id}/
      receipt.ext

Do not make receipt buckets globally public unless there is a deliberate security reason.

Use access consistent with trip membership.

The absence of a receipt must never prevent adding a normal expense.

---

# 27. Loading, Error & Success States

Every async workflow needs an intentional state.

Especially:

- login
- join trip
- create trip
- add expense
- upload receipt
- update expense
- finalize trip
- mark settlement paid

Do not leave users guessing whether something worked.

Prevent accidental duplicate submissions.

Use readable Indonesian copy.

Examples:

`Menyimpan talangan…`

`Talangan berhasil ditambahkan.`

`Gagal menyimpan. Coba lagi.`

Avoid technical database error messages in the main UI.

---

# 28. Confirmation Behavior

Require confirmation before destructive/high-impact actions:

- delete expense
- finalize trip

Do not require confirmation for harmless navigation.

Do not make normal expense submission unnecessarily slow with extra confirmation screens unless testing shows it improves reliability.

Speed matters.

---

# 29. Initial Screen Set

At minimum implement:

1. Sign In
2. Sign Up
3. My Trips
4. Create Trip
5. Join Trip
6. Trip Home
7. Expenses
8. Add Expense
9. Expense Detail
10. Edit Expense
11. Members
12. Settlement
13. Review / Finalize Trip
14. Basic Trip Settings

These must be connected.

Do not build disconnected showcase pages.

---

# 30. My Trips

After authentication, show:

**Black Punk Trip**

Then list active/recent trips.

Trip card example:

Bali Chaos 2026  
4–10 Aug  
4 people

Rp8.750.000 spent

Your balance  
+Rp1.250.000

Provide:

- Create Trip
- Join Trip

Keep this page extremely clean.

---

# 31. Suggested Copy Tone

UI language:

Primarily Indonesian.

Tone:

short, friendly, confident.

Examples:

Instead of:

“Create New Expense Record”

Use:

**Tambah Talangan**

Instead of:

“Expense Contributor”

Use:

**Dibayar oleh**

Instead of:

“Participant Allocation”

Use:

**Bagian tiap orang**

Instead of:

“Finalize Accounting Period”

Use:

**Tutup Trip**

The product can have personality.

Do not overdo jokes around serious financial information.

Amounts, balances, settlement instructions, and destructive actions must remain crystal clear.

---

# 32. What NOT to Build in V1

Do NOT spend MVP time on:

- chat
- itinerary planning
- social feed
- bank API integrations
- payment gateway
- automatic bank transfers
- OCR
- AI receipt extraction
- item-level restaurant receipt parsing
- automatic FX conversion
- push notifications
- complicated multi-role permissions
- accounting exports
- budgeting
- complex analytics
- custom themes

Keep the V1 about:

**record → split → review → settle**

---

# 33. Architecture Principle

Favor boring, understandable code.

Avoid:

- premature abstraction
- huge generic component frameworks
- microservices
- unnecessary repositories/services layers
- duplicate state
- clever financial math
- client-side-only authorization

Financial calculation functions should be:

- small
- pure where practical
- deterministic
- independently testable

---

# 34. Calculation Tests

Add automated tests for financial logic.

At minimum test:

### Equal split

1,000,000 / 4

→ exact total preserved.

### Uneven split remainder

100 / 3

Allocation sum must still equal 100.

### Selected split

Expense assigned to 2 of 5 participants.

Only selected participants receive allocation.

### Custom split

Allocation sum equals expense exactly.

### Balance

Paid minus allocated returns expected values.

### Settlement

All resulting member balances become zero.

### Settlement invariant

Total money received by creditors equals total money sent by debtors.

### Self allocation

A payer may also owe part of their own expense.

This must work normally.

Example:

Budi pays Rp800.000 restaurant bill.

Budi's share is Rp250.000.

Net contribution from this expense is therefore +Rp550.000, not +Rp800.000.

---

# 35. Responsive QA Gauntlet

Before declaring UI complete, inspect all critical screens at:

- 360px mobile
- 390px mobile
- 430px mobile
- ~768px tablet
- desktop

Check:

- no horizontal scrolling
- no clipped Rupiah values
- no overlapping bottom navigation
- no inaccessible dialogs
- numeric forms remain usable with keyboard open
- long participant names do not destroy layout
- large amounts do not overflow cards
- touch targets remain appropriate
- receipts scale correctly
- modal/sheet content is scrollable when needed

---

# 36. Visual QA Gauntlet

Compare the implementation against `DESIGN.md`.

Specifically inspect:

- page background
- typography hierarchy
- border colors
- card radius
- button treatment
- shadow restraint
- spacing rhythm
- focus states
- muted text
- mobile navigation
- form styling

Reject generic defaults that contradict the design file.

The application should visually feel like one coherent product.

---

# 37. Functional Gauntlet Scenario

Before completion, manually verify this complete scenario:

Create four users:

- Andi
- Budi
- Caca
- Deni

Create trip:

**Bali Chaos 2026**

All four join.

### Expense 1

Villa

Rp2.400.000

Paid by Andi.

Equal split between all four.

Expected allocation:

Rp600.000 each.

### Expense 2

Jimbaran

Rp800.000

Paid by Budi.

Custom:

- Andi Rp100.000
- Budi Rp250.000
- Caca Rp150.000
- Deni Rp300.000

### Expense 3

Jetski

Rp600.000

Paid by Caca.

Selected equal:

- Caca
- Deni

Expected:

Rp300.000 each.

Verify:

- totals
- each person's paid amount
- each person's allocated amount
- each person's net balance
- trip balance sum = zero
- generated settlements clear all balances

Then:

- finalize trip
- verify expenses become locked
- mark one settlement paid
- verify settlement status updates without mutating the original expenses

This scenario must work end-to-end.

---

# 38. Seed / Development Data

Provide a convenient development seed or fixture representing the functional Gauntlet scenario.

Do not make production behavior depend on seed data.

The seeded state exists only to accelerate development and QA.

---

# 39. Required Deliverables

The repository should end with:

- working Next.js application
- responsive PWA
- Supabase integration
- Supabase migrations/schema
- RLS policies
- receipt storage integration
- authentication flow
- expense flow
- split allocation engine
- balance engine
- settlement engine
- admin finalization
- calculation tests
- `.env.example`
- README setup instructions
- Vercel deployment-ready configuration

README should explain:

1. required Node version
2. install command
3. environment variables
4. Supabase setup
5. migration execution
6. local dev command
7. test command
8. build command
9. Vercel deployment setup

Never commit private Supabase secrets.

Only expose browser-safe public variables to the client.

---

# 40. Definition of Done

Do NOT mark the project complete until:

- authentication works
- create trip works
- join trip works
- all trip members can add expenses
- payer can differ from creator
- equal split works
- selected equal split works
- custom split works
- allocations always reconcile to expense totals
- receipt upload works
- member balances are correct
- settlement generation is correct
- admin review works
- finalization works
- finalized trips are locked
- settlement can be marked paid
- RLS protects trip data
- mobile PWA experience is polished
- critical calculation tests pass
- production build passes
- critical flows have been manually exercised
- UI has been reviewed against `DESIGN.md`

---

# 41. Gauntlet Execution Rules

When implementing:

## Do not stop after planning.

Proceed into implementation.

## Do not stop after scaffolding.

Complete vertical flows.

## Do not knowingly leave obvious broken states.

Fix them.

## Do not replace hard parts with TODO comments.

Implement the smallest correct version.

## Do not overbuild future features.

Keep scope focused.

## Do not change the product requirements simply because a different implementation is easier.

Preserve the intended user experience.

## Reuse components when it genuinely improves consistency.

Do not abstract prematurely.

## Protect accounting correctness over visual convenience.

If UI state and financial invariants conflict, financial correctness wins.

## Protect `DESIGN.md` over generic component defaults.

Customize primitives until they match the provided design system.

---

# 42. Implementation Order

Recommended order:

### Phase 1 — Foundation

- inspect repository
- inspect `DESIGN.md`
- establish theme/tokens
- configure Supabase
- schema/migrations
- RLS
- auth

### Phase 2 — Trip Core

- My Trips
- create trip
- join trip
- members
- invite code

### Phase 3 — Expense Vertical Slice

- add expense
- payer selection
- equal split
- allocation persistence
- expense list
- expense detail

Do not proceed until this works end-to-end.

### Phase 4 — Advanced Splitting

- selected equal
- custom split
- validation
- edit expense

### Phase 5 — Accounting

- balance engine
- member summaries
- settlement algorithm
- calculation tests

### Phase 6 — Admin Closeout

- review
- validation
- settlement generation
- finalization
- lock
- paid settlement state

### Phase 7 — PWA

- manifest
- icons
- install experience
- app shell
- offline/error behavior
- mobile safe areas

### Phase 8 — Polish Gauntlet

Repeatedly inspect:

- UX
- visual fidelity
- responsiveness
- loading states
- empty states
- error states
- calculations
- security
- accessibility

Continue iterating until there are no obvious critical defects.

---

# 43. Final Product Standard

Black Punk Trip should feel like a small product that could genuinely be used by a group of friends on their next trip.

It should not feel like:

- a CRUD demo
- an admin dashboard template
- a database frontend
- a hackathon prototype
- a collection of disconnected shadcn components

The experience should feel intentionally designed around this loop:

**Someone pays → records it → group sees it → expenses are divided → everyone knows their balance → admin closes the trip → debts are settled.**

Build that loop exceptionally well.

# End of PRD