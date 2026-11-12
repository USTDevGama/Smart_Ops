# Design Spec — UI Foundations

> **Audience:** Claude Code (and developers) building the UI.
> **Source of truth:** Figma frames *Colors*, *Color usage*, plus the exported icon set.
> **Companion files:** `tokens.css` (all tokens as CSS variables), `assets/icons/*` (icons), `assets/reference/*` (original Figma exports).

## How to use this document (instructions for Claude Code)

1. Import `tokens.css` once at the app root. **Never hard-code hex values in components** — reference the semantic aliases (`--color-*`) first, then the palette scales (`--tea-600`, etc.) only if no alias exists.
2. Copy `assets/icons/` into the project (e.g. `src/assets/icons/`). Convert monochrome SVGs to components that use `currentColor` (see §6).
3. Items tagged **[INFERRED]** were not explicitly defined in Figma (e.g. font family, spacing, radius). Use the defaults given, keep them centralized in tokens, and flag them in the PR description so design can confirm.
4. Items tagged **[OPEN]** are decisions still needed — see §9.
5. If this spec and a component's behavior conflict, the **Color usage** rules (§2) win.

---

## 1. Brand color palette

Two primary hues, one white, a neutral scale, and three secondary hues. Scales run **50 → 1000** (higher = darker). Brand base value is the **500** step.

### 1.1 Primary

| Role | Token | Hex |
|---|---|---|
| **Dark Teal (brand base)** | `--dte-500` | `#003C51` |
| **Teal (brand accent)** | `--tea-500` | `#0097AC` |
| White | `--white` | `#FFFFFF` |

**Dark Teal scale (DTE)**
`950 #000608` · `900 #000C10` · `850 #001218` · `800 #001820` · `750 #001E28` · `700 #002431` · `650 #002A39` · `600 #003041` · `550 #003649` · **`500 #003C51`** · `450 #1A5063` · `400 #336374` · `350 #4D7786` · `300 #668A97` · `250 #809EA8` · `200 #99B1B9` · `150 #B3C5CB` · `100 #CCD8DC` · `50 #E6ECEE`

**Teal scale (TEA)**
`950 #000F11` · `900 #001E22` · `850 #002D33` · `800 #003C45` · `750 #004B55` · `700 #005B67` · `650 #006A78` · **`600 #00798A`** · `550 #00899B` · **`500 #0097AC`** · `450 #1AA2B5` · `400 #33ACBD` · **`350 #4DB7C5`** · `300 #66C1CD` · `250 #80CBD5` · `200 #99D5DE` · `150 #B3E0E6` · `100 #CCEAEE` · **`50 #E6F5F7`** · `5 #F0F9FA`

### 1.2 Neutrals (NEU) and surfaces (SUR)

**Neutral scale (NEU)**
`1000 #0E1E3A` · `950 #1A2944` · `900 #27354E` · `850 #324057` · `800 #3E4B61` · `750 #4B576C` · `700 #576276` · `650 #626D7F` · `600 #6E7889` · `550 #7B8493` · `500 #878F9D` · `450 #9299A6` · `400 #9FA5B0` · `350 #ABB0BA` · `300 #B7BCC4` · `250 #C3C7CE` · `200 #CFD2D8` · `150 #DBDDE2` · `100 #E7E9EC` · `50 #F3F4F5`

**Light shades for backgrounds (SUR)**

| Token | Hex |
|---|---|
| `--sur-1000` | `#E7E9EC` |
| `--sur-800` | `#EFF0F2` |
| `--sur-600` | `#F3F4F5` |
| `--sur-400` | `#F5F6F7` ← page background |
| `--sur-200` | `#FAFAFB` |

### 1.3 Secondary hues

Secondary colors are for accents, data visualization, categories, and illustrations — **not** for primary actions or text.

| Hue | Base (500) | Lightest steps → darkest |
|---|---|---|
| **Orange/Coral (ORA)** | `#FC6A59` | `0 #FFF0EF` `50 #FEDAD5` `100 #FEC3BD` `200 #FDADA4` `300 #FD968A` `400 #FD8072` **`500 #FC6A59`** `600 #D75A4C` `700 #B04A3E` `800 #8B3A31` `900 #642A23` `1000 #3F1B16` |
| **Purple (PUR)** | `#881E87` | `0 #F3E9F3` `50 #E1C7E1` `100 #CFA5CF` `200 #BE84BD` `300 #AC62AB` `400 #9A4099` **`500 #881E87`** `600 #741A73` `700 #5F155E` `800 #4B114A` `900 #360C36` `1000 #220822` |
| **Green (GRE)** | `#01B27C` | `0 #E6F7F2` `50 #BFECDE` `100 #99E0CA` `200 #74D5B7` `300 #4EC9A4` `400 #27BE90` **`500 #01B27C`** `600 #01986A` `700 #017C57` `800 #016244` `900 #004731` `1000 #002D1F` |

