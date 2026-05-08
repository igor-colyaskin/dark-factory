# Cards Overview

| Card | Branch | BE Source | Data Type | Main Control | Editable | oCard.request() |
|------|--------|-----------|-----------|--------------|----------|:---------------:|
| **Common** | | | | | | |
| &nbsp;&nbsp;back-navigation-card | develop | none | — | Button (manifest) | readonly | no |
| &nbsp;&nbsp;breadcrumb-navigation-card | develop | none | — | sap.m.Breadcrumbs | readonly | no |
| &nbsp;&nbsp;custom-tile-card | develop | none | — | sap.m.List | readonly | no |
| &nbsp;&nbsp;list-navigation-card | develop | none | — | sap.m.NavigationList | readonly | no |
| &nbsp;&nbsp;navigation-card | develop | none | — | Button (manifest) | readonly | no |
| &nbsp;&nbsp;partner-strip | develop | none | — | sap.m.MessageStrip | editable | no |
| **CompetencyEngine** | | | | | | |
| &nbsp;&nbsp;group-account-header | develop | REST | array | VBox / HBox | readonly | yes |
| &nbsp;&nbsp;partner-competency-detail-table | develop | none ¹ | array | sap.m.Table | readonly | no |
| &nbsp;&nbsp;partner-competency-spec-main-table | develop | REST | array | sap.m.Table | readonly | yes |
| &nbsp;&nbsp;partner-contributions-table-card | develop | none ¹ | array | sap.m.Table | readonly | no |
| &nbsp;&nbsp;partner-specializations-table-card | develop | none ¹ | array | sap.m.Table | readonly | no |
| **Compliance** | | | | | | |
| &nbsp;&nbsp;compliance-information-card | develop | OData2 | object | sap.ui.layout.form | readonly | yes |
| &nbsp;&nbsp;due-diligence-assessments-card | develop | OData2 | array | sap.m.Table | readonly | yes |
| **ExceptionManagement** | | | | | | |
| &nbsp;&nbsp;exception-request-footer-card | develop | none ² | — | sap.m.Toolbar | editable | no |
| &nbsp;&nbsp;exception-request-header-card | develop | REST | object | sap.m.Toolbar | editable | yes |
| &nbsp;&nbsp;partner-exception-management-table | develop | REST | array | sap.m.Table | readonly | yes |
| &nbsp;&nbsp;partner-exception-management-table-extended | develop | REST | array | sap.m.Table | editable | yes |
| &nbsp;&nbsp;partner-exception-page-card | develop | REST + OData2 | object + array | Fragments (multi-view) | editable | yes |
| &nbsp;&nbsp;partner-table-exception-filter | develop | REST | object + array | sap.f.DynamicPage + FilterBar | editable | yes |
| **Leveling** | | | | | | |
| &nbsp;&nbsp;partner-leveling-main-card | develop | REST | array | sap.ui.layout.VerticalLayout | readonly | yes |
| &nbsp;&nbsp;partner-leveling-points | develop | REST | array | sap.ui.layout.Grid | readonly | yes |
| **NotificationService** | | | | | | |
| &nbsp;&nbsp;partner-contacts-card-comp | develop | none ¹ | array | sap.m.Table | readonly | no |
| &nbsp;&nbsp;partner-contacts-notification-component-card | develop | REST + OData2 | array | sap.m.Table | editable | yes |
| **PRM** | | | | | | |
| &nbsp;&nbsp;partner-account-fulfillments-details | develop | OData2 | array | sap.m.Table | readonly | no |
| &nbsp;&nbsp;partner-authorization-details-card | develop | OData2 | object | VBox (detail layout) | readonly | no |
| &nbsp;&nbsp;partner-authorization-exemption-table | develop | OData2 | array | sap.m.Table | editable | no |
| &nbsp;&nbsp;partner-authorization-table | develop | OData2 | array | sap.m.Table | editable | yes ³ |
| &nbsp;&nbsp;partner-company-grouping-table | develop | OData2 | array | sap.m.Table | readonly | yes |
| &nbsp;&nbsp;partner-contact-user-authorizations-card | develop | OData2 | array | sap.m.Table | editable | yes |
| &nbsp;&nbsp;partner-details-card-component | develop | OData2 | object | VBox (detail layout) | readonly | no |
| &nbsp;&nbsp;partner-prm-certification-table | develop | REST | array | sap.m.Table | readonly | no ⁴ |
| &nbsp;&nbsp;partner-prm-contact-table | develop | OData2 | array | sap.m.Table | readonly | no |
| &nbsp;&nbsp;partner-table-filter | develop | none | — | sap.f.DynamicPage + FilterBar | editable | no |
| &nbsp;&nbsp;partner-table-table | develop | OData2 | array | sap.m.Table | readonly | no |
| &nbsp;&nbsp;partner-types-table | develop | OData2 | array | sap.m.Table | readonly | yes ³ |
| &nbsp;&nbsp;product-authorization-group-fulfillment | develop | OData2 | object + array | sap.m.Table | readonly | no |
| **Programs** | | | | | | |
| &nbsp;&nbsp;partner-programs-and-initiatives-table | partner-programs-table | REST | array ⁵ | sap.ui.table.TreeTable | readonly | no ⁶ |

