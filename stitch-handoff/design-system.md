# Jarlan Design System

## Fonts

| Role | Family | Variable | Usage |
|------|--------|----------|-------|
| Display / Serif | DM Serif Display 400 | `--font-display-family` | Hero numbers, H1/H2 headings, large stat values |
| Body / Sans | Plus Jakarta Sans | `--font-body-family` | All body copy, labels, UI text |
| Mono | JetBrains Mono | `--font-mono-family` | Eyebrow labels, stat labels, data callouts |

### Typography classes
```
font-display          → DM Serif Display
font-mono             → JetBrains Mono
font-sans             → Plus Jakarta Sans (default body)

/* Hero headline */
font-display text-5xl md:text-6xl leading-[1.02] tracking-[-0.04em] text-balance

/* Section heading */
font-display text-3xl leading-[1.05] tracking-[-0.03em] text-balance

/* Stat value (large) */
font-display text-3xl leading-none tracking-[-0.03em]

/* Eyebrow label */
font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[var(--ember)]

/* Body */
text-sm leading-6 text-muted-foreground   (descriptions)
text-base leading-7 font-light            (hero descriptions)
```

---

## Color Tokens

### Brand palette (raw)
```css
--ember:       #ff6b35   /* Primary CTA, active states, eyebrow labels */
--ember-light: #ff8f5e   /* Hover states for ember */
--flame:       #f7c948   /* Secondary accent, chart lines, gradients */
--flame-light: #fada7a   /* Lighter flame for highlights */
--hearth:      #1a1118   /* Dark card/hero backgrounds */
--hearth-warm: #2a1f28   /* Slightly lighter dark surface */
--coal:        #0d0a0e   /* Darkest — dark mode page background */
--ash:         #f5f0eb   /* Light mode page background */
--ash-warm:    #ede5dc   /* Slightly warmer ash */
--smoke:       #8a7f87   /* Muted in dark contexts */
--glow:        #ff4444   /* Danger/alert red */
--glow-soft:   #ff6b6b   /* Softer danger red */
--sky:         #3b82c4   /* Informational/chart blue */
--sky-light:   #6ba3d6   /* Lighter sky */
--success:     #22c55e   /* Green — positive outcomes */
--warning:     #fbbf24   /* Amber — caution */
--danger:      #ef4444   /* Red — risk/loss */
```

### Semantic tokens (light mode)
```css
--background:          var(--ash)            /* #f5f0eb */
--foreground:          #2c2027
--card:                #fbf6f2
--card-foreground:     #2c2027
--popover:             #fff9f4
--popover-foreground:  #2c2027
--primary:             var(--ember)          /* #ff6b35 */
--primary-foreground:  #fff7f1
--secondary:           #fff1d2
--secondary-foreground:#5d3b16
--muted:               #f0e7df
--muted-foreground:    #776b73
--accent:              #fbe6d9
--accent-foreground:   #4b2c1a
--border:              rgba(44, 32, 39, 0.12)
--input:               #ede5dc
--ring:                rgba(255, 107, 53, 0.42)
--radius:              1rem
```

### Semantic tokens (dark mode)
```css
--background:          var(--coal)           /* #0d0a0e */
--foreground:          var(--ash)            /* #f5f0eb */
--card:                var(--hearth)         /* #1a1118 */
--card-foreground:     var(--ash)
--popover:             var(--hearth-warm)    /* #2a1f28 */
--primary:             var(--ember)          /* unchanged */
--secondary:           rgba(255, 255, 255, 0.08)
--muted:               rgba(255, 255, 255, 0.06)
--muted-foreground:    #b9aeb6
--accent:              rgba(255, 107, 53, 0.12)
--accent-foreground:   #ffd8ca
--border:              rgba(255, 255, 255, 0.08)
--input:               rgba(255, 255, 255, 0.06)
```

### Chart colors
```css
--chart-1: var(--ember)    /* Primary series — portfolio/balance */
--chart-2: var(--flame)    /* Secondary series — contributions */
--chart-3: var(--sky)      /* Tertiary — comparison/scenario */
--chart-4: var(--success)  /* Positive outcome */
--chart-5: var(--warning)  /* Caution threshold */
--chart-contributions: #c4b8af  (light) / var(--hearth-warm) (dark)
```

---

## Shadows
```css
--shadow-soft:    0 8px 24px rgba(26, 17, 24, 0.06)     /* default card lift */
--shadow-surface: 0 18px 48px rgba(26, 17, 24, 0.08)    /* hero/large surface */
--shadow-glow:    0 10px 30px rgba(255, 107, 53, 0.18)  /* ember accent glow */
--shadow-focus:   0 0 0 4px rgba(255, 107, 53, 0.16)    /* focus ring */
/* Dark mode shadows are stronger: 0.36 / 0.24 / 0.28 / 0.18 */
```

---

## Border Radius
```css
--radius-sm: 8px    (rounded-lg equivalent — small controls)
--radius-md: 12px   (rounded-xl — stat cards, inputs)
--radius-lg: 16px   (rounded-2xl — main cards)
--radius-xl: 20px   (large surfaces)
/* PageHero uses rounded-[28px] */
/* Nav pills use rounded-full */
```

---

## Background