> Note: Figma labels ORA 200 and ORA 300 with the same hex (`#FD978B`). The rendered swatches differ, so `tokens.css` uses the sampled values (`ORA-300 #FD968A`, `ORA-200 #FDADA4`). Confirm with design **[OPEN]**.

### 1.4 Semantic (status) colors

| Status | Strong (text/icon/solid) | Mid | Subtle (background) | Extra |
|---|---|---|---|---|
| **Success** | `#008540` | `#83E2A7` | `#C2EFD9` | — |
| **Error / Danger** | `#CF2F29` | `#FCA8A8` | `#F9D3D3` | faint `#FCEFEE` |
| **Warning** | `#FA8500` | `#FEBF76` | `#F8EECE` | — |
| **Info** | `#0071EB` | `#A8D9FF` | `#D6EDFF` | — |
| **Neutral** | `#757575` | `#C1C1C1` | `#E3E3E3` | — |

Token names: `--success-strong|mid|subtle`, `--error-strong|mid|subtle|faint`, `--warning-…`, `--info-…`, `--neutral-…`.

---

## 2. Color usage rules (authoritative)

| Purpose | Token | Hex |
|---|---|---|
| Headings, titles, dark body copy | `--color-text-heading` (NEU-1000) | `#0E1E3A` |
| Normal body copy | `--color-text-body` (NEU-750) | `#4B576C` |
| Link text | `--color-text-link` (TEA-600) | `#00798A` — **must be underlined** |
| Page background | `--color-bg-page` (SUR-400) | `#F5F6F7` |
| Card / panel surface | `--color-bg-surface` | `#FFFFFF` **[INFERRED]** |

### Buttons

| | Normal bg | Hover bg | Text |
|---|---|---|---|
| **Primary** | `#003C51` (`--color-btn-primary-bg`) | `#00798A` (`--color-btn-primary-bg-hover`) | `#FFFFFF` |
| **Secondary** | `transparent` | `#E7E9EC` (`--color-btn-secondary-bg-hover`) | `#0E1E3A` |

### Highlight & hover (rows, list items, cards, menu options)

| | Token | Hex |
|---|---|---|
| Background | `--color-highlight-bg` (TEA-50) | `#E6F5F7` |
| Border (with bg) | `--color-highlight-border` (TEA-350) | `#4DB7C5` |
| Border only (no bg — e.g. focus/active outline) | `--color-border-accent` (TEA-500) | `#0097AC` |

---

## 3. Typography **[INFERRED]**

Figma renders in **Roboto**. Confirm this is the intended product font **[OPEN]**.

| Style | Size / line-height | Weight | Color |
|---|---|---|---|
| Page title (H1) | 28 / 36 | 500 | heading |
| Section title (H2) | 20 / 28 | 500 | heading |
| Subsection (H3) | 16 / 24 | 500 | heading |
| Body | 14 / 20 | 400 | body |
| Body small / caption / helper | 12 / 16 | 400 | body |
| Button label | 14 / 20 | 500 | per variant |
| Link | inherits | inherits | link + `text-decoration: underline` |

Use `font-family: var(--font-sans)`.

---

## 4. Spacing, radius, elevation **[INFERRED]**

- **Spacing scale (4px base):** 4, 8, 12, 16, 24, 32 → `--space-1…6`.
- **Radius:** `--radius-sm 4px` (inputs, buttons, tags), `--radius-md 8px` (cards, popovers), `--radius-lg 12px` (modals). Figma swatches use ~4px corners.
- **Elevation:** keep minimal — use 1px borders (`--color-border-default`, NEU-200) over shadows; use a soft shadow (`0 2px 8px rgba(14,30,58,.12)`) only for popovers/menus/modals.

---

## 5. Component specs

All components must expose **default, hover, focus-visible, active, disabled** states. Focus ring: `2px solid var(--color-border-accent)` with `2px` offset.

### 5.1 Button