---

## Legend

| Column | Values |
|--------|--------|
| **BE Source** | `OData2` — OData v2 model (`/sap/opu/odata/...`); `REST` — `oCard.request()` to `/api/...` endpoints; `REST + OData2` — both in one card; `none` — no HTTP calls (navigation, event-driven, or filter-only cards) |
| **Data Type** | `object` — single entity (key predicate or detail); `array` — collection result set; `object + array` — header entity + expanded items or parallel calls; `—` — no BE data |
| **Main Control** | Dominant visual control in the card content area. All `sap.m.Table` instances are responsive tables (not `sap.ui.table.Table`). Exception: partner-programs-and-initiatives-table uses `sap.ui.table.TreeTable` for hierarchical data. |
| **Editable** | `editable` — card has input fields, action buttons (approve / reject / create / submit / save), or filter inputs; `readonly` — display only |
| **oCard.request()** | Whether the card calls `oCard.request()` anywhere in its source. OData2 cards that use only model binding (ODataModel + `metadataLoaded()`) are `no`. |

---

## Notes

**¹ Event-driven cards** (partner-competency-detail-table, partner-contributions-table-card, partner-specializations-table-card, partner-contacts-card-comp):
Data arrives via host inter-card events fired by another card on the same page. No direct HTTP calls — BE Source = `none`, but data shape is `array`.

**² exception-request-footer-card**: Fires approval/rejection events to other ExceptionManagement cards. No HTTP calls of its own.

**³ partner-authorization-table, partner-types-table**: Call `oCard.request()` only in the Export to Excel handler (`onExportPress`). Primary data loading uses OData model binding, not `oCard.request()`.

**⁴ partner-prm-certification-table**: Unique in the PRM group — uses `jQuery.ajax()` directly (not `oCard.request()`) to fetch REST `/api/certifications`. Also exists on branches `cert-card-int-tests` and `develop_ms`.

**⁵ partner-programs-and-initiatives-table**: Иерархический массив — partners верхнего уровня с вложенными `initiatives[]`. TreeTable связан через `{path:'/partners', parameters: {arrayNames:['initiatives']}}`.

**⁶ partner-programs-and-initiatives-table**: Загрузка данных через нативный `fetch()` + `Promise.allSettled()` в `fetchDataHelper.js` (4 параллельных REST-запроса). Ни `oCard.request()`, ни OData model binding не используется. Единственная карточка с `sap.ui.table.TreeTable` в проекте. Ветка `partner-programs-table`, не смержена в develop.

**group-account-header**: Supports two API variants via manifest parameter `api_v2`. Makes 2 parallel `oCard.request()` calls (competency + specialization). Fires `CompetencyReceived` event — consumed by partner-competency-detail-table, partner-contributions-table-card, partner-specializations-table-card.

**partner-contacts-notification-component-card**: Makes 2 parallel requests — REST `/api/contact-groups/search/` and OData2 `PartnerContactSet`. Fires `PartnerSelected` event consumed by partner-contacts-card-comp.

**partner-company-grouping-table**: Uses both OData2 model binding and `oCard.request()` direct calls targeting the same `YPRM_WORK_ZONE_SRV` service.
