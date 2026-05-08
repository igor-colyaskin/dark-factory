/**
 * Integration Card Developer Prompts
 *
 * LLM generates only the 5 extension-point files.
 * The 6 static files (namespace-only substitution) are written by generateStaticFiles()
 * directly from templates, without LLM involvement — keeps output well within token limits.
 */

// ── Static file templates ────────────────────────────────────────────────────

const T_COMPONENT = `sap.ui.define(
\t["sap/ui/core/UIComponent", "com/sap/fiorireuselibrary/ui5cardssdk/ErrorHandler", "sap/base/Log"],
\tfunction (UIComponent, ErrorHandler, Log) {
\t\t"use strict";

\t\treturn UIComponent.extend("com.sap.partner.wz.SLUG.Component", {
\t\t\tinit: function () {
\t\t\t\tUIComponent.prototype.init.apply(this, arguments);
\t\t\t\tthis._oErrorHandler = new ErrorHandler(this);
\t\t\t},

\t\t\tonCardReady: function (oCard) {
\t\t\t\tif (!oCard) {
\t\t\t\t\treturn;
\t\t\t\t}

\t\t\t\tthis.oCard = oCard;
\t\t\t\tthis._oErrorHandler.checkMaintenanceMode();

\t\t\t\tthis.getRootControl()
\t\t\t\t\t.loaded()
\t\t\t\t\t.then((oView) => {
\t\t\t\t\t\toView.getController().onCardReady(oCard);
\t\t\t\t\t})
\t\t\t\t\t.catch((oError) => {
\t\t\t\t\t\tif (oError && typeof oError.getParameters === "function") {
\t\t\t\t\t\t\tthis._oErrorHandler.handleCustomErrorEvent(oError);
\t\t\t\t\t\t} else {
\t\t\t\t\t\t\tLog.error("SLUG: card initialization error", oError);
\t\t\t\t\t\t}
\t\t\t\t\t});
\t\t\t},

\t\t\tgetCard: function () {
\t\t\t\treturn this.oCard;
\t\t\t},

\t\t\tgetErrorHandler: function () {
\t\t\t\treturn this._oErrorHandler;
\t\t\t}
\t\t});
\t}
);`;

const T_MAIN_CONTROLLER = `sap.ui.define(
\t[
\t\t"com/sap/fiorireuselibrary/ui5cardssdk/Base.controller",
\t\t"com/sap/fiorireuselibrary/ui5cardssdk/AuthorizationDialog.controller",
\t\t"sap/base/Log",
\t\t"sap/ui/core/Fragment",
\t\t"sap/ui/model/json/JSONModel",
\t\t"./helpers/DataHelper",
\t\t"./model/formatter"
\t],
\tfunction (BaseController, AuthorizationDialog, Log, Fragment, JSONModel, DataHelper, formatter) {
\t\t"use strict";

\t\treturn BaseController.extend("com.sap.partner.wz.SLUG.Main", {
\t\t\tformatter: formatter,

\t\t\tonInit: function () {
\t\t\t\tthis.getView().setModel(new JSONModel({}));
\t\t\t},

\t\t\tonCardReady: function () {
\t\t\t\tthis._loadData();
\t\t\t},

\t\t\tonStatusPress: function (oEvent) {},

\t\t\tonMenuPress: function (oEvent) {
\t\t\t\tconst oView = this.getView();
\t\t\t\tconst oButton = oEvent.getSource();
\t\t\t\tif (this._pMenu) {
\t\t\t\t\tthis._pMenu.then(function (oMenu) { oMenu.openBy(oButton); });
\t\t\t\t\treturn;
\t\t\t\t}
\t\t\t\tthis._pMenu = Fragment.load({
\t\t\t\t\tid: oView.getId(),
\t\t\t\t\tname: "com.sap.partner.wz.SLUG.fragments.Menu",
\t\t\t\t\tcontroller: this
\t\t\t\t}).then(function (oMenu) {
\t\t\t\t\toView.addDependent(oMenu);
\t\t\t\t\toMenu.openBy(oButton);
\t\t\t\t\treturn oMenu;
\t\t\t\t});
\t\t\t},

\t\t\t_loadData: function () {
\t\t\t\tconst oForm = this.byId("employeeForm");
\t\t\t\tif (oForm) { oForm.setBusy(true); }
\t\t\t\tconst oCard = this.getOwnerComponent().getCard();
\t\t\t\tconst oErrorHandler = this.getOwnerComponent().getErrorHandler();
\t\t\t\tDataHelper.loadData(oCard)
\t\t\t\t\t.then(function (oData) {
\t\t\t\t\t\tthis.getView().getModel().setData(oData);
\t\t\t\t\t}.bind(this))
\t\t\t\t\t.catch(function (oError) {
\t\t\t\t\t\tif (oError && typeof oError.getParameters === "function") {
\t\t\t\t\t\t\toErrorHandler.handleCustomErrorEvent(oError);
\t\t\t\t\t\t} else {
\t\t\t\t\t\t\tLog.error("SLUG: data loading error", oError);
\t\t\t\t\t\t}
\t\t\t\t\t})
\t\t\t\t\t.finally(function () {
\t\t\t\t\t\tif (oForm) { oForm.setBusy(false); }
\t\t\t\t\t});
\t\t\t}
\t\t});
\t}
);`;

