# FDH v13.8.2 — Rebased Admin List Fixes

Built on the latest uploaded FDH project.

## Changes

- Fixed race-management rows overflowing or clipping inside the right scroll panel.
- Reworked race action controls into a compact responsive grid.
- Replaced ranking position-number tiles with league logos.
- Ranking rows now use league abbreviations as their visible names.
- Full league names remain available as hover titles.
- Ranking search now matches league name, abbreviation, and tier.
- Preserved the latest schedule, admin, timezone, navigation, and styling changes from the uploaded base project.

## Test checklist

- Open Admin → Races and verify all buttons stay inside the panel.
- Test All, Upcoming, Live, Completed, and Archived filters.
- Open Admin → Rankings and verify every available logo appears.
- Confirm abbreviation and tier display correctly.
- Test ranking drag, arrows, Edit Tier, and Delete actions.
- Check desktop and narrow browser widths.
