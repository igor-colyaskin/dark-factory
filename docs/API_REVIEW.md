# SDK API Review

Static analysis of `com/sap/fiorireuselibrary/ui5cardssdk` usage across all cards.
Generated from source scan; excludes `test/` and `node_modules/`.

---

## Per-card SDK usage

Columns: **CE** = CustomError, **BC** = Base.controller, **EH** = ErrorHandler, **SU** = StorageUtils, **AD** = AuthorizationDialog.controller

Legend: `✅ SDK` = imports from SDK, `⚠️ local` = local file in `src/` (tech debt), `—` = not used

| Card | CE | BC | EH | SU | AD |
|------|:--:|:--:|:--:|:--:|:--:|
| **Common** | | | | | |
| back-navigation-card | — | — | — | — | — |
| breadcrumb-navigation-card | — | — | — | ✅ SDK | — |
| custom-tile-card | — | ✅ SDK | ✅ SDK | — | — |
| list-navigation-card | ⚠️ local | ✅ SDK | ✅ SDK | — | — |
| navigation-card | — | — | ⚠️ local¹ | — | via local EH |
| partner-strip | — | ✅ SDK | — | ✅ SDK | — |
| **CompetencyEngine** | | | | | |
| group-account-header | ⚠️ local | ✅ SDK | ✅ SDK | ✅ SDK | — |
| partner-competency-detail-table | ⚠️ local | ✅ SDK | ✅ SDK | ✅ SDK | ✅ SDK |
| partner-competency-spec-main-table | ⚠️ local | ✅ SDK | ✅ SDK | ✅ SDK | ✅ SDK |
| partner-contributions-table-card | ⚠️ local | ✅ SDK | ✅ SDK | ✅ SDK | ✅ SDK |
| partner-specializations-table-card | ⚠️ local | ✅ SDK | ✅ SDK | ✅ SDK | ✅ SDK |
| **Compliance** | | | | | |
| compliance-information-card | ✅ SDK | ✅ SDK | ✅ SDK | ✅ SDK | ✅ SDK |
| due-diligence-assessments-card | ✅ SDK | ✅ SDK | ✅ SDK | ✅ SDK | ✅ SDK |
| **ExceptionManagement** | | | | | |
| exception-request-footer-card | ⚠️ local | ✅ SDK | ✅ SDK | ✅ SDK | — |
| exception-request-header-card | ⚠️ local | ✅ SDK | ✅ SDK | ✅ SDK | — |
| partner-exception-management-table | ⚠️ local | ✅ SDK | ✅ SDK | ✅ SDK | ✅ SDK |
| partner-exception-management-table-extended | ⚠️ local | ✅ SDK | ✅ SDK | ⚠️ local² | ✅ SDK |
| partner-exception-page-card | ⚠️ local | ✅ SDK | ✅ SDK | ✅ SDK | ✅ SDK |
| partner-table-exception-filter | ⚠️ local | ✅ SDK | ✅ SDK | ✅ SDK | — |
| **Leveling** | | | | | |
| partner-leveling-main-card | ⚠️ local | ✅ SDK | ✅ SDK | ✅ SDK | ✅ SDK |
| partner-leveling-points | ⚠️ local | ✅ SDK | ✅ SDK | ✅ SDK | ✅ SDK |
| **NotificationService** | | | | | |
| partner-contacts-card-comp | ⚠️ local | ✅ SDK | ✅ SDK | — | ✅ SDK |
| partner-contacts-notification-component-card | ⚠️ local | ✅ SDK | ✅ SDK | ✅ SDK | ✅ SDK |
| **PRM** | | | | | |
| partner-account-fulfillments-details | ⚠️ local | ✅ SDK | ✅ SDK | ✅ SDK | ✅ SDK |
| partner-authorization-details-card | ⚠️ local | ✅ SDK | ✅ SDK | ✅ SDK | — |
| partner-authorization-exemption-table | ⚠️ local | ✅ SDK | ✅ SDK | ✅ SDK | ✅ SDK |
| partner-authorization-table | ⚠️ local | ✅ SDK | ✅ SDK | ✅ SDK | ✅ SDK |
| partner-company-grouping-table | ⚠️ local | ✅ SDK | ✅ SDK | ✅ SDK | ✅ SDK |
| partner-contact-user-authorizations-card | ⚠️ local | ✅ SDK | ✅ SDK | ⚠️ local² | ✅ SDK |
| partner-details-card-component | ⚠️ local | ✅ SDK | ✅ SDK (×2)³ | ✅ SDK | — |
| partner-prm-certification-table | ⚠️ local | ✅ SDK | ✅ SDK | ✅ SDK | — |
| partner-prm-contact-table | ⚠️ local | ✅ SDK | ✅ SDK | ✅ SDK | ✅ SDK |
| partner-table-filter | ⚠️ local | ✅ SDK | ✅ SDK | ✅ SDK | — |
| partner-table-table | ⚠️ local | ✅ SDK | ✅ SDK | ✅ SDK | ✅ SDK |
| partner-types-table | ⚠️ local | ✅ SDK | ✅ SDK | ✅ SDK | ✅ SDK |
| product-authorization-group-fulfillment | ⚠️ local | ✅ SDK | ✅ SDK | ✅ SDK | ✅ SDK |
| **Programs** | | | | | |
| partner-programs-and-initiatives-table | — | — | — | — | — |

