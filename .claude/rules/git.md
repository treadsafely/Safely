# Git

## Renaming a file that also changes

Rename the existing file and edit it in place; never write the new content to a new path and delete
the old one. Git infers a rename only from content similarity (50% by default), so a rename done as
delete + create shows up as an unrelated removal and addition: review loses the diff, and
`git log --follow` loses the history.

- `git mv <old> <new>` first — it stages only the rename — then edit `<new>`. `git diff` then shows
  the edits against the renamed file.
- If the new file already exists as a fresh copy: move it aside, restore the original
  (`git show HEAD:<old> > <old>`), `git mv <old> <new>`, then put the edited version back.
- When the content changes beyond recognition, the similarity check fails anyway. Where it matters,
  land the rename and the rewrite as separate commits so the history still links them.
