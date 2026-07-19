# Adoption and Onboarding

## Purpose
- Define how the platform gets adopted by a small, non-technical team that already works in Google, Messenger, Zalo, and Trello.
- Turn the standing adoption principle, seed real data before inviting the team, into an executable onboarding plan.

## In Scope
- The seed-before-invite sequence.
- The guided onboarding session and its follow-up.
- How adoption is measured with the existing scorecard.

## Out of Scope
- Marketing or external growth.
- Detailed training curricula per role.
- Feature tutorials, which live with each screen during implementation.

## Decisions
- An empty system converts no one; real data is seeded before the team is invited.
- Onboarding is one guided in-person session, not a manual the team must read.
- Adoption is judged by the existing V1 scorecard, not a new analytics program.
- The team is not asked to create or install any new account; sign-in is Google, alerts arrive on Zalo and email.

## Dependencies
- Platform adoption principle in [`../platform/platform-context.md`](../platform/platform-context.md).
- Google import paths in [`../system/google-bridge.md`](../system/google-bridge.md).
- Catalog import in [`../system/catalog-circulation.md`](../system/catalog-circulation.md).
- Scorecard in [`../product/v1-scorecard.md`](../product/v1-scorecard.md).
- UI wording in [`../ui/vocabulary-vi.md`](../ui/vocabulary-vi.md).

## Acceptance Criteria
- On first sign-in, a team member finds real files and real books already in the system, not an empty shell.
- A member can sign in with their existing Google account and needs no new login.
- The team can complete core tasks after one guided session without a written manual.
- Weekly active use can be read from the scorecard within the first month.

## Seed Before Invite
- Import a representative set of legacy files from Drive into the right spaces, so `Library` is populated on day one.
- Load the roughly one-thousand-book catalog from the library spreadsheet, so the physical `Catalog` is browsable and lendable immediately.
- Create the initial spaces and memberships that match how the team is actually organized by project and domain.
- Register the near-term project deadlines so the calendar feed has content to subscribe to.

## Guided Session
- Run one in-person session covering the few tasks each person actually needs: find and download a file, upload a file into a space, browse the book catalog and request a loan, and read a knowledge page.
- Sign everyone in with Google during the session to confirm no-new-account access works.
- Show how to subscribe the deadline calendar feed and how notifications arrive on Zalo.
- Capture confusion points during the session as the first backlog of copy and UX fixes.

## After Onboarding
- Watch the scorecard's weekly-active-accounts signal for the first month; a low signal means a usability or seeding gap, not a training gap.
- Fix the highest-friction screens first, since every confusing screen becomes a support message to the single technical operator.
- Keep the Vietnamese UI copy under humanities-team review as real usage surfaces awkward wording.

## Why This Matters for a One-Operator Team
- The only technical person is also the only system operator; support load is a direct cost on the platform's progress.
- Seeding real data, plain-language copy, and a single guided session reduce that support load more than any written documentation would.