**¹** `navigation-card/src/ErrorHandler.js` — полностью самописная реализация (не импортирует SDK ErrorHandler).
Namespace в файле ошибочно указан как `partner.account.fulfillments.details.ErrorHandler` — скорее всего скопировано без переименования.
Внутри этого файла через SDK импортируется `AuthorizationDialog.controller` для обработки 403.

**²** `partner-exception-management-table-extended/src/StorageUtils.js` и
`partner-contact-user-authorizations-card/src/StorageUtils.js` — локальные копии/расширения StorageUtils.
Подлежат замене на SDK-импорт (аналогично CustomError).

**³** `partner-details-card-component/src/Main.controller.js` импортирует ErrorHandler из SDK напрямую, в дополнение к тому, что он уже доступен через Component. Дублирование.

---

## Локальные копии SDK-модулей (tech debt)

| Модуль | Карточки с локальной копией | Рекомендация |
|--------|----------------------------|--------------|
| `CustomError.js` | 29 карточек (все кроме Compliance + back/navigation/strip/programs) | Заменить на `import "ui5cardssdk/CustomError"`. Отдельный тикет. |
| `ErrorHandler.js` | navigation-card | Самописная версия с неправильным namespace. Требует отдельного анализа. |
| `StorageUtils.js` | partner-exception-management-table-extended, partner-contact-user-authorizations-card | Заменить на `import "ui5cardssdk/StorageUtils"`. |

---

## Aggregate SDK API surface

### Module: `com/sap/fiorireuselibrary/ui5cardssdk/Base.controller`

Used in: all cards except back-navigation-card, navigation-card, partner-programs-and-initiatives-table.

```js
// Pattern in every Main.controller.js:
return BaseController.extend("com.sap.partner.wz.<card>.Main", {
    onInit:      function () { ... },
    onCardReady: function (oCard) { ... },  // oCard: sap.ui.integration.widgets.Card
    onExit:      function () { ... }
});
```

Inherited API (from sap.ui.core.mvc.Controller):
- `this.getView()` → sap.ui.core.mvc.View
- `this.byId(sId)` → sap.ui.core.Control
- `this.getOwnerComponent()` → sap.ui.core.UIComponent

---

### Module: `com/sap/fiorireuselibrary/ui5cardssdk/ErrorHandler`

Used in: `Component.js` of every card (except navigation-card, back-navigation-card, partner-programs-and-initiatives-table).

```js
// Component.js — instantiation:
this._oErrorHandler = new ErrorHandler(oComponent);  // oComponent: sap.ui.core.UIComponent

// Main.controller.js — retrieval:
this._oErrorHandler = this.getOwnerComponent().getErrorHandler();
```