| Variant | Background | Hover | Text | Border |
|---|---|---|---|---|
| Primary | `--color-btn-primary-bg` | `--color-btn-primary-bg-hover` | white | none |
| Secondary | transparent | `--color-btn-secondary-bg-hover` | `--color-btn-secondary-text` | none (add 1px `--neu-200` if on a same-color surface **[OPEN]**) |

- Height 32px (compact) / 40px (default) **[INFERRED]**; horizontal padding 16px; radius `--radius-sm`.
- Disabled: primary → bg `--neu-200`, text `--neu-500`; secondary → text `--neu-400`. No hover change.
- Optional leading icon: 16px, `currentColor`, 8px gap.

### 5.2 Link
Color `--color-text-link`, **always underlined**. Hover: darken to `--tea-700`. Visited: unchanged.

### 5.3 Text input / form field
- Surface white, 1px border `--neu-200`, radius `--radius-sm`, text `--color-text-heading`, placeholder `--neu-500`.
- Hover: border `--neu-400`. Focus: border `--color-border-accent` (+ focus ring).
- **Error:** border `--error-strong`, helper text `--error-strong` with `IconErrorMark12` leading the message; optional bg `--error-faint`.
- **Warning:** border `--warning-strong`, helper text with `IconWarningMark12`.
- **Clear affordance:** when it has a value, show `IconClear12` (12px) at the trailing edge in a 24×24 hit area.
- **Edit affordance** (inline-editable values): `IconEdit12` at the trailing edge, revealed on hover/focus of the field.

### 5.4 List row / option / card hover & selected
- Hover or selected: bg `--color-highlight-bg`, border `--color-highlight-border`.
- Keyboard focus: border-only `--color-border-accent`.

### 5.5 Status messages / alerts / tags
Use **Strong** for icon + text, **Subtle** for background, **Mid** for border.

| Status | Icon |
|---|---|
| Error | `IconErrorMark12` (`#CF2F29`) |
| Warning | `IconWarningMark12` (`#FA8500`) |
| Success / Info | **[OPEN]** — no icons supplied; use matching 12px circle glyph in `--success-strong` / `--info-strong` until provided |

### 5.6 Avatar / symbol placeholder
`SymbolOnCanvas{16,24,32}` — rounded-square canvas `#9AA1AB` with 3×3 grid of `#E7E9EC` dots. Corner radius = 1/3 of size; use as the default placeholder where no custom symbol/image exists. Sizes: 16, 24, 32 only.

### 5.7 AI / Smart Genie entry point
`Smart_Genie_icon.png` (96×96, magic wand + sparkles in purple `#881E87`). Reserve `--color-ai-accent` (PUR-500) for AI-driven features only; render the icon at 24–32px in the UI, 96px for empty states/onboarding. Prefer an SVG redraw for crisp scaling **[OPEN]**.

---

## 6. Icon inventory

| File | Size | Fill | Use |
|---|---|---|---|
| `IconClear12.svg` | 12 | `#003C51` | Clear/remove (X glyph) in inputs, chips |
| `IconEdit12.svg` | 12 | `#003C51` | Edit (pencil, standard) |
| `IconEditSmall12.svg` | 12 | `#003C51` | Edit (pencil, smaller/dense variant) — *renamed from `IconEdit12-1.svg`* |
| `IconErrorMark12.svg` / `.png` | 12 | `#CF2F29` | Error circle with X |
| `IconWarningMark12.svg` | 12 | `#FA8500` | Warning circle with ! |
| `IconWarning12.svg` | 12 | `#003C51` | Bare "!" glyph (no circle) — for placing inside custom badges |
| `IconOption16.svg` | 16 | `#003C51` | Options / list view (3 bullets + 3 lines) |
| `SymbolOnCanvas16/24/32.svg` | 16/24/32 | `#9AA1AB` + `#E7E9EC` | Default symbol/avatar placeholder |
| `Smart_Genie_icon.png` | 96 | `#881E87` | AI assistant |

**Implementation rules**
- Wrap each SVG as a component (e.g. `<Icon name="clear" size={12} />`); replace `fill="#003C51"` with `fill="currentColor"` so icons inherit text color. **Do not** recolor the status marks (`ErrorMark`, `WarningMark`) or `SymbolOnCanvas` — keep their fixed fills.
- Icons are pixel-designed at 12 / 16 px; render at exactly those sizes. Don't scale 12px icons up.
- Decorative icons: `aria-hidden="true"`. Icon-only buttons need `aria-label` (e.g. "Clear", "Edit").
- Interactive icons need a minimum 24×24 hit target even though the glyph is 12px.

