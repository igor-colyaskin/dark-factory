# Cards Overview

| Card | Folder | Namespace | Branch | BE Source | Data Type | Main Control | Editable | oCard.request() |
|------|--------|-----------|--------|-----------|-----------|--------------|----------|:---------------:|
| **Common** | | | | | | | | |
| &nbsp;&nbsp;back-navigation-card | back-navigation-card | sap.partner.wz.card.back.navigation | develop | none | — | Button (manifest) | readonly | no |
| &nbsp;&nbsp;breadcrumb-navigation-card | breadcrumb-navigation-card | com.sap.partner.wz.breadcrumb | develop | none | — | sap.m.Breadcrumbs | readonly | no |
| &nbsp;&nbsp;custom-tile-card | custom-tile-card | com.sap.partner.wz.custom.tile.card | develop | none | — | sap.m.List | readonly | no |
| &nbsp;&nbsp;list-navigation-card | list-navigation-card | com.sap.partner.wz.list.navigation | develop | none | — | sap.m.NavigationList | readonly | no |
| &nbsp;&nbsp;navigation-card | navigation-card | sap.partner.wz.card.navigation | develop | none | — | Button (manifest) | readonly | no |
| &nbsp;&nbsp;partner-strip | partner-strip | com.sap.partner.wz.partnerstrip | develop | none | — | sap.m.MessageStrip | editable | no |
| **CompetencyEngine** | | | | | | | | |
| &nbsp;&nbsp;group-account-header | group-account-header | com.sap.partner.wz.group.account.header | develop | REST | array | VBox / HBox | readonly | yes |
| &nbsp;&nbsp;partner-competency-detail-table | partner-competency-detail-table | com.sap.partner.wz.partner.competency.detail.table | develop | none ¹ | array | sap.m.Table | readonly | no |
| &nbsp;&nbsp;partner-competency-spec-main-table | partner-competency-spec-main-table | com.sap.partner.wz.competencyspec.main.table | develop | REST | array | sap.m.Table | readonly | yes |
| &nbsp;&nbsp;partner-contributions-table-card | partner-contributions-table-card | com.sap.partner.wz.partner.contributions.table.card | develop | none ¹ | array | sap.m.Table | readonly | no |
| &nbsp;&nbsp;partner-specializations-table-card | partner-specializations-table-card | com.sap.partner.wz.partner.specializations.table.card | develop | none ¹ | array | sap.m.Table | readonly | no |
| **Compliance** | | | | | | | | |
| &nbsp;&nbsp;compliance-information-card | compliance-information-card | com.sap.partner.wz.compliance.information.card | develop | OData2 | object | sap.ui.layout.form | readonly | yes |
| &nbsp;&nbsp;due-diligence-assessments-card | due-diligence-assessments-card | com.sap.partner.wz.due.diligence.assessments.card | develop | OData2 | array | sap.m.Table | readonly | yes |
| **ExceptionManagement** | | | | | | | | |
| &nbsp;&nbsp;exception-request-footer-card | exception-request-footer-card | com.sap.partner.wz.exception.request.footer | develop | none ² | — | sap.m.Toolbar | editable | no |
| &nbsp;&nbsp;exception-request-header-card | exception-request-header-card | com.sap.partner.wz.exception.request.header | develop | REST | object | sap.m.Toolbar | editable | yes |
| &nbsp;&nbsp;partner-exception-management-table | partner-exception-management-table | com.sap.partner.wz.exceptionmanagement.table | develop | REST | array | sap.m.Table | readonly | yes |
| &nbsp;&nbsp;partner-exception-management-table-extended | partner-exception-management-table-extended | com.sap.partner.wz.exceptionmanagement.table.extended | develop | REST | array | sap.m.Table | editable | yes |
| &nbsp;&nbsp;partner-exception-page-card | partner-exception-page-card | com.sap.partner.wz.partner.exception.page.card | develop | REST + OData2 | object + array | Fragments (multi-view) | editable | yes |
| &nbsp;&nbsp;partner-table-exception-filter | partner-table-exception-filter | com.sap.partner.wz.exceptiontable.exceptiontablefilter | develop | REST | object + array | sap.f.DynamicPage + FilterBar | editable | yes |
| **Leveling** | | | | | | | | |
| &nbsp;&nbsp;partner-leveling-main-card | partner-leveling-main-card | com.sap.partner.wz.leveling.main | develop | REST | array | sap.ui.layout.VerticalLayout | readonly | yes |
| &nbsp;&nbsp;partner-leveling-points | partner-leveling-points | com.sap.partner.wz.leveling.points | develop | REST | array | sap.ui.layout.Grid | readonly | yes |
| **NotificationService** | | | | | | | | |
| &nbsp;&nbsp;partner-contacts-card-comp | partner-contacts-card-comp | com.sap.partner.wz.partnercontacts | develop | none ¹ | array | sap.m.Table | readonly | no |
| &nbsp;&nbsp;partner-contacts-notification-component-card | partner-contacts-notification-component-card | com.sap.partner.wz.partner.contacts.notifications | develop | REST + OData2 | array | sap.m.Table | editable | yes |
| **PRM** | | | | | | | | |
| &nbsp;&nbsp;partner-account-fulfillments-details | partner-account-fulfillments-details | com.sap.partner.wz.partner.account.fulfillments.details | develop | OData2 | array | sap.m.Table | readonly | no |
| &nbsp;&nbsp;partner-authorization-details-card | partner-authorization-details-card | com.sap.partner.wz.partner.authorization.details.card | develop | OData2 | object | VBox (detail layout) | readonly | no |
| &nbsp;&nbsp;partner-authorization-exemption-table | partner-authorization-exemption-table | com.sap.partner.wz.partner.authorization.exemption.table | develop | OData2 | array | sap.m.Table | editable | no |
| &nbsp;&nbsp;partner-authorization-table | partner-authorization-table | com.sap.partner.wz.partner.authorization.table | develop | OData2 | array | sap.m.Table | editable | yes ³ |
| &nbsp;&nbsp;partner-company-grouping-table | partner-company-grouping-table | com.sap.partner.wz.company.grouping.table | develop | OData2 | array | sap.m.Table | readonly | yes |
| &nbsp;&nbsp;partner-contact-user-authorizations-card | partner-contact-user-authorizations-card | com.sap.partner.wz.partner.contact.user.authorizations.card | develop | OData2 | array | sap.m.Table | editable | yes |
| &nbsp;&nbsp;partner-details-card-component | partner-details-card-component | com.sap.partner.wz.partner.details.card.component | develop | OData2 | object | VBox (detail layout) | readonly | no |
| &nbsp;&nbsp;partner-prm-certification-table | partner-prm-certification-table | com.sap.partner.wz.partner.prm.certification.table | develop | REST | array | sap.m.Table | readonly | no ⁴ |
| &nbsp;&nbsp;partner-prm-contact-table | partner-prm-contact-table | com.sap.partner.wz.partner.prm.contact.table | develop | OData2 | array | sap.m.Table | readonly | no |
| &nbsp;&nbsp;partner-table-filter | partner-table-filter | com.sap.partner.wz.partnertable.partnertablefilter | develop | none | — | sap.f.DynamicPage + FilterBar | editable | no |
| &nbsp;&nbsp;partner-table-table | partner-table-table | com.sap.partner.wz.partnertable.partnertable | develop | OData2 | array | sap.m.Table | readonly | no |
| &nbsp;&nbsp;partner-types-table | partner-types-table | com.sap.partner.wz.partner.types.table | develop | OData2 | array | sap.m.Table | readonly | yes ³ |
| &nbsp;&nbsp;product-authorization-group-fulfillment | product-authorization-group-fulfillment | com.sap.partner.wz.product.authorization.group.fulfillment | develop | OData2 | object + array | sap.m.Table | readonly | no |
| **Programs** | | | | | | | | |
| &nbsp;&nbsp;partner-programs-and-initiatives-table | partner-programs-and-initiatives-table | com.sap.partner.wz.partner.p13ntable | partner-programs-table | REST | array ⁵ | sap.ui.table.TreeTable | readonly | no ⁶ |

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