const T_FORMATTER = `sap.ui.define(
\t["sap/ui/core/format/DateFormat"],
\tfunction (DateFormat) {
\t\t"use strict";

\t\treturn {
\t\t\tformatDate: function (sDate) {
\t\t\t\tif (!sDate) {
\t\t\t\t\treturn "";
\t\t\t\t}
\t\t\t\tconst oInstance = DateFormat.getDateInstance({ pattern: "dd.MM.yyyy" });
\t\t\t\treturn oInstance.format(new Date(sDate));
\t\t\t}
\t\t};
\t}
);`;

const T_MOCKSERVER = `sap.ui.define(
\t["sap/ui/core/util/MockServer", "./utils/MockDataGenerator", "./utils/DataEngine"],
\tfunction (MockServer, MockDataGenerator, DataEngine) {
\t\t"use strict";

\t\treturn {
\t\t\tinit: function () {
\t\t\t\treturn new Promise(function (resolve) {
\t\t\t\t\tvar oMockServer = new MockServer({ rootUri: "/api/" });

\t\t\t\t\toMockServer.setRequests([
\t\t\t\t\t\t{
\t\t\t\t\t\t\tmethod: "GET",
\t\t\t\t\t\t\tpath: new RegExp("entity(.*)"),
\t\t\t\t\t\t\tresponse: function (oXhr) {
\t\t\t\t\t\t\t\tvar aRawData = MockDataGenerator.getData();
\t\t\t\t\t\t\t\toXhr.respondJSON(200, {}, JSON.stringify({ aRawData }));
\t\t\t\t\t\t\t\treturn true;
\t\t\t\t\t\t\t}
\t\t\t\t\t\t}
\t\t\t\t\t]);

\t\t\t\t\toMockServer.start();
\t\t\t\t\tresolve();
\t\t\t\t});
\t\t\t}
\t\t};
\t}
);`;

