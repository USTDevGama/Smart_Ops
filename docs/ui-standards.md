# UI standards

Source of truth: [DESIGN_SPEC.md](../DESIGN_SPEC.md) and `src/styles/tokens.css`. If the spec's component notes and its **Color usage** rules (§2) disagree, §2 wins. Light theme only.

## Rules

1. **Use semantic tokens, never raw hex.** Write `var(--color-text-body)`, not `#4B576C`. Raw scale tokens (`--tea-700`) are for the few places the spec names them.
2. **Reuse `@/components/ui`** before writing your own. Add new shared pieces there.
3. **Status is never colour alone.** Pair colour with an icon and text.
4. **Keep it flat.** 1px borders (`--color-border-default`) instead of shadows. A soft shadow is only for popovers, menus and modals.
5. **Everything is keyboard usable** with a visible focus ring.

## Colours

| Use                                        | Token                                                                      |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| Page background                            | `--color-bg-page` (`#F5F6F7`)                                              |
| Cards and panels                           | `--color-bg-surface` (white) + 1px `--color-border-default`                |
| Headings                                   | `--color-text-heading`                                                     |
| Body text                                  | `--color-text-body`                                                        |
| Links (always underlined)                  | `--color-text-link`, hover `--tea-700`                                     |
| Primary button                             | `--color-btn-primary-bg`, hover `--color-btn-primary-bg-hover`, text white |
| Secondary button                           | transparent, hover `--color-btn-secondary-bg-hover`                        |
| Hover or selected row, card, option        | bg `--color-highlight-bg` + border `--color-highlight-border`              |
| Border-only focus or active                | `--color-border-accent`                                                    |
| Success / error / warning / info / neutral | `--*-strong` text and icon, `--*-mid` border, `--*-subtle` background      |

Secondary hues (orange, purple, green) are for charts and illustrations, never primary actions or text.

**Do not use these as text on white** (contrast fails): `--tea-500` (3.5:1), `--warning-strong` (2.5:1), `--neu-500` (3.3:1). They are fine for borders and icons that sit next to text.

## Typography

System font stack (`--font-sans`). The Figma render uses Roboto, but it is not bundled; change `--font-sans` in `tokens.css` and add the font if design confirms it.

| Style           | Size / line | Weight |
| --------------- | ----------- | ------ |
| H1 page title   | 28 / 36     | 500    |
| H2 section      | 20 / 28     | 500    |
| H3 subsection   | 16 / 24     | 500    |
| Body            | 14 / 20     | 400    |
| Caption, helper | 12 / 16     | 400    |
| Button label    | 14 / 20     | 500    |

## Spacing, radius

4px base: `--space-1` to `--space-6` = 4, 8, 12, 16, 24, 32. Radius: `--radius-sm` 4 (inputs, buttons, tags), `--radius-md` 8 (cards), `--radius-lg` 12 (modals). Helper classes in `base.css`: `stack`, `stack-sm`, `row`, `row-between`, `caption`, `visually-hidden`.

## Components (`@/components/ui`)

| Component                                      | Notes                                                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `Button`                                       | `variant="primary" \| "secondary"`, `compact` = 32px, default 40px. Disabled keeps its colours on hover |
| `Link`, `ExternalLink`                         | Underlined by the global `a` rule                                                                       |
| `Input`, `Textarea`, `Select`                  | Always take a `label`. `helper` and `error` render below. Errors show the error icon and text           |
| `Alert`                                        | `kind` = success, info, warning, error. Icon, text and colour together                                  |
| `Tag`                                          | Short status label                                                                                      |
| `Card`                                         | White surface with border                                                                               |
| `Table`, `Tabs`, `SubNav`, `Spinner`, `Avatar` | As named                                                                                                |
| `Icon`                                         | `<Icon name="clear" />`, see below                                                                      |

## Icons

Files live in `src/assets/icons`. Use `<Icon name="clear" />` (names: `clear`, `edit`, `edit-small`, `error`, `warning-mark`, `warning`, `option`).

- Render at 12 or 16px only. Do not scale 12px icons up.
- Monochrome icons use `currentColor`. `error` and `warning-mark` keep their own colours.
- Decorative icons are `aria-hidden`. Icon-only buttons need an `aria-label`.
- Interactive icons need a hit area of at least 24×24px.
- No success or info icons were supplied. `Alert` draws a 12px circle until design provides them.

## Accessibility (WCAG 2.1 AA)

- Every field has a visible label.
- Errors use `role="alert"`; other messages use `role="status"`.
- `prefers-reduced-motion` is respected in `base.css`.
- Buttons and links keep a 2px focus ring (`:focus-visible`).

## Decisions and open items from the spec (§9)

| Item                                       | Decision here                                     |
| ------------------------------------------ | ------------------------------------------------- |
| Font                                       | System stack, no Roboto bundle                    |
| Type scale, radius, spacing, border colour | Used as inferred in the spec. Confirm with design |
| Success and info icons                     | Placeholder circle in `Alert`                     |
| Dark mode                                  | Not supported                                     |
| Smart Genie icon and AI accent             | Not used in this project                          |
| Duplicate ORA-200 / ORA-300 hex            | Left as in `tokens.css`; unused by the app        |

## Checklist before a pull request

- [ ] No raw hex colours, only tokens
- [ ] Labels, focus, and keyboard path checked
- [ ] Status shown with text, not colour alone
- [ ] Works at about 360px wide without horizontal page scroll