The page body uses a layered radial gradient over the base background:
```css
body {
  background:
    radial-gradient(ellipse at 50% 0%, rgba(255,107,53,0.14) 0%, transparent 38%),
    radial-gradient(ellipse at 50% 100%, rgba(247,201,72,0.08) 0%, transparent 34%),
    var(--background);
}
```
- Top: subtle ember orange bloom from center-top
- Bottom: faint flame yellow glow from center-bottom
- The glows create warmth and depth without being distracting

---

## Key Component Patterns

### PageHero
Dark gradient hero block used as page header on most tool pages.
```
Background: linear-gradient(160deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02)),
            linear-gradient(135deg, --hearth 0%, --hearth-warm 48%, rgba(255,107,53,0.16) 100%)
Corner radius: 28px
Padding: px-6 py-8 (md: px-10 py-12)
Text color: --ash (warm off-white)
Max-width: 7xl, mx-auto, px-6 pt-8

Internal decorative glows (pointer-events-none, absolute):
  - Bottom: radial ellipse of ember/flame blend (blur at bottom)
  - Top-right: radial circle ember glow (blur-3xl)
  - Top-left: radial circle flame glow (blur-3xl)

Structure:
  eyebrow (mono, ember) → badges (optional) → H1 (display, 4xl-6xl) → description (lg, light, 80% white) → actions (flex wrap gap-3)
```

### SectionHeading
```
eyebrow: font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[var(--ember)]
title:   font-display text-3xl leading-[1.05] tracking-[-0.03em] text-balance
desc:    text-sm/base text-muted-foreground leading-6
Layout:  flex-col md:flex-row md:items-end md:justify-between
         Left: max-w-3xl space-y-2
         Right: optional actions (shrink-0)
```

### StatCard (tones)
```
default: bg-muted/40, border surface-border, value text-foreground
accent:  bg-[rgba(255,107,53,0.08)], border rgba(255,107,53,0.18), value text-[var(--ember)]
success: bg-[rgba(34,197,94,0.08)],  border rgba(34,197,94,0.18),  value text-[var(--success)]
warning: bg-[rgba(251,191,36,0.08)], border rgba(251,191,36,0.18), value text-[var(--warning)]
danger:  bg-[rgba(239,68,68,0.08)],  border rgba(239,68,68,0.18),  value text-[var(--danger)]

Structure: rounded-xl border p-4 shadow-[var(--shadow-soft)]
  label: font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground
  value: mt-2 font-display text-3xl leading-none tracking-[-0.03em]
  desc:  mt-2 text-sm text-muted-foreground
```

### ChartShell
```
Card wrapper with overflow-hidden
CardHeader: border-b border-border/50, bg-[linear-gradient(180deg,var(--surface-highlight),transparent)]
  Contains SectionHeading (titleAs="h3", titleClassName="text-[1.9rem]")
CardContent: space-y-6 pt-6
```

### Navigation — Primary (desktop)
```
Header: sticky top-0 z-40, border-b border-border/70, bg-background/75 backdrop-blur-xl
  Logo: font-display text-xl tracking-[-0.03em]
  "FIRECALC" pill: font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground

Nav links (non-Pro): rounded-full px-3 py-1.5 text-sm
  Active: bg-[rgba(255,107,53,0.1)] font-medium text-foreground
  Rest: text-muted-foreground hover:bg-muted/70 hover:text-foreground

Pro nav link: rounded-full px-3 py-1.5 gap-1.5, star icon + "Pro" label
  Inactive: bg-gradient ember→flame 8% opacity, text-[var(--ember)]
  Active:   bg-gradient ember→flame filled, text-white, shadow-[0_2px_12px_rgba(255,107,53,0.35)]
```

### Navigation — Sub-nav (desktop)
```
mt-2, border-t border-border/40, pt-2, flex-wrap items-center gap-1.5
Sub-items: inline-flex rounded-full px-3 py-1 text-sm
  Active: bg-[rgba(255,107,53,0.1)] font-medium text-foreground
  Rest: text-muted-foreground hover:text-foreground
```

### Cards
```css
/* base card */
rounded-lg border bg-card text-card-foreground shadow-[var(--shadow-soft)]

/* card header */
flex flex-col space-y-1.5 p-6

/* card content */
p-6 pt-0

/* interactive card (hover) */
transition-colors group-hover:border-border
```

---

## Spacing & Layout
- Max content width: `max-w-7xl mx-auto`
- Page horizontal padding: `px-4 sm:px-6`
- Page sections use `space-y-6` or `space-y-8` between sections
- Grid layouts: `grid gap-4 md:grid-cols-2` (2-col) or `md:grid-cols-2 xl:grid-cols-3` (3-col)
- Workspace split: typically a 2/3 + 1/3 or 60/40 split for controls vs. results

---

## Interaction States
- Focus ring: `ring-2 ring-ring ring-offset-2` (ember color)
- Hover transitions: `transition-colors duration-200` or `duration-300`
- Scale on hover for accent icons: `group-hover:scale-110`
- `text-selection` color: `rgba(255, 107, 53, 0.26)` background

---

## Icons
Lucide React icon library. Common uses:
- `ArrowRight` — CTA buttons
- `ChevronDown/Up` — collapsed sections
- `Lock` — "data stays local" footer
- `Star (filled)` — Pro nav item
- Theme icons: inline SVG sun/moon (not Lucide)
