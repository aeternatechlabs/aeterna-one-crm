# Aeterna One CRM — Shared Common Component Inventory (`docs/COMPONENT_INVENTORY.md`)

> **Document Type:** UI Component Design System & Accessibility Specification (Deliverable for Phase A Day 4)  
> **Directory Scope:** `client/src/components/common/`  
> **Design Tokens Source:** `client/src/styles/variables.css` & `client/src/styles/components.css`  
> **Test Suite:** `client/src/components/common/__tests__/` (Vitest + React Testing Library + JSDOM)  
> **Canonical Barrel Import:** `import { Button, Input, Select, Badge, Card, Modal, ConfirmDialog, LoadingSpinner, StatCard, ErrorBoundary } from '../components/common';` (or from `'@/components/common'`)  
> **Last Updated:** 16 November 2026 (Phase A Day 4 Milestone)

---

## 1. Component Architecture Overview

All 10 common components in Aeterna One CRM are built as accessible, composable UI primitives styled with the CRM's **Royal Maroon & Imperial Gold** luxury design tokens.

| # | Component | Primary Purpose | ARIA Role / Semantic Element | Primary Test File |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `Button` | Action trigger with loading & focus-visible rings | `<button>` (`role="button"`) | `Button.test.jsx` |
| 2 | `Input` | Text input field with label and error/help wiring | `<input>` with associated `<label>` | `Input.test.jsx` |
| 3 | `Select` | Custom luxury dropdown with keyboard listbox navigation | `role="button"` (trigger) + `role="listbox"` / `role="option"` | `Select.test.jsx` |
| 4 | `Badge` | Status indicator & categorization tag | `<span>` with semantic badge classes | `Badge.test.jsx` |
| 5 | `Card` | Structured panel container with header & body | `<div>` with `.card` container | `Card.test.jsx` |
| 6 | `Modal` | Overlay dialog with focus trapping and focus restore | `role="dialog"` (`aria-modal="true"`) | `Modal.test.jsx` |
| 7 | `ConfirmDialog` | Two-action confirmation modal with safe cancel focus | `role="alertdialog"` (`aria-modal="true"`) | `ConfirmDialog.test.jsx` |
| 8 | `LoadingSpinner` | Animated status spinner with screen reader announcement | `role="status"` (`aria-live="polite"`) | `LoadingSpinner.test.jsx` |
| 9 | `StatCard` | Metric display with trend badge & count animation | `<div>` with `.stat-card` container | `StatCard.test.jsx` |
| 10 | `ErrorBoundary` | React class boundary catching client render crashes | `<div className="status-page">` fallback | `ErrorBoundary.test.jsx` |
| 11 | `index.js` | Centralized barrel export exporting all 10 primitives | JavaScript Module Re-export | `client/src/components/common/index.js` |

---

## 2. Detailed Component Inventory

### 2.1 `Button` (`client/src/components/common/Button.jsx`)

* **Purpose:** Universal interactive button primitive supporting standard variants, sizing, loading spinners, and forward-ref binding.
* **Canonical Import:** `import { Button } from '../components/common';`
* **Props Table:**

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `children` | `ReactNode` | — | Button label, text, or icon contents |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Native HTML button type |
| `variant` | `'primary' \| 'secondary' \| 'outline' \| 'danger' \| 'ghost'` | `'primary'` | Visual style variant |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Padding and font-size scaling |
| `disabled` | `boolean` | `false` | Disables interaction and dims opacity |
| `loading` | `boolean` | `false` | Shows `.spinner-sm` with "Processing..." text and disables button |
| `onClick` | `function` | — | Click event callback |
| `className` | `string` | `''` | Additional Tailwind / CSS classes |
| `ref` | `React.Ref` | — | Forwarded to underlying HTML `<button>` element |

* **Variants & States:**
  * Variants: `btn-primary` (Maroon background `#680b22`), `btn-outline` (White background with neutral border), `btn-danger` (Red semantic `#b91c1c`), `btn-ghost` (Transparent background).
  * States: default, hover (`:hover:not(:disabled)`), active, disabled (`opacity: 0.6; cursor: not-allowed`), loading (`btn-loading`).
* **Design Tokens Consumed:**
  * `--color-maroon-800` (`#680b22`), `--color-maroon-700` (`#7b0e29`), `--color-gold-500` (`#e5a93c`), `--color-border-default` (`#e8d7c4`).
* **Accessibility Behavior:**
  * Keyboard navigable; activated by `Enter` and `Space`.
  * Disabled state sets native HTML `disabled`, preventing tab focus and click triggers.
  * Explicit focus-visible ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#e5a93c]`.
* **Automated Test Coverage:** `client/src/components/common/__tests__/Button.test.jsx` (7 assertions covering focus, Enter/Space activation, disabled state, loading state, focus ring classes, and ref forwarding).