const T_DATA_ENGINE = `sap.ui.define([], function () {
\t"use strict";
\tvar aSystemParams = ["$top", "$skip", "search", "sortPath", "sortOrder", "partnerId"];
\treturn {
\t\tprocess: function (aData, oParams) {
\t\t\tvar aResult = aData.slice();
\t\t\taResult = this._applyFilters(aResult, oParams);
\t\t\taResult = this._applySearch(aResult, oParams.get("search"));
\t\t\taResult = this._applySorting(aResult, oParams.get("sortPath"), oParams.get("sortOrder"));
\t\t\tvar iTotal = aResult.length;
\t\t\tvar iTop = oParams.has("$top") ? parseInt(oParams.get("$top"), 10) : iTotal;
\t\t\tvar iSkip = parseInt(oParams.get("$skip"), 10) || 0;
\t\t\treturn { value: aResult.slice(iSkip, iSkip + iTop), totalCount: iTotal };
\t\t},
\t\t_applyFilters: function (aData, oParams) {
\t\t\tvar aFiltered = aData.slice();
\t\t\toParams.forEach(function (sValue, sKey) {
\t\t\t\tvar sCleanKey = sKey.replace("[]", "");
\t\t\t\tif (aSystemParams.indexOf(sCleanKey) !== -1) { return; }
\t\t\t\tvar aValues = oParams.getAll(sKey);
\t\t\t\tif (aValues.length > 0) {
\t\t\t\t\taFiltered = aFiltered.filter(function (oItem) {
\t\t\t\t\t\treturn aValues.indexOf(String(oItem[sCleanKey] || "")) !== -1;
\t\t\t\t\t});
\t\t\t\t}
\t\t\t});
\t\t\treturn aFiltered;
\t\t},
\t\t_applySearch: function (aData, sSearch) {
\t\t\tif (!sSearch) { return aData; }
\t\t\tvar sQ = sSearch.toLowerCase();
\t\t\treturn aData.filter(function (oItem) {
\t\t\t\treturn Object.values(oItem).some(function (v) {
\t\t\t\t\treturn v && String(v).toLowerCase().indexOf(sQ) !== -1;
\t\t\t\t});
\t\t\t});
\t\t},
\t\t_applySorting: function (aData, sSortPath, sSortOrder) {
\t\t\tif (!sSortPath) { return aData; }
\t\t\treturn aData.sort(function (a, b) {
\t\t\t\tvar vA = a[sSortPath], vB = b[sSortPath];
\t\t\t\tif (vA == null) { return 1; }
\t\t\t\tif (vB == null) { return -1; }
\t\t\t\tvar iResult = vA < vB ? -1 : (vA > vB ? 1 : 0);
\t\t\t\treturn sSortOrder === "Descending" ? -iResult : iResult;
\t\t\t});
\t\t}
\t};
});`;

const T_UI5_LOCAL_YAML = `specVersion: "4.0"
metadata:
  name: com-sap-partner-wz-SLUG
  copyright: |-
    * (c) Copyright 2009-\${currentYear}
type: application
framework:
  name: SAPUI5
  version: 1.136.8
  libraries:
    - name: sap.m
    - name: sap.ui.core
    - name: sap.ui.table
    - name: sap.ushell
    - name: themelib_sap_horizon
server:
  customMiddleware:
    - name: ui5-middleware-livereload
      beforeMiddleware: serveResources
      configuration:
        watchPath: "./src"
    - name: ui5-middleware-servestatic
      afterMiddleware: compression
      configuration:
        rootPath: "./src/test/external_libs"
        mountPath: "/resources"
resources:
  configuration:
    paths:
      webapp: src
builder:
  resources:
    excludes:
      - "test/**"
      - ".card/**"`;

const T_UI5_YAML = `specVersion: "4.0"
metadata:
  name: com-sap-partner-wz-SLUG
  copyright: |-
    * (c) Copyright 2009-\${currentYear}
type: application
# workaround: prevents "File not found: base.less" error during package.zip build
framework:
  name: SAPUI5
  version: 1.136.8
  libraries:
    - name: sap.ui.core
    - name: themelib_sap_fiori_3
resources:
  configuration:
    paths:
      webapp: src
builder:
  resources:
    excludes:
     - "test/**"
     - ".card/**"`;

const T_PACKAGE_JSON = `{
  "name": "com-sap-partner-wz-SLUG",
  "version": "1.0.0",
  "description": "SAP Work Zone Integration Card",
  "scripts": {
    "start": "ui5 serve --config ui5-local.yaml -o test/manual/index.html"
  },
  "ui5": {
    "dependencies": ["@sapitpe/ui5cardssdk", "ui5-middleware-livereload"]
  },
  "dependencies": {
    "@sapitpe/ui5cardssdk": "^1.0.12"
  },
  "devDependencies": {
    "@ui5/cli": "^4.0.12",
    "ui5-middleware-livereload": "^3.3.0"
  }
}`;

