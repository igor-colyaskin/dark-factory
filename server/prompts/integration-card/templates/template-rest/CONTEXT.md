# templateSF — AI Context Document

## Purpose and nature of this project

`templateSF` is a **reusable SAP Work Zone card template**, not a finished application.
It exists as a starting point for developers who need to build a new "Simple Form" card
in an SAP Work Zone Content Package. The template contains placeholder labels, a generic
field mapping, and stub logic that developers replace with real BE field names and real labels.

The card is a **SAP UI Integration Card** of type `Component`, which means it is a full
SAP UI5 component (with a `Component.js`, a view, a controller, and a model) packaged as
a card instead of a standalone Fiori app. It runs inside the SAP Work Zone shell; it does
NOT run as a standalone Fiori Launchpad tile and cannot be migrated with SAP Fiori Tools.

---

## Repository context

- **Monorepo path:** `content/templateSF/` inside `partner-work-zone-content-template`
- **Branch convention:** feature branches, merged to `develop`
- **Other cards** in the same monorepo (e.g. `content/Compliance/due-diligence-assessments-card/`)
  are finished cards that were originally cloned from this template.

---

## Technology stack

| Concern | Technology |
|---|---|
| UI framework | SAP UI5 (`sap.m`, `sap.ui.layout.form`) |
| Card SDK | `com.sap.fiorireuselibrary.ui5cardssdk` (reuse lib, not open-source) |
| Module system | `sap.ui.define` / `sap.ui.require` (AMD, not ES modules) |
| Build tool | `@ui5/cli v4` (`ui5 serve`, `ui5 build`) |
| Live reload | `ui5-middleware-livereload` (manual `<script>` tag in `index.html`) |
| Unit tests | QUnit + Sinon, run via `ui5 serve` test runner |
| Linting | ESLint 10 flat config (root `eslint.config.mjs`, do not modify) |
| i18n | `sap.ui.model.resource.ResourceModel`, `i18n/i18n.properties` |
| Data model | `sap.ui.model.json.JSONModel` (set programmatically in `onInit`) |

---

## Architecture overview

```
templateSF/
├── src/
│   ├── Component.js          ← Card lifecycle (do not touch for new cards)
│   ├── Main.controller.js    ← View controller: onInit, onCardReady, _loadData
│   ├── View.view.xml         ← Form layout with 4 columns, 3 fields each
│   ├── helpers/
│   │   └── DataHelper.js     ← Network + data mapping (EXTENSION POINT here)
│   ├── model/
│   │   └── formatter.js      ← Display-only formatters (e.g. formatDate)
│   ├── i18n/
│   │   └── i18n.properties   ← Labels (EXTENSION POINT here)
│   ├── manifest.json         ← Card descriptor: id, destination, parameters
│   ├── css/style.css
│   └── test/
│       ├── manual/index.html       ← Dev server entry point (has livereload script)
│       ├── mockserver.js           ← Intercepts /api/entity, returns MockDataGenerator data
│       └── utils/
│           ├── MockDataGenerator.js ← Returns a single plain BE-shaped object
│           └── DataEngine.js
├── ui5.yaml                  ← UI5 CLI config (libs, middleware)
├── ui5-local.yaml            ← Local overrides: livereload middleware
└── package.json              ← npm scripts, devDependencies
```

---

## Data flow (request → view)

```
Component.onCardReady(oCard)
  → oView.getController().onCardReady(oCard)
    → Main.controller._loadData()
      → DataHelper.loadData(oCard)
        → oCard.request({ url: "{{destinations.mydestination}}/api/entity" })
        → oResponse.aRawData || oResponse    ← unwraps MockServer envelope
        → DataHelper._processData(oEntity)   ← EXTENSION POINT: field mapping
      → view JSONModel.setData(oData)        ← flat object, camelCase keys
```

The view binds directly to the flat model: `{/firstName}`, `{/expDate}`, etc.

---

## MockServer behaviour

- Intercepts `GET /api/entity(.*)` (regex path).
- Returns `{ aRawData: { FirstName: "Adam Taylor", ... } }`.
- `DataHelper.loadData` unwraps the envelope with `oResponse.aRawData || oResponse`
  so that both mock and real BE responses work with the same code.
- `MockDataGenerator.getData()` returns a **single plain object** (not an array),
  with PascalCase field names matching what a real SAP SF/BTP backend would return.

---

## Extension points — what to change for a new card

### 1. `src/helpers/DataHelper.js` → `_processData(oRawData)`
This is the **only function that must be modified** for a new card.
- Map BE field names (PascalCase) to view-model fields (camelCase).
- Add computed/derived fields (e.g. `fullName`).
- Keep `loadData()` untouched — it is the shared network layer.

### 2. `src/View.view.xml`
- Replace `{/firstName}` etc. with bindings that match your `_processData` output.
- Replace `{i18n>LABEL_FIELD_XX}` with your own i18n keys.
- The form has 4 `FormContainer` columns × 3 fields each (12 fields total).
  Add or remove `FormElement` nodes as needed.

### 3. `src/i18n/i18n.properties`
- Replace `LABEL_FIELD_01` … `LABEL_FIELD_12` with semantic keys and real labels.
- Update `CARD_TITLE`, `CARD_SUBTITLE`, `FORM_TITLE`.

### 4. `src/manifest.json`
- Change `sap.app.id` to your card's namespace.
- Rename destination `mydestination` to your actual CF destination name.
- Update version in `applicationVersion.version`.
- Update `tags.keywords`.

### 5. `src/test/utils/MockDataGenerator.js`
- Return a plain object with your real BE field names and realistic mock values.

---

## Extension points — what NOT to change

| File | Reason |
|---|---|
| `Component.js` | Card lifecycle: init, ErrorHandler wiring, `getCard()`/`getErrorHandler()` |
| `DataHelper.loadData()` | Network layer: request, error wrapping, CustomError handling |
| `model/formatter.js` (existing functions) | `formatDate` is generic and reused |
| `manifest.json` → `sap.card.configuration.parameters` | SDK-level params (retry button, maintenance mode, etc.) |

---

## Key SDK classes (from `com.sap.fiorireuselibrary.ui5cardssdk`)

| Class | Role |
|---|---|
| `Base.controller` | Base class for all card controllers; provides `onCardReady` lifecycle hook |
| `ErrorHandler` | Handles `CustomError` events; controls error overlay on the card |
| `CustomError.GenericError` | Typed error thrown by `DataHelper` on network failure |

---

## Linting

- Root `eslint.config.mjs` is **team-owned** — do not modify.
- Per-file suppression of JSDoc rules: add `/* eslint-disable jsdoc/require-jsdoc, jsdoc/require-param, jsdoc/require-returns */` at the top of the file.
- Old `.eslintrc` files are **ignored** by ESLint 10 flat config — delete any you find.

---

## Running locally

```bash
cd content/templateSF
npm install
npm start          # → ui5 serve --config ui5-local.yaml --open test/manual/index.html
```

Livereload is active: saving any `src/` file triggers automatic browser refresh via
`ui5-middleware-livereload` + the script tag in `test/manual/index.html`.

---

## Unit tests

```bash
npm test           # or open http://localhost:8080/test/unit/unitTests.qunit.html
```

Test files mirror the source structure:
- `test/unit/helpers/DataHelperTest.js` — tests `_processData` field mapping and immutability
- `test/unit/model/FormatterTest.js` — tests `formatDate` (pattern `dd.MM.yyyy`, edge cases)
- `test/unit/Main.controller.js` — tests `_loadData` success/error paths and busy-state management