---

### 2.2 `Input` (`client/src/components/common/Input.jsx`)

* **Purpose:** Text input component with label binding, validation error alerting, helper text, and required indicators.
* **Canonical Import:** `import { Input } from '../components/common';`
* **Props Table:**

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `label` | `string` | — | Field label text rendered above input |
| `id` | `string` | — | HTML identifier for input and label association |
| `name` | `string` | — | Form field name |
| `type` | `string` | `'text'` | Input type (`text`, `email`, `password`, `number`, etc.) |
| `value` | `string \| number` | — | Controlled input value |
| `onChange` | `function` | — | Input change handler |
| `placeholder` | `string` | `''` | Placeholder text |
| `error` | `string` | `''` | Validation error message (triggers `aria-invalid="true"`) |
| `helperText` | `string` | `''` | Subtext instruction when no error is present |
| `required` | `boolean` | `false` | Enforces HTML `required`, `aria-required`, and renders `*` |
| `disabled` | `boolean` | `false` | Disables field interaction |
| `className` | `string` | `''` | Wrapper class name |

* **Variants & States:**
  * States: default, focus (`focus:border-[#e5a93c] focus:ring-2`), error (`input-error`, red border `#b91c1c`), disabled (`opacity: 0.6`).
* **Design Tokens Consumed:**
  * `--color-border-default` (`#e8d7c4`), `--color-bg-canvas` (`#fcf8f3`), `--color-text-primary` (`#2d0d15`), `--color-danger` (`#b91c1c`).
* **Accessibility Behavior:**
  * Label is bound to input via `htmlFor={inputId}`.
  * Validation errors are tagged with `id={`${inputId}-error`}` and `role="alert"`.
  * `aria-describedby` dynamically wires to error id or helper id.
  * `aria-invalid={error ? 'true' : 'false'}` and `aria-required={required ? 'true' : undefined}`.
* **Automated Test Coverage:** `client/src/components/common/__tests__/Input.test.jsx` (6 assertions covering label association, error wiring, helper wiring, required/disabled ARIA attributes, and typing).

---

### 2.3 `Select` (`client/src/components/common/Select.jsx`)

* **Purpose:** Custom luxury select dropdown supporting object/primitive options, auto-placement, search clearance, and full WAI-ARIA Listbox keyboard navigation.
* **Canonical Import:** `import { Select } from '../components/common';`
* **Props Table:**

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `label` | `string` | — | Label rendered above select |
| `name` | `string` | — | Form field name |
| `options` | `Array<string \| number \| object>` | `[]` | List of options `{ value, label, disabled, icon, badge }` |
| `value` | `string \| number` | — | Currently selected value |
| `onChange` | `function` | — | Callback returning synthetic event `(e, option)` |
| `placeholder` | `string` | `'Select an option...'` | Placeholder when unselected |
| `disabled` | `boolean` | `false` | Disables dropdown interaction |
| `required` | `boolean` | `false` | Required indicator |
| `error` | `string` | `''` | Error message string |
| `helperText` | `string` | `''` | Explanatory helper text |
| `variant` | `'default' \| 'compact' \| 'pill'` | `'default'` | Size and border styling variant |
| `align` | `'left' \| 'right'` | `'left'` | Menu alignment |
| `placement` | `'auto' \| 'top' \| 'bottom'` | `'auto'` | Menu popover direction |
| `icon` | `ReactNode` | `null` | Leading icon in trigger |
| `id` | `string` | — | Element identifier |

* **Variants & States:**
  * Variants: `select-default` (standard form height 42px), `select-compact` (table filter height 32px), `select-pill` (rounded filter button).
  * States: default, open (`select-trigger-open`), error (`select-trigger-error`), disabled, active option (`dropdown-item-hovered`).
* **Design Tokens Consumed:**
  * `--color-maroon-800` (`#680b22`), `--color-gold-500` (`#e5a93c`), `--color-gold-50` (`#fffbeb`), `--shadow-warm-md`.
* **Accessibility Behavior:**
  * Trigger exposes `role="button"`, `aria-haspopup="listbox"`, `aria-expanded={isOpen}`, and accessible label.
  * Menu exposes `role="listbox"`, options expose `role="option"`, `aria-selected`, and `aria-disabled`.
  * Keyboard navigation:
    * `ArrowDown` / `ArrowUp`: moves highlight index across options (automatically skipping disabled entries).
    * `Enter` / `Space`: opens closed dropdown; selects active option when open.
    * `Escape`: closes listbox without selecting and restores focus to the trigger button.
    * Safe `scrollIntoView` invocation guarded against non-DOM test runners.
* **Automated Test Coverage:** `client/src/components/common/__tests__/Select.test.jsx` (4 assertions covering trigger ARIA attributes, listbox expansion, option selection, arrow navigation, and Escape restoration).