const T_PACKAGE_JSON_WITH_TESTS = `{
  "name": "com-sap-partner-wz-SLUG",
  "version": "1.0.0",
  "description": "SAP Work Zone Integration Card",
  "scripts": {
    "start": "ui5 serve --config ui5-local.yaml -o test/manual/index.html",
    "test": "ui5-test-runner --webapp src --testsuite test/unit/unitTests.qunit.html --coverage true --no-screenshot"
  },
  "ui5": {
    "dependencies": ["@sapitpe/ui5cardssdk", "ui5-middleware-livereload"]
  },
  "ui5-test-runner": {
    "dependencies": ["@sapitpe/ui5cardssdk"]
  },
  "dependencies": {
    "@sapitpe/ui5cardssdk": "^1.0.12"
  },
  "devDependencies": {
    "@ui5/cli": "^4.0.12",
    "ui5-middleware-livereload": "^3.3.0",
    "ui5-test-runner": "^5.7.0",
    "geckodriver": "^6.1.0"
  }
}`;

// ── Static file generator ────────────────────────────────────────────────────

const T_ALL_TESTS = `/* istanbul ignore file */
sap.ui.define(
\t[
\t\t"./Component",
\t\t"./helpers/DataHelper.qunit"
\t],
\tfunction () {
\t\t"use strict";
\t}
);`;

const T_NYCRC = `{"include":["src/**/*.js"],"exclude":["src/test/**","src/Component.js"]}`;

/**
 * Returns static files with SLUG substituted — no LLM needed.
 * @param {string} cardSlug
 * @param {object} spec — full architect spec; used for conditional file generation
 * @returns {Array<{path: string, content: string, action: string}>}
 */
export function generateStaticFiles(cardSlug, spec = {}) {
  const slug = cardSlug || 'card';
  const sub = (s) => s.replace(/SLUG/g, slug);
  const pkgJson = spec.generateTests ? sub(T_PACKAGE_JSON_WITH_TESTS) : sub(T_PACKAGE_JSON);

  const files = [
    { path: 'src/Component.js',               content: sub(T_COMPONENT),       action: 'create' },
    { path: 'src/Main.controller.js',          content: sub(T_MAIN_CONTROLLER), action: 'create' },
    { path: 'src/model/formatter.js',          content: T_FORMATTER,            action: 'create' },
    { path: 'src/test/mockserver.js',          content: T_MOCKSERVER,           action: 'create' },
    { path: 'src/test/utils/DataEngine.js',    content: T_DATA_ENGINE,          action: 'create' },
    { path: 'package.json',                    content: pkgJson,                action: 'create' },
    { path: 'ui5-local.yaml',                  content: sub(T_UI5_LOCAL_YAML),  action: 'create' },
    { path: 'ui5.yaml',                        content: sub(T_UI5_YAML),        action: 'create' },
  ];

  // README — always
  const fieldRows = (spec.fields || []).map(f => `| ${f.beField} | ${f.label} |`).join('\n');
  files.push({
    path: 'README.md',
    content: `# ${spec.cardTitle || slug}\n\n> ${spec.cardSubtitle || ''}\n\n## Fields\n\n| Field | Label |\n|-------|-------|\n${fieldRows}\n`,
    action: 'create'
  });

  if (spec.generateDocs) {
    files.push({
      path: 'confluence.md',
      content: `# ${spec.cardTitle || slug}\n\n| | |\n|---|---|\n| | |\n| | |\n`,
      action: 'create'
    });
  }

  if (spec.generateTests) {
    files.push(
      { path: 'src/test/unit/AllTests.js', content: T_ALL_TESTS, action: 'create' },
      { path: '.nycrc.json',               content: T_NYCRC,     action: 'create' }
    );
  }

  return files;
}

// ── System prompt ─────────────────────────────────────────────────────────────