---

## 7. Accessibility (WCAG 2.1 AA)

Measured contrast for the approved pairs:

| Pair | Ratio | Verdict |
|---|---|---|
| Heading `#0E1E3A` on page `#F5F6F7` | 15.3 : 1 | AAA |
| Body `#4B576C` on page `#F5F6F7` | 6.7 : 1 | AA |
| Body `#4B576C` on white | 7.3 : 1 | AAA |
| Link `#00798A` on white | 5.1 : 1 | AA |
| Link `#00798A` on page `#F5F6F7` | 4.7 : 1 | AA |
| White on primary button `#003C51` | 11.9 : 1 | AAA |
| White on primary hover `#00798A` | 5.1 : 1 | AA |
| Heading on secondary-hover `#E7E9EC` | 13.6 : 1 | AAA |

**Do not use** for text on white: `--tea-500 #0097AC` (3.5 : 1), `--warning-strong #FA8500` (2.5 : 1), `--neu-500` (3.3 : 1). These are OK for borders, large graphics, and icons paired with text, not for body text. White text on `--success-strong` (4.7) and `--info-strong` (4.6) passes AA.

Other requirements: never convey status by color alone (always pair with icon + text); links underlined; visible focus ring on all interactive elements; respect `prefers-reduced-motion`.

---

## 8. Suggested implementation setup

**Tailwind (if used)** — map tokens in `tailwind.config`:

```js
theme: {
  extend: {
    colors: {
      heading: 'var(--color-text-heading)',
      body: 'var(--color-text-body)',
      link: 'var(--color-text-link)',
      page: 'var(--color-bg-page)',
      surface: 'var(--color-bg-surface)',
      primary: { DEFAULT: 'var(--color-btn-primary-bg)', hover: 'var(--color-btn-primary-bg-hover)' },
      highlight: { bg: 'var(--color-highlight-bg)', border: 'var(--color-highlight-border)' },
      accent: 'var(--color-border-accent)',
      success: 'var(--success-strong)', error: 'var(--error-strong)',
      warning: 'var(--warning-strong)', info: 'var(--info-strong)',
    },
    fontFamily: { sans: ['Roboto', 'system-ui', 'sans-serif'] },
    borderRadius: { sm: '4px', md: '8px', lg: '12px' },
  },
}
```

**Global base styles**

```css
body { background: var(--color-bg-page); color: var(--color-text-body); font: 400 14px/20px var(--font-sans); }
h1,h2,h3,h4 { color: var(--color-text-heading); font-weight: 500; }
a { color: var(--color-text-link); text-decoration: underline; }
:focus-visible { outline: 2px solid var(--color-border-accent); outline-offset: 2px; }
```

**Primary button reference**

```css
.btn { height: 40px; padding: 0 16px; border: 0; border-radius: var(--radius-sm); font: 500 14px/20px var(--font-sans); cursor: pointer; }
.btn-primary { background: var(--color-btn-primary-bg); color: var(--color-btn-primary-text); }
.btn-primary:hover { background: var(--color-btn-primary-bg-hover); }
.btn-secondary { background: var(--color-btn-secondary-bg); color: var(--color-btn-secondary-text); }
.btn-secondary:hover { background: var(--color-btn-secondary-bg-hover); }
```

**Suggested structure**

```
src/
  styles/tokens.css
  assets/icons/            # from assets/icons
  components/ui/           # Button, Link, Input, Alert, Tag, Icon, Avatar
```

---

## 9. Open questions for design

1. Confirm font family (Roboto) and the type scale in §3.
2. Confirm ORA-200 / ORA-300 hex values (Figma labels are duplicated).
3. Provide success and info status icons (only error and warning exist).
4. Border, radius, spacing, and elevation values were inferred — confirm or supply.
5. Disabled-state colors for buttons and inputs were not specified.
6. Provide an SVG source for the Smart Genie icon.
7. Dark mode: not covered by the supplied frames — assume light theme only.
8. Hatched swatches in Figma (DTE-300, TEA-550, NEU-550, NEU-600) appear to mark a contrast threshold; confirm meaning.
9. What the actual product is (screens, flows). This spec covers foundations only; screen-level layouts would need additional Figma frames.