---

### 2.4 `Badge` (`client/src/components/common/Badge.jsx`)

* **Purpose:** Compact visual status chip for pipeline stages, branch labels, and role indicators.
* **Canonical Import:** `import { Badge } from '../components/common';`
* **Props Table:**

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `children` | `ReactNode` | — | Text or icon contents of the badge |
| `variant` | `'default' \| 'primary' \| 'success' \| 'warning' \| 'danger' \| 'info'` | `'default'` | Semantic color scheme |
| `size` | `'sm' \| 'md'` | `'md'` | Size variant |
| `className` | `string` | `''` | Extra CSS classes |

* **Design Tokens Consumed:**
  * `--color-success-bg`, `--color-success`, `--color-warning-bg`, `--color-warning`, `--color-danger-bg`, `--color-danger`, `--color-maroon-100`.
* **Accessibility Behavior:**
  * Non-interactive inline element; naturally skipped by keyboard focus without creating focus traps.
* **Automated Test Coverage:** `client/src/components/common/__tests__/Badge.test.jsx` (3 assertions covering text rendering, variant classes, and tab navigation bypass).

---

### 2.5 `Card` (`client/src/components/common/Card.jsx`)

* **Purpose:** Standard structured container panel with title header, subtitle, tag badge, right-hand actions, and content body.
* **Canonical Import:** `import { Card } from '../components/common';`
* **Props Table:**

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `title` | `string` | — | Card header title |
| `subtitle` | `string` | — | Secondary subtitle |
| `tag` | `string` | — | Status tag pill rendered in header |
| `actions` | `ReactNode` | — | Right-aligned action buttons or controls |
| `children` | `ReactNode` | — | Card body elements |
| `className` | `string` | `''` | Container class name |
| `bodyClassName` | `string` | `''` | Body container class name |

* **Design Tokens Consumed:**
  * `--color-bg-surface` (`#ffffff`), `--color-border-subtle` (`#f3e6d8`), `--shadow-warm-xs`, `--color-text-primary`.
* **Accessibility Behavior:**
  * Header title renders as semantic `<h3>`. Interactive children inside actions or body remain fully keyboard-navigable without container traps.
* **Automated Test Coverage:** `client/src/components/common/__tests__/Card.test.jsx` (2 assertions covering header elements, body content, and nested button tabbing).

---

### 2.6 `Modal` (`client/src/components/common/Modal.jsx`)

* **Purpose:** Accessible overlay modal dialog for forms, candidate editing, and deep workflows.
* **Canonical Import:** `import { Modal } from '../components/common';`
* **Props Table:**

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | — | Controls modal visibility |
| `onClose` | `function` | — | Dismissal handler triggered by close button, Escape, or backdrop |
| `title` | `string` | — | Dialog title heading (bound to `aria-labelledby`) |
| `children` | `ReactNode` | — | Modal body content |
| `footer` | `ReactNode` | — | Modal footer action buttons |
| `maxWidth` | `string` | `'520px'` | Maximum container width |
| `ariaLabel` | `string` | — | Fallback label when title is omitted |

* **Design Tokens Consumed:**
  * `--color-bg-glass`, `--color-bg-surface`, `--color-border-subtle`, `--shadow-warm-lg`.
* **Accessibility Behavior:**
  * Exposes `role="dialog"` and `aria-modal="true"`.
  * Title is linked via `aria-labelledby="modal-dialog-title"`.
  * Escape key invokes `onClose()`.
  * Focus Trap (`useFocusTrap` hook): initial focus lands on first interactive child (close button or first input); Tab and Shift+Tab cycle strictly inside the modal container.
  * Focus Restoration: upon closing, keyboard focus returns automatically to the trigger element that launched the modal.
  * Locks document body scrolling (`overflow: hidden`) while open.
* **Automated Test Coverage:** `client/src/components/common/__tests__/Modal.test.jsx` (5 assertions covering ARIA attributes, title wiring, Escape key dismissal, focus trap cycling, and focus restoration to trigger).

---

### 2.7 `ConfirmDialog` (`client/src/components/common/ConfirmDialog.jsx`)

* **Purpose:** Destructive and high-impact action confirmation dialog (e.g. stage cancellation, record deletion).
* **Canonical Import:** `import { ConfirmDialog } from '../components/common';`
* **Props Table:**

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | — | Controls dialog visibility |
| `onClose` | `function` | — | Cancellation handler |
| `onConfirm` | `function` | — | Confirmation execution handler |
| `title` | `string` | `'Please Confirm'` | Dialog title |
| `message` | `string` | — | Detailed explanation of the action's consequence |
| `confirmText` | `string` | `'Confirm'` | Confirm button label |
| `cancelText` | `string` | `'Cancel'` | Cancel button label |
| `danger` | `boolean` | `false` | Sets red warning icon and danger button styling |
| `loading` | `boolean` | `false` | Displays spinner on confirm button and disables buttons |