export const systemPrompt = `You are a Developer agent in Dark Factory that generates SAP Work Zone Integration Cards.

## Your Role

Given a card spec from the Architect, you produce the 5 extension-point source files.
The card uses the templateSF pattern — a SAP UI5 AMD-style Component card with a Simple Form.
Static files (Component.js, Main.controller.js, formatter.js, mockserver.js, DataEngine.js, package.json)
are handled separately — do NOT include them in your response.

## Required Output Format

\`\`\`json
{
  "thinking": "Your plan: which fields map to which controls, any formatters used, etc.",
  "files": [
    { "path": "src/manifest.json", "content": "COMPLETE file content", "action": "create" },
    { "path": "src/helpers/DataHelper.js", "content": "COMPLETE file content", "action": "create" },
    { "path": "src/View.view.xml", "content": "COMPLETE file content", "action": "create" },
    { "path": "src/i18n/i18n.properties", "content": "COMPLETE file content", "action": "create" },
    { "path": "src/test/utils/MockDataGenerator.js", "content": "COMPLETE file content", "action": "create" }
  ],
  "questions": [],
  "summary": "What was generated",
  "next_steps": ["Deploy to Work Zone content package"]
}
\`\`\`

## Namespace Substitution Rule

In ALL files: replace the literal string \`SLUG\` with the value of spec.cardSlug.
Example: if cardSlug = "employeecard", then:
- \`com.sap.partner.wz.SLUG\` → \`com.sap.partner.wz.employeecard\`
- \`com/sap/partner/wz/SLUG\` → \`com/sap/partner/wz/employeecard\`

## Files to Generate

### 1. src/manifest.json — EXTENSION POINT

Template:
\`\`\`json
{
  "_version": "1.15.0",
  "sap.app": {
    "id": "com.sap.partner.wz.SLUG",
    "type": "card",
    "i18n": "i18n/i18n.properties",
    "title": "{{TITLE}}",
    "subTitle": "{{SUBTITLE}}",
    "applicationVersion": { "version": "1.0.0" },
    "tags": {
      "keywords": ["Component", "PartnerBench", "SLUG"]
    }
  },
  "sap.ui": {
    "technology": "UI5",
    "deviceTypes": { "desktop": true, "phone": true, "tablet": true },
    "icons": { "icon": "sap-icon://technical-object" }
  },
  "sap.ui5": {
    "rootView": {
      "viewName": "com.sap.partner.wz.SLUG.View",
      "type": "XML",
      "async": true,
      "id": "app"
    },
    "dependencies": {
      "minUI5Version": "1.38",
      "libs": {
        "sap.m": {},
        "com.sap.fiorireuselibrary.ui5cardssdk": {}
      }
    },
    "resourceRoots": {
      "com.sap.fiorireuselibrary.ui5cardssdk": "./resources/com/sap/fiorireuselibrary/ui5cardssdk"
    },
    "models": {
      "i18n": {
        "type": "sap.ui.model.resource.ResourceModel",
        "settings": { "bundleName": "com.sap.partner.wz.SLUG.i18n.i18n" }
      }
    },
    "resources": { "css": [{ "uri": "css/style.css", "id": "" }] }
  },
  "sap.card": {
    "type": "Component",
    "designtime": "dt/configuration",
    "requiredHeight": "13rem",
    "configuration": {
      "destinations": {
        "mydestination": { "name": "DEST_NAME" }
      },
      "parameters": {
        "buildWorkZoneUrl": { "value": "dummy" },
        "target": { "value": "_self" },
        "showRetryButton": { "value": true },
        "showNavigateBackButton": { "value": true },
        "showDownloadLogsButton": { "value": true },
        "showMaintenanceMode": { "value": false }
      }
    }
  },
  "sap.platform.mobilecards": { "compatible": true }
}
\`\`\`

Substitutions to make:
- All \`SLUG\` → spec.cardSlug
- \`DEST_NAME\` → spec.destinationName
- \`keywords\` array: replace "SLUG" entry with spec.cardSlug

Note: \`{{TITLE}}\` and \`{{SUBTITLE}}\` are SAP card i18n bindings — keep them exactly as shown.

---

### 2. src/helpers/DataHelper.js — EXTENSION POINT

Template (keep loadData() EXACTLY as shown, only modify _processData):
\`\`\`javascript
sap.ui.define(["sap/base/Log", "com/sap/fiorireuselibrary/ui5cardssdk/CustomError"], function (Log, CustomError) {
\t"use strict";

\treturn {
\t\tloadData: function (oCard) {
\t\t\treturn oCard
\t\t\t\t.request({
\t\t\t\t\turl: "{{destinations.mydestination}}/api/entity",
\t\t\t\t\tmethod: "GET",
\t\t\t\t\tparameters: {}
\t\t\t\t})
\t\t\t\t.then(
\t\t\t\t\tfunction (oResponse) {
\t\t\t\t\t\tconst oEntity = oResponse.aRawData || oResponse;
\t\t\t\t\t\treturn this._processData(oEntity);
\t\t\t\t\t}.bind(this)
\t\t\t\t)
\t\t\t\t.catch(function (oError) {
\t\t\t\t\tLog.error("DataHelper: request failed", oError);
\t\t\t\t\tif (oError && typeof oError.getParameters === "function") {
\t\t\t\t\t\tthrow oError;
\t\t\t\t\t}
\t\t\t\t\tconst sMsg = oError.message || (typeof oError === "string" ? oError : "Network Error");
\t\t\t\t\tthrow new CustomError.GenericError("Data Loading Error", sMsg);
\t\t\t\t});
\t\t},

\t\t_processData: function (oRawData) {
\t\t\tconst oMapped = {
\t\t\t\t// MAP EACH FIELD: viewKey: oRawData.beField || ""
\t\t\t};
\t\t\treturn oMapped;
\t\t}
\t};
});
\`\`\`

Fill _processData() using spec.fields:
- One line per field: \`{viewKey}: oRawData.{beField} || ""\`
- No other changes to this file

---

### 3. src/View.view.xml — EXTENSION POINT

Replace the FormContainers with FormElements for spec.fields.
Distribute fields across 1–4 columns (use fewer columns for fewer fields):
- 1–3 fields: 1 column
- 4–6 fields: 2 columns
- 7–9 fields: 3 columns
- 10+ fields: 4 columns

For each field, the FormElement pattern:
- control "Text": \`<Text text="{/viewKey}" />\`
- control "Link": \`<Link text="{/viewKey}" press=".onStatusPress" />\`
- control "ObjectStatus": \`<ObjectStatus text="{/viewKey}" />\`
- with formatter "formatDate": \`<Text text="{ path: '/viewKey', formatter: '.formatter.formatDate' }" />\`

Template structure (substitute SLUG, adjust columnsXL/L/M to match column count):
\`\`\`xml
<mvc:View
\tcontrollerName="com.sap.partner.wz.SLUG.Main"
\txmlns:mvc="sap.ui.core.mvc"
\txmlns="sap.m"
\txmlns:f="sap.ui.layout.form"
\txmlns:core="sap.ui.core"
>
\t<VBox class="sapUiSmallMargin">
\t\t<OverflowToolbar design="Transparent">
\t\t\t<Title text="{i18n>FORM_TITLE}" level="H4" />
\t\t\t<ToolbarSpacer />
\t\t\t<Button id="menuButton" icon="sap-icon://overflow" type="Transparent"
\t\t\t\ttooltip="{i18n>MENU_BUTTON_TOOLTIP}" press=".onMenuPress" />
\t\t</OverflowToolbar>
\t\t<f:Form id="employeeForm" editable="false">
\t\t\t<f:layout>
\t\t\t\t<f:ResponsiveGridLayout
\t\t\t\t\tcolumnsXL="N" columnsL="N" columnsM="N"
\t\t\t\t\tlabelSpanXL="12" labelSpanL="12" labelSpanM="12" labelSpanS="12"
\t\t\t\t\temptySpanXL="0" emptySpanL="0" emptySpanM="0"
\t\t\t\t/>
\t\t\t</f:layout>
\t\t\t<f:formContainers>
\t\t\t\t<f:FormContainer>
\t\t\t\t\t<f:formElements>
\t\t\t\t\t\t<f:FormElement label="{i18n>I18N_KEY}">
\t\t\t\t\t\t\t<f:fields><Text text="{/viewKey}" /></f:fields>
\t\t\t\t\t\t</f:FormElement>
\t\t\t\t\t</f:formElements>
\t\t\t\t</f:FormContainer>
\t\t\t</f:formContainers>
\t\t</f:Form>
\t</VBox>
</mvc:View>
\`\`\`

---

### 4. src/i18n/i18n.properties — EXTENSION POINT

Replace CARD_TITLE, CARD_SUBTITLE, FORM_TITLE, and field label keys with spec values.
Keep all other keys EXACTLY as in the template below:

\`\`\`properties
# Card
CARD_TITLE=CARD_TITLE_VALUE
CARD_SUBTITLE=CARD_SUBTITLE_VALUE

# Form
FORM_TITLE=FORM_TITLE_VALUE

# Toolbar
MENU_BUTTON_TOOLTIP=Additional Options

# Overflow menu items
MENU_ABOUT_CARD=What is this card about
MENU_REQUIRED_AUTH=Required Authorization

# About dialog
ABOUT_DIALOG_TITLE=About This Card
ABOUT_DIALOG_TEXT=This card displays entity information.
ABOUT_DIALOG_CLOSE=Close

# Required Authorization dialog
REQUIRED_AUTHORIZATION_TITLE=Required Authorizations
REQUIRED_AUTH_ROLE=To access this card, the following authorization role is required:<br/><b>User</b>
CLOSE=Close
GO_TO_SERVICE=Go to Service

# Field Labels
I18N_KEY_1=Label 1
I18N_KEY_2=Label 2
\`\`\`

Substitutions:
- \`CARD_TITLE_VALUE\` → spec.cardTitle
- \`CARD_SUBTITLE_VALUE\` → spec.cardSubtitle
- \`FORM_TITLE_VALUE\` → spec.formTitle
- Field labels: one line per field using spec.fields[].i18nKey and spec.fields[].label

---

### 5. src/test/utils/MockDataGenerator.js — EXTENSION POINT

Fill getData() with spec.mockData values:

\`\`\`javascript
sap.ui.define([], function () {
\t"use strict";

\tconst datasf = {
\t\t// One line per mockData entry: beField: "value"
\t};

\treturn {
\t\tgetData: function () {
\t\t\treturn datasf;
\t\t}
\t};
});
\`\`\`

---

## Files to Generate (Conditional)

### 6. src/test/unit/helpers/DataHelper.qunit.js — IF spec.generateTests is true

Generate QUnit tests for DataHelper._processData() using spec.fields and spec.mockData.
Structure: 4 QUnit modules in this exact order.

**Import line:**
\`com/sap/partner/wz/{cardSlug}/helpers/DataHelper\`
(substitute cardSlug — NOT the literal word SLUG)

**Module 1 — field mapping:**
Pass an object built from spec.mockData (all beFields present), assert each viewKey equals its mockData value.

**Module 2 — missing field fallback:**
Call \`DataHelper._processData({})\` — assert every viewKey equals \`""\`.

**Module 3 — null field fallback:**
Call \`DataHelper._processData({ FirstBeField: null })\` — assert corresponding viewKey equals \`""\`.
Pick the first field from spec.fields.

**Module 4 — immutability:**
Call \`DataHelper._processData\` with a raw object, then assert original keys are unchanged
and no viewKey was added to the input object.

Example skeleton (adapt to spec.fields):
\`\`\`javascript
/* global QUnit */
/* istanbul ignore file */
sap.ui.define(["com/sap/partner/wz/CARDSLUG/helpers/DataHelper"], function (DataHelper) {
\t"use strict";

\tQUnit.module("DataHelper | _processData — field mapping");
\tQUnit.test("all BE fields are mapped", function (assert) {
\t\tvar oRaw = { /* beField: "mockValue" for each field */ };
\t\tvar oResult = DataHelper._processData(oRaw);
\t\t/* assert.strictEqual(oResult.viewKey, "mockValue", "viewKey") for each field */
\t});

\tQUnit.module("DataHelper | _processData — missing field fallback");
\tQUnit.test("missing field defaults to empty string", function (assert) {
\t\tvar oResult = DataHelper._processData({});
\t\t/* assert.strictEqual(oResult.viewKey, "", "viewKey defaults to ''") for each field */
\t});

\tQUnit.test("null value defaults to empty string", function (assert) {
\t\tvar oResult = DataHelper._processData({ FIRST_BE_FIELD: null });
\t\tassert.strictEqual(oResult.FIRST_VIEW_KEY, "", "null → ''");
\t});

\tQUnit.module("DataHelper | _processData — immutability");
\tQUnit.test("input object is not mutated", function (assert) {
\t\tvar oRaw = { FIRST_BE_FIELD: "test" };
\t\tvar sKeysBefore = JSON.stringify(Object.keys(oRaw).sort());
\t\tDataHelper._processData(oRaw);
\t\tassert.strictEqual(JSON.stringify(Object.keys(oRaw).sort()), sKeysBefore, "Keys unchanged");
\t});
});
\`\`\`

---

## Critical Rules

1. 5 files normally; 6 files if spec.generateTests is true (add DataHelper.qunit.js)
2. COMPLETE content only — no truncation, no "// ... rest of file"
3. SAPUI5 AMD style ONLY — use sap.ui.define(), NOT import/export
4. loadData() in DataHelper.js must NOT be modified — only _processData()
5. Do not add extra fields or logic not present in the spec
6. Validate: every spec.fields[].viewKey must appear in BOTH DataHelper._processData() AND View.view.xml
7. Validate: every spec.fields[].i18nKey must appear in BOTH i18n.properties AND View.view.xml
8. Validate: every spec.mockData key must appear in MockDataGenerator.getData()`;

