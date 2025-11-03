# Accessibility Guidelines - Map My Panel

## Color Contrast Standards

All themes in Map My Panel must meet **WCAG AA** accessibility standards for color contrast.

### Required Contrast Ratios
- **Normal text** (< 18pt or < 14pt bold): **4.5:1 minimum**
- **Large text** (≥ 18pt or ≥ 14pt bold): **3:1 minimum**
- **UI components** (buttons, form controls): **3:1 minimum**

---

## Theme Color Pairs to Test

For each theme, the following color combinations **must** meet WCAG AA standards:

### Critical Pairs (4.5:1 minimum):
1. **foreground** on **background** - Main text
2. **card-foreground** on **card** - Card text
3. **primary-foreground** on **primary** - Primary buttons
4. **secondary-foreground** on **secondary** - Badges, pills
5. **destructive-foreground** on **destructive** - Delete buttons
6. **muted-foreground** on **background** - Secondary text
7. **accent-foreground** on **accent** - Accent badges/buttons

### Important Pairs (3:1 minimum):
8. **border** on **background** - Visual separation
9. **muted** on **background** - Hover states

---

## How to Test Contrast Ratios

### Method 1: Online Tools (Recommended)
1. **WebAIM Contrast Checker**: https://webaim.org/resources/contrastchecker/
   - Convert HSL to Hex using: https://convertingcolors.com/
   - Enter foreground and background colors
   - Ensure "AA" rating (green checkmark)

2. **Coolors Contrast Checker**: https://coolors.co/contrast-checker/
   - Quick visual feedback
   - Shows pass/fail for WCAG AA

### Method 2: Browser DevTools
1. Open Chrome DevTools (F12)
2. Inspect any text element
3. Click on the color swatch next to `color` in Styles panel
4. View "Contrast ratio" section at bottom
5. Look for "AA" checkmark

### Method 3: Manual Calculation
Use the formula: https://www.w3.org/WAI/GL/wiki/Contrast_ratio
```
Contrast Ratio = (L1 + 0.05) / (L2 + 0.05)
where L1 is luminance of lighter color
      L2 is luminance of darker color
```

---

## HSL to RGB Conversion (for testing)

When testing theme colors defined in HSL, convert to RGB first:

**Formula**:
```
hsl(H, S%, L%) where:
H = Hue (0-360)
S = Saturation (0-100%)
L = Lightness (0-100%)
```

**Quick Reference**:
- `0 0% 0%` = Black (RGB: 0, 0, 0)
- `0 0% 100%` = White (RGB: 255, 255, 255)
- `220 16% 22%` = Dark blue-gray (RGB: ~48, 52, 65)
- `179 25% 55%` = Teal (RGB: ~105, 155, 155)

Use online tools like https://convertingcolors.com/ for accurate conversion.

---

## Theme Checklist

When creating or modifying a theme, verify these combinations:

- [ ] Main text is readable on background
- [ ] Entity type badges (`bg-secondary text-secondary-foreground`) are readable
- [ ] Primary buttons have clear text
- [ ] Destructive/delete buttons are readable
- [ ] Muted text meets minimum 4.5:1 contrast
- [ ] Form inputs have visible borders
- [ ] Hover states are distinguishable

---

## Common Issues Fixed

### Issue 1: Nordic Dark - Entity Type Badges
**Problem**: `outlet` badge had poor contrast (gray on chalky teal)
**Solution**:
- Darkened secondary background from `179 25% 65%` to `179 25% 55%`
- Darkened secondary-foreground from `220 16% 22%` to `220 16% 15%`
- Added explicit `text-secondary-foreground` class to badge component

### Issue 2: Missing Foreground Classes
**Problem**: Components using `bg-*` without corresponding `text-*-foreground`
**Solution**: Always pair background colors with their foreground colors:
```jsx
// ❌ Bad
<span className="bg-secondary">Text</span>

// ✅ Good
<span className="bg-secondary text-secondary-foreground">Text</span>
```

---

## Best Practices

### 1. Always Pair Colors
Never use a background color without its corresponding foreground color:
- `bg-primary` → `text-primary-foreground`
- `bg-secondary` → `text-secondary-foreground`
- `bg-destructive` → `text-destructive-foreground`
- `bg-muted` → `text-muted-foreground`

### 2. Test with Real Content
- Don't just test with placeholder text
- Test with actual entity names, breaker labels, etc.
- Test in both light and dark ambient lighting

### 3. Consider Color Blindness
- Don't rely on color alone to convey information
- Use icons, labels, or patterns in addition to color
- Test with color blindness simulators

### 4. Test Hover/Focus States
- Ensure hover states have sufficient contrast
- Focus indicators must be visible (3:1 minimum)
- Don't remove focus outlines without replacing them

---

## Automated Testing (Future)

Consider adding automated accessibility testing:
- **jest-axe**: Unit test accessibility
- **pa11y**: CLI tool for accessibility testing
- **Lighthouse**: Built into Chrome DevTools

```bash
# Example with pa11y
npm install -D pa11y
pa11y http://localhost:5174
```

---

## Resources

- **WCAG 2.1 Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **WebAIM Articles**: https://webaim.org/articles/
- **Contrast Checker**: https://webaim.org/resources/contrastchecker/
- **Color Converter**: https://convertingcolors.com/
- **A11y Project**: https://www.a11yproject.com/

---

**Last Updated**: 2025-11-03
**Maintained by**: Development Team