* **Design Tokens Consumed:**
  * `--color-danger` (`#b91c1c`), `--color-warning` (`#b45309`), `--color-bg-surface`, `--shadow-warm-lg`.
* **Accessibility Behavior:**
  * Exposes `role="alertdialog"` and `aria-modal="true"`.
  * Safety focus default: Initial focus lands on the **Cancel** button via `cancelBtnRef` to prevent accidental confirmation.
  * Focus Trap (`useFocusTrap`): Tab and Shift+Tab cycle between Close icon, Cancel button, and Confirm button.
  * Escape key cancels dialog. Focus restores to launch trigger on close.
* **Automated Test Coverage:** `client/src/components/common/__tests__/ConfirmDialog.test.jsx` (6 assertions covering alertdialog ARIA semantics, initial Cancel focus, Escape dismissal, focus trap, focus restoration, and keyboard confirmation).

---

### 2.8 `LoadingSpinner` (`client/src/components/common/LoadingSpinner.jsx`)

* **Purpose:** Visual and auditory loading state indicator for async queries and page transitions.
* **Canonical Import:** `import { LoadingSpinner } from '../components/common';`
* **Props Table:**

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `text` | `string` | `'Loading application...'` | Text announced to screen readers and displayed below spinner |

* **Design Tokens Consumed:**
  * `--color-gold-500` (`#e5a93c`), `--color-text-secondary`.
* **Accessibility Behavior:**
  * Exposes `role="status"` and `aria-live="polite"` so screen readers announce loading without interrupting current speech.
  * Decorative spinner graphic is tagged with `aria-hidden="true"`.
* **Automated Test Coverage:** `client/src/components/common/__tests__/LoadingSpinner.test.jsx` (3 assertions covering `role="status"`, `aria-live="polite"`, graphic `aria-hidden`, and default message).

---

### 2.9 `StatCard` (`client/src/components/common/StatCard.jsx`)

* **Purpose:** Metric KPI summary card featuring easing count-up animation, color variants, and trend indicators.
* **Canonical Import:** `import { StatCard } from '../components/common';`
* **Props Table:**

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `title` | `string` | — | Metric label (e.g. "Total Applications") |
| `value` | `string \| number` | — | Numeric or string metric value |
| `icon` | `ReactNode` | — | Metric icon graphic |
| `trend` | `'up' \| 'down' \| 'neutral'` | — | Trend arrow direction |
| `trendValue` | `string` | — | Formatted percentage or trend text (e.g. "+8% vs last month") |
| `color` | `'blue' \| 'green' \| 'amber' \| 'purple'` | `'blue'` | Card theme accent |
| `className` | `string` | `''` | Extra classes |

* **Design Tokens Consumed:**
  * `--color-maroon-800`, `--color-gold-600`, `--color-success`, `--color-danger`, `--shadow-warm-xs`.
* **Accessibility Behavior:**
  * Title and formatted value render as plain readable text.
  * Decorative SVG icons (`TrendingUp`, `TrendingDown`, `Minus`, and custom icon) are tagged with `aria-hidden="true"`.
  * Non-interactive container; skipped cleanly by keyboard navigation.
* **Automated Test Coverage:** `client/src/components/common/__tests__/StatCard.test.jsx` (3 assertions covering text readability, decorative icon `aria-hidden`, and keyboard skip).

---

### 2.10 `ErrorBoundary` (`client/src/components/common/ErrorBoundary.jsx`)

* **Purpose:** React class lifecycle error boundary preventing entire application crash when a component render throws.
* **Canonical Import:** `import { ErrorBoundary } from '../components/common';`
* **Props Table:**

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `children` | `ReactNode` | — | Subtree protected by boundary |

* **Design Tokens Consumed:**
  * `--color-danger` (`#b91c1c`), `--color-danger-bg` (`#fef2f2`), `--color-danger-border` (`#fecaca`).
* **Accessibility Behavior:**
  * Renders accessible fallback containing an `<h2>` heading ("Application Error"), explanation, and a keyboard-focusable `<Button>` ("Reload Workspace").
* **Automated Test Coverage:** `client/src/components/common/__tests__/ErrorBoundary.test.jsx` (2 assertions covering normal child rendering, error catching, fallback rendering, and reload button keyboard focusability).

---

### 2.11 `index.js` (`client/src/components/common/index.js`)

* **Purpose:** Centralized barrel export exporting all 10 common primitives with clean module resolution.
* **Canonical Import:**
  ```javascript
  import {
    Badge,
    Button,
    Card,
    ConfirmDialog,
    ErrorBoundary,
    Input,
    LoadingSpinner,
    Modal,
    Select,
    StatCard,
  } from '@/components/common';
  ```