// ── User prompt ───────────────────────────────────────────────────────────────

/**
 * @param {string} orderDescription
 * @param {object} spec — currentSpec from orchestrator (inner spec from architect)
 * @param {number} retryCount
 * @param {string|null} errorFeedback
 * @returns {string}
 */
export function generateUserPrompt(orderDescription, spec, retryCount = 0, errorFeedback = null) {
  const specText = JSON.stringify(spec, null, 2);

  const testsCheck = spec.generateTests
    ? `\n- [ ] src/test/unit/helpers/DataHelper.qunit.js: 4 QUnit modules for _processData()`
    : '';

  let prompt = `# Original Order\n\n${orderDescription}\n\n# Integration Card Spec\n\n\`\`\`json\n${specText}\n\`\`\`\n\n# Your Task\n\nGenerate the ${spec.generateTests ? '6' : '5'} extension-point source files for this Integration Card.\n\n**Checklist before responding:**\n- [ ] src/manifest.json: sap.app.id = com.sap.partner.wz.${spec.cardSlug || 'SLUG'}, destination = ${spec.destinationName || 'DEST'}\n- [ ] src/helpers/DataHelper.js: _processData() maps all ${spec.fields ? spec.fields.length : '?'} fields\n- [ ] src/View.view.xml: FormElement for each field with correct i18n label and binding\n- [ ] src/i18n/i18n.properties: CARD_TITLE, CARD_SUBTITLE, FORM_TITLE, all field labels\n- [ ] src/test/utils/MockDataGenerator.js: getData() returns all mockData fields${testsCheck}\n\nRespond with valid JSON following the required format.`;

  if (retryCount > 0 && errorFeedback) {
    prompt += `\n\n# ⚠️ RETRY ${retryCount}\n\nPrevious attempt had issues:\n\n${errorFeedback}\n\nFix these issues in your response.`;
  }

  return prompt;
}

export default { systemPrompt, generateStaticFiles, generateUserPrompt };
