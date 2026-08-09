# Admin UI Makeover Plan

## Goal

Bring the admin area visually and responsively in line with the public Mobicare site while preserving all existing routes, data flows, forms, tables, dialogs, and permissions.

## Recommended approach

1. **Rebuild the shared admin shell around the public design language**
   - Update `src/admin/AdminLayout.jsx` to provide a polished workspace frame with the same emerald theme tokens, rounded surfaces, glass treatment, active-link emphasis, typography hierarchy, and icon/button language used by `Header.jsx` and `BottomNav.jsx`.
   - Keep all existing destinations available on desktop through a clear sidebar.
   - Keep the live-site link, connection status, mobile menu behavior, overlay dismissal, and logout behavior intact.
   - Make the active route treatment consistent and ensure nested admin routes remain correctly highlighted.

2. **Make mobile navigation intentional rather than crowded**
   - Preserve the existing five-item mobile priority model: Dashboard, Products, Orders, Bookings, and More.
   - Make the More item open the existing full admin navigation/drawer so Site Content, Categories, and Settings remain reachable without forcing every destination into a cramped bottom bar.
   - Retain fixed positioning, safe-area spacing, content bottom padding, and the current 900px responsive breakpoint; verify the header, drawer, overlay, and bottom bar do not overlap or scroll away.

3. **Establish shared admin presentation styles in `src/styles/globals.css`**
   - Refine admin sidebar/header/navigation, workspace backgrounds, cards, stat tiles, tables, tabs, forms, dialogs, alerts, empty states, and mobile states using the existing CSS variables rather than introducing a separate palette.
   - Preserve both light and dark theme behavior and reuse existing public-site variables such as `--surface`, `--surface-container-*`, `--primary`, `--on-surface`, `--on-surface-variant`, and `--outline-variant`.
   - Keep current breakpoints, adding only narrowly scoped rules required to prevent layout shifts and viewport overlap.
   - Replace admin-specific inline presentation styles only where needed for consistent shared styling; do not alter unrelated public-page styles.

4. **Standardize repeated admin page patterns without changing behavior**
   - Align the repeated page header/action layout across `Dashboard.jsx`, `Products.jsx`, `Categories.jsx`, `Orders.jsx`, `Bookings.jsx`, `SiteContent.jsx`, and `Settings.jsx`.
   - Give tables a consistent surface, header, row, overflow, and action treatment across Dashboard, Products, Orders, and Bookings.
   - Give empty states, status chips, CRUD dialogs, forms, and action groups consistent spacing, hierarchy, focus, and responsive behavior.
   - Preserve each page’s existing state, event handlers, API/store calls, and dialog workflows.

5. **Refresh the admin login presentation**
   - Update `src/admin/AdminLogin.jsx` to use the same brand hierarchy, surface treatment, field/button styling, theme behavior, and responsive spacing as the redesigned workspace.
   - Preserve authentication behavior, error messaging, loading states, and password visibility behavior.

## Critical files

- `src/admin/AdminLayout.jsx` — desktop shell, sidebar, header, drawer, and mobile navigation behavior.
- `src/styles/globals.css` — shared admin tokens, layout, components, responsive breakpoints, and theme styling.
- `src/admin/AdminLogin.jsx` — entry screen visual alignment.
- `src/admin/Dashboard.jsx`
- `src/admin/Products.jsx`
- `src/admin/Categories.jsx`
- `src/admin/Orders.jsx`
- `src/admin/Bookings.jsx`
- `src/admin/SiteContent.jsx`
- `src/admin/Settings.jsx`

`src/App.jsx` and `src/components/RequireAdmin.jsx` should only change if implementation reveals a shell or route integration issue; no route or authorization redesign is planned.

## Validation

- Check desktop and mobile layouts at the existing 900px and 600px breakpoints.
- Verify sidebar active states, mobile drawer/More behavior, fixed bottom navigation, safe-area padding, and no content overlap.
- Exercise the golden paths for login, dashboard navigation, editing site content, product/category CRUD, order/booking dialogs, settings, logout, and View Live Site.
- Verify both light and dark themes preserve readable contrast and the public site remains visually unchanged outside shared token usage.