| Method | Signature | Notes |
|--------|-----------|-------|
| `handleErrorEvent` | `(oError, bShowRetry?)` → void | Generic/HTTP errors; `bShowRetry=true` adds Retry button |
| `handleCustomErrorEvent` | `(oError, bShowRetry?)` → void | CustomError instances only |
| `attachErrorHandlingForModel` | `(oModel: sap.ui.model.Model)` → void | Attaches to OData model metadata/request failure events |
| `checkMaintenanceMode` | `()` → void | Shows maintenance screen if `showmaintenancemode` parameter is `true` |

---

### Module: `com/sap/fiorireuselibrary/ui5cardssdk/StorageUtils`

Used in: most cards via `Main.controller.js` and helper files.
All methods are static.

| Method | Signature | Notes |
|--------|-----------|-------|
| `createStorage` | `(sContextName: string)` → void | Must be called once in `onInit` before any read/write |
| `readItem` | `(sKey: string)` → any | Returns stored value or `null` |
| `setItem` | `(sKey: string, value: any)` → void | Serialization (JSON.stringify) done by caller |
| `removeItem` | `(sKey: string)` → void | |

**Observed storage keys in use:**

| Key | Used by |
|-----|---------|
| `partnerDetailData` | Most cards — contains `{ PartnerId }` |
| `competencyDetailData` | CompetencyEngine cards |
| `exceptionManagementDetailData` | ExceptionManagement cards |
| `partnerAuthDetailData` | PRM authorization cards |
| `AuthCode`, `AuthContactData` | NotificationService |
| `columnVisibility`, `FILTERS_STATE`, `PAGING_STATE` | Table cards with persisted UI state |

---

### Module: `com/sap/fiorireuselibrary/ui5cardssdk/CustomError`

Used in: compliance-information-card, due-diligence-assessments-card (SDK import).
All other cards use a local `src/CustomError.js` copy.

| Constructor | Signature | Notes |
|-------------|-----------|-------|
| `CustomError.GenericError` | `(sTitle: string, sMessage: string)` | General data loading errors |
| `CustomError.NotFoundPartnerIDError` | `(sTitle?: string, sMessage?: string)` | Missing or unavailable `partnerDetailData` in storage |
| `CustomError.UnauthorizedError` | `(sTitle?: string, sMessage?: string)` | HTTP 401/403 cases |

All constructors produce objects handled by `oErrorHandler.handleCustomErrorEvent(oError)`.
Used as `instanceof` guards: `oError instanceof CustomError.NotFoundPartnerIDError`.

---

### Module: `com/sap/fiorireuselibrary/ui5cardssdk/AuthorizationDialog.controller`

Used in: 24 cards.

```js
// Instantiation + usage pattern:
const oAuthDialog = new AuthorizationDialog(this.getOwnerComponent());
oAuthDialog.openDialog();         // standard mode — shows REQUIRED_AUTH_ROLE i18n key
oAuthDialog.openDialog(true);     // request mode — shows REQUESTED_AUTH_ROLE, Go to Service button visible
```

**Required i18n keys** (must be present in card's `i18n.properties`):

| Key | Used in | Notes |
|-----|---------|-------|
| `REQUIRED_AUTHORIZATION_TITLE` | Dialog title | |
| `REQUIRED_AUTH_ROLE` | Dialog body (standard mode) | HTML via FormattedText; use `<p>` + `<strong>` |
| `REQUESTED_AUTH_ROLE` | Dialog body (request mode) | Same HTML rules |
| `CLOSE` | Close button | Note: distinct from `BTN_CLOSE` |
| `GO_TO_SERVICE` | Go to Service button | Visible only in request mode |

**HTML format for role text** (verified against rendering):
```properties
REQUIRED_AUTH_ROLE=<p>SAP Employee role - <strong>00:PM_EMP:GP</strong> in PWP system</p>
```
> `<b>` is silently stripped by `sap.m.FormattedText`. Use `<strong>` inside `<p>`.
> `<ul><li>` works for bold but prevents text centering via CSS `.sapBenchMessageDialogFormattedText p`.
