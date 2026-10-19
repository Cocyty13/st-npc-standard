# st-npc-standard

A small SillyTavern UI extension that wraps an existing `/npc` command (from a separate "Auto Profile" extension) so that newly created character cards follow one fixed card template.

What it does after `/npc <name> <details>`:
1. Lets the original `/npc` create the card (avatar image, group add).
2. Turns only the player's own description into structured fields with one quiet model call, then renders them into a fixed template:
   optional `------ youth ------` line, `<{{char}}>`, `[Name]`, `Age` (adults) or `Grade … (minor)`, `Gender`, `Role`, `Appearance`, `Personality`, `Speech`, `Relationships`, `Secrets` (adults only), `Notes` ending "Reply in natural Thai.", closing tag.
3. Shows the card in a popup for review/editing before saving.
4. Mutes the new member in the current group and assigns extra lorebooks (youth cards get only the non-adult book).
5. Clears the Auto Profile per-generation injection prompt, so cards are only created via `/npc`.

Youth cards (under 18, school grade, or student): no numeric age, no romance or sexual content, non-sexual appearance only; flagged fields are blanked.

Configuration: edit the constants at the top of `template.js` (`MAIN_BOOK`, `LOG_BOOK`, `ADULT_BOOKS`) to match your lorebook names.

Requires SillyTavern 1.19+ and the Auto Profile extension (loads after it, `loading_order` 90).

Test the renderer: `node test.mjs`.
