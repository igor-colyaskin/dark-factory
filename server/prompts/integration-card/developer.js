/**
 * Integration Card Developer Prompts
 *
 * LLM generates only the 5 extension-point files.
 * The 6 static files (namespace-only substitution) are written by generateStaticFiles()
 * directly from templates, without LLM involvement — keeps output well within token limits.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function readStub(name) {
	return readFileSync(join(__dirname, 'sdk-stubs', name), 'utf8');
}

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
\t["sap/ui/core/util/MockServer", "./utils/MockDataGenerator"],
\tfunction (MockServer, MockDataGenerator) {
\t\t"use strict";

\t\treturn {
\t\t\tinit: function () {
\t\t\t\treturn new Promise(function (resolve) {
\t\t\t\t\tvar oMockServer = new MockServer({ rootUri: "/api/" });

\t\t\t\t\toMockServer.setRequests([
\t\t\t\t\t\t{
\t\t\t\t\t\t\tmethod: "GET",
\t\t\t\t\t\t\tpath: new RegExp(".*"),
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
      beforeMiddleware: serveResources
      configuration:
        rootPath: "./src/test/unit/sdk-stubs"
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
    "start": "ui5 serve --config ui5-local.yaml -o test/manual/index.html",
    "sandbox": "ui5 serve --config ui5-local.yaml"
  },
  "ui5": {
    "dependencies": ["ui5-middleware-livereload", "ui5-middleware-servestatic"]
  },
  "devDependencies": {
    "@ui5/cli": "^4.0.12",
    "ui5-middleware-livereload": "^3.3.0",
    "ui5-middleware-servestatic": "^3.4.1"
  }
}`;

const T_PACKAGE_JSON_WITH_TESTS = `{
  "name": "com-sap-partner-wz-SLUG",
  "version": "1.0.0",
  "description": "SAP Work Zone Integration Card",
  "scripts": {
    "start": "ui5 serve --config ui5-local.yaml -o test/manual/index.html",
    "sandbox": "ui5 serve --config ui5-local.yaml",
    "test": "ui5-test-runner --webapp src --testsuite test/unit/unitTests.qunit.html --coverage true --no-screenshot --coverage-settings .nycrc.json"
  },
  "ui5": {
    "dependencies": ["ui5-middleware-livereload", "ui5-middleware-servestatic"]
  },
  "devDependencies": {
    "@ui5/cli": "^4.0.12",
    "ui5-middleware-livereload": "^3.3.0",
    "ui5-middleware-servestatic": "^3.4.1",
    "ui5-test-runner": "^5.7.0",
    "geckodriver": "^6.1.0"
  }
}`;

// ── Static file generator ────────────────────────────────────────────────────

const T_ALL_TESTS = `/* istanbul ignore file */
sap.ui.define(
\t[
\t\t"./helpers/DataHelper.qunit"
\t],
\tfunction () {
\t\t"use strict";
\t}
);`;

// cwd is set to webapp root (src/) by ui5-test-runner, so exclude paths are relative to src/
const T_NYCRC = `{"exclude":["test/**","Component.js"]}`;

const T_UNIT_TESTS_HTML = `<!DOCTYPE html>
<html>
<head>
\t<title>Unit tests</title>
\t<meta charset="UTF-8">
\t<script id="sap-ui-bootstrap"
\t\t\tsrc="https://ui5.sap.com/resources/sap-ui-core.js"
\t\t\tdata-sap-ui-resource-roots='{ "com.sap.partner.wz.SLUG": "../../" }'
\t\t\tdata-sap-ui-bindingSyntax="complex"
\t\t\tdata-sap-ui-compatVersion="edge">
\t</script>
\t<link rel="stylesheet" type="text/css"
\t\thref="https://ui5.sap.com/resources/sap/ui/thirdparty/qunit-2.css"/>
\t<script src="https://ui5.sap.com/resources/sap/ui/thirdparty/qunit-2.js"></script>
\t<script src="https://ui5.sap.com/resources/sap/ui/qunit/qunit-junit.js"></script>
\t<script src="https://ui5.sap.com/resources/sap/ui/qunit/qunit-coverage.js"
\t\tdata-sap-ui-cover-never="[sap/m/, sap/ui/thirdparty ,test/]"></script>
\t<script src="https://ui5.sap.com/resources/sap/ui/thirdparty/sinon.js"></script>
\t<script src="https://ui5.sap.com/resources/sap/ui/thirdparty/sinon-qunit.js"></script>
\t<script src="unitTests.qunit.js"></script>
</head>
<body>
\t<div id="qunit"></div>
\t<div id="qunit-fixture"></div>
</body>
</html>`;

const T_UNIT_TESTS_JS = `/* global QUnit */
/* istanbul ignore file */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
\t"use strict";

\tsap.ui.loader.config({
\t\tpaths: {
\t\t\t"com/sap/fiorireuselibrary/ui5cardssdk": "./sdk-stubs/com/sap/fiorireuselibrary/ui5cardssdk"
\t\t}
\t});

\tsap.ui.require(["com/sap/partner/wz/SLUG/test/unit/AllTests"], function () {
\t\tQUnit.start();
\t});
});`;

// ── SDK stubs for local dev and unit tests ───────────────────────────────────
// @sapitpe/ui5cardssdk is not on public npm; it's a Work Zone runtime library.
// These stubs are served via ui5-local.yaml (ui5-middleware-servestatic) and
// remapped in unitTests.qunit.js so both `ui5 serve` and `npm test` work offline.

const SDK_BASE_PATH = 'src/test/unit/sdk-stubs/resources/com/sap/fiorireuselibrary/ui5cardssdk';
// AMD path must NOT contain /resources/ — ui5-test-runner CDN regex intercepts it
const SDK_AMD_PATH = 'src/test/unit/sdk-stubs/com/sap/fiorireuselibrary/ui5cardssdk';

const T_STUB_CUSTOM_ERROR          = readStub('CustomError.js');
const T_STUB_BASE_CONTROLLER       = readStub('Base.controller.js');
const T_STUB_ERROR_HANDLER         = readStub('ErrorHandler.js');
const T_STUB_STORAGE_UTILS         = readStub('StorageUtils.js');
const T_STUB_LIBRARY               = readStub('library.js');
const T_STUB_AUTHORIZATION_DIALOG  = readStub('AuthorizationDialog.controller.js');

/**
 * Returns static files with SLUG substituted — no LLM needed.
 * @param {string} cardSlug
 * @param {object} spec — full architect spec; used for conditional file generation
 * @returns {Array<{path: string, content: string, action: string}>}
 */
// ── Sandbox files (for VIZ-001 preview) ─────────────────────────────────────

const T_SANDBOX_SETUP = `/* istanbul ignore file */
sap.ui.define([], function () {
\t"use strict";
\tvar WZHostId = "wz-host";
\tvar DefaultCardHost;
\treturn {
\t\tcreateDefaultHostCard: function () {
\t\t\tDefaultCardHost = new window.sap.ui.integration.Host(WZHostId, {
\t\t\t\tresolveDestination: function () {
\t\t\t\t\treturn "";
\t\t\t\t}
\t\t\t});
\t\t},
\t\taddContextAwarnessAndHostToCard: function (oCard) {
\t\t\tif (!DefaultCardHost) {
\t\t\t\tthis.createDefaultHostCard();
\t\t\t}
\t\t\toCard.setHost(DefaultCardHost);
\t\t}
\t};
});`;

const T_MANUAL_INDEX_HTML = `<!DOCTYPE html>
<html>
<head>
\t<meta charset="utf-8">
\t<meta name="viewport" content="width=device-width, initial-scale=1.0">
\t<title>com.sap.partner.wz.SLUG</title>
\t<style>
\t\t#df-loading {
\t\t\tposition: fixed; inset: 0;
\t\t\tdisplay: flex; align-items: center; justify-content: center;
\t\t\tbackground: #fff; z-index: 9999;
\t\t}
\t\t#df-loading::after {
\t\t\tcontent: '';
\t\t\twidth: 40px; height: 40px;
\t\t\tborder: 3px solid #e0e0e0;
\t\t\tborder-top-color: #0070f2;
\t\t\tborder-radius: 50%;
\t\t\tanimation: df-spin 0.8s linear infinite;
\t\t}
\t\t@keyframes df-spin { to { transform: rotate(360deg); } }
\t</style>
\t<script id="sap-ui-bootstrap"
\t\tsrc="https://ui5.sap.com/resources/sap-ui-integration.js"
\t\tdata-sap-ui-theme="sap_horizon"
\t\tdata-sap-ui-compatVersion="edge"
\t\tdata-sap-ui-language="en_US"
\t\tdata-sap-ui-libs="sap.ui.core"
\t\tdata-sap-ui-async="true"
\t\tdata-sap-ui-resource-roots='{ "com.sap.partner.wz.SLUG": "../../", "com.sap.fiorireuselibrary.ui5cardssdk": "../unit/sdk-stubs/resources/com/sap/fiorireuselibrary/ui5cardssdk" }'
\t\tdata-sap-ui-on-init="module:com/sap/partner/wz/SLUG/test/manual/init">
\t</script>
</head>
<body class="sapUiBody sapUiSizeCompact" style="margin:1rem">
\t<div id="df-loading"></div>
\t<div id="content" style="margin:1rem"></div>
</body>
</html>`;

const T_MANUAL_INIT_JS = `/* istanbul ignore file */
sap.ui.define(
\t[
\t\t"../sandboxSetup",
\t\t"../mockserver",
\t\t"sap/ui/integration/widgets/Card"
\t],
\tfunction (sandbox, mockserver, Card) {
\t\t"use strict";
\t\tmockserver.init()
\t\t\t.then(function () {
\t\t\t\tvar oCard = new Card({
\t\t\t\t\tmanifest: "../../manifest.json",
\t\t\t\t\twidth: "80rem",
\t\t\t\t\theight: "auto"
\t\t\t\t});
\t\t\t\tvar bHidden = false;
\t\t\t\toCard.addEventDelegate({
\t\t\t\t\tonAfterRendering: function () {
\t\t\t\t\t\tif (!bHidden) {
\t\t\t\t\t\t\tbHidden = true;
\t\t\t\t\t\t\tvar oSpinner = document.getElementById("df-loading");
\t\t\t\t\t\t\tif (oSpinner) { oSpinner.style.display = "none"; }
\t\t\t\t\t\t}
\t\t\t\t\t}
\t\t\t\t});
\t\t\t\toCard.placeAt("content");
\t\t\t\tsandbox.addContextAwarnessAndHostToCard(oCard);
\t\t\t})
\t\t\t.catch(function (error) {
\t\t\t\tconsole.error("Failed to initialize mock server:", error);
\t\t\t});
\t}
);`;

// ── Static generation helpers ──────────────────────────────────────────────────

function generateConfluencePage(spec, slug, slugDot) {
  const namespace = 'com.sap.partner.wz.' + slugDot;
  const destination = spec.destinationName || '??????';
  const protocolLabel = { rest: 'REST', odata2: 'OData v2', odata4: 'OData v4' }[spec.protocol] || '??????';
  const title = spec.cardTitle || slug;
  const purpose = spec.cardSubtitle || '??????';
  const today = new Date().toISOString().slice(0, 10);

  const TD = ' style="text-align: left;vertical-align: top;"';
  const row = (k, v) => '<tr><td' + TD + '>' + k + '</td><td' + TD + '>' + v + '</td></tr>';
  const h3 = (t) => '<h3 style="text-align: left;"><strong>' + t + '</strong></h3>';
  const table = (rows) => '<table class="wrapped"><colgroup><col /><col /></colgroup><tbody>' + rows.join('') + '</tbody></table>';
  const table3 = (rows) => '<table class="wrapped"><colgroup><col /><col /><col /></colgroup><tbody>' + rows.join('') + '</tbody></table>';
  const row3 = (a, b, c) => '<tr><td' + TD + '>' + a + '</td><td' + TD + '>' + b + '</td><td' + TD + '>' + c + '</td></tr>';
  const p = (t) => '<p>' + t + '</p>';
  const ul = (items) => '<ul>' + items.map(i => '<li>' + i + '</li>').join('') + '</ul>';

  const fieldRows = (spec.fields || []).map(f => row(f.beField, f.label));

  const parts = [
    h3('Card Information'),
    table([
      row('Name of Card', title + ' (id: ' + namespace + ')'),
      row('Business responsible', '??????'),
      row('Purpose and end-user benefit', purpose),
      row('Taxonomie', 'Content'),
      row('End user documentation', '&lt;link to the documentation located in SAP Work Zone Help Center&gt;'),
      row('Audience', 'all employees'),
      row('Visibility', 'Internal'),
      row('Estimated number of audience', '??????'),
      row('Data classification', 'internal'),
      row('Support channel for the Card', 'SAP Build Work Zone Help Center'),
      row('Support channel for the Source System', '??????'),
      row('Feedback service', 'Feedback service'),
      row('Go Live date', '??????'),
      row('End of Live date', '??????'),
      row('Link to JIRA', '??????'),
    ]),

    h3('Technical Requirements'),
    table([
      row('Technical responsible', '??????'),
      row('Technical documentation', '??????'),
      row('Type of Connection to Work Zone (read/write)', 'READ'),
      row('Name(s) of destination(s) in BTP', destination),
      row('Description of the connection', protocolLabel + ' (GET /??????)'),
      row('Connected System', '??????'),
      row('If any extra App is needed (e.g. Proxy) describe here', '&mdash;'),
      row('User type', '??????'),
      row('Authentication type', 'OAuth2SAMLBearerAssertion'),
      row('Programming Languages', 'JavaScript, UI5'),
      row('Code is checked', 'Checkmarx, GitHub Scanner'),
      row('Code is scanned by Dependency Scanner', 'Dependabot'),
      row('Link to source code located in SAP GitHub', '??????'),
      row('Tested by QA', '??????'),
      row('Test results', '??????'),
    ]),

    h3('BE Response Fields'),
    table(fieldRows),

    h3('Compliance Requirements'),
    table([
      row('Connected systems must have a valid security concept', '11411'),
      row('Connected systems must have a Works Council approval if required', '??????'),
      row('Connected systems must have a PET entry', '17121'),
      row('Description of processed data and purpose of stored data', '??????'),
    ]),
    ul([
      'all cards must fulfill SAP compliance, data privacy and security requirements',
      'all cards must have a link to support channel maintained in the card',
      'all cards must fulfill accessibility standards (WCAG)',
      'All tiles for a connected system are subject to IT co-determination (according to IT RBV)',
    ]),

    h3('Governance and Lifecycle'),
    p('All cards have a life cycle for one year. After one year all card owners will be informed about end of life and if card needs to be extended.'),
    p('If a card has no valid owner or responsible person anymore the card will be deactivated/deleted.'),
    p('If a card breaches against any SAP policies the card will be deactivated/deleted.'),
    p('SWZ admins will drop a public note in case we need to deactivate a card.'),
    p('Enduser documentation is located in SAP Work Zone Help Center.'),
    p('Technical documentation is located in TBD (extra App, Wiki, protected Excel sheet).'),

    h3('Development and Deployment'),
    p('Cards will be developed first in SWZ Dev. Cards need to be tested and approved by QA and PO in SWZ QA. Cards will be deployed once all above requirements are fulfilled and tested properly.'),
    p('Any card must have secure libraries. Only SAP internal libraries are allowed. Connections to any outside SAP network (libraries, services) are not allowed.'),
    p('Code needs to be checked via CheckMarx and GitHub Scanner for security vulnerabilities. Code needs to be scanned by Dependency Scanner: Whitesource, Blackduck.'),
    ul([
      'Connections via BTP Destinations only',
      'API calls from SWZ or Source System are ok',
      'New OAuth clients need to be requested via ticket and final approval by PO',
      'All authorization goes through Workzone',
      'Languages allowed: JavaScript',
      'Source code must be located in SAP GitHub',
    ]),

    h3('Version History'),
    table3([
      row3('<strong>Version</strong>', '<strong>Date</strong>', '<strong>Changes</strong>'),
      row3('1.0.0', today, 'Initial release'),
    ]),
  ];

  return parts.join('\n');
}


function generateManifest(slug, slugDot, destinationName) {
  const manifest = {
    "_version": "1.15.0",
    "sap.app": {
      "id": `com.sap.partner.wz.${slugDot}`,
      "type": "card",
      "i18n": "i18n/i18n.properties",
      "title": "{{TITLE}}",
      "subTitle": "{{SUBTITLE}}",
      "applicationVersion": { "version": "1.0.0" },
      "tags": { "keywords": ["Component", "PartnerBench", slug] }
    },
    "sap.ui": {
      "technology": "UI5",
      "deviceTypes": { "desktop": true, "phone": true, "tablet": true },
      "icons": { "icon": "sap-icon://technical-object" }
    },
    "sap.ui5": {
      "rootView": { "viewName": `com.sap.partner.wz.${slugDot}.View`, "type": "XML", "async": true, "id": "app" },
      "dependencies": {
        "minUI5Version": "1.38",
        "libs": { "sap.m": {}, "com.sap.fiorireuselibrary.ui5cardssdk": {} }
      },
      "resourceRoots": {
        "com.sap.fiorireuselibrary.ui5cardssdk": "./resources/com/sap/fiorireuselibrary/ui5cardssdk"
      },
      "models": {
        "i18n": {
          "type": "sap.ui.model.resource.ResourceModel",
          "settings": { "bundleName": `com.sap.partner.wz.${slugDot}.i18n.i18n` }
        }
      },
      "resources": { "css": [{ "uri": "css/style.css", "id": "" }] }
    },
    "sap.card": {
      "type": "Component",
      "designtime": "dt/configuration",
      "requiredHeight": "13rem",
      "configuration": {
        "destinations": { [destinationName]: { "name": destinationName } },
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
  };
  return JSON.stringify(manifest, null, 2);
}

function generateI18nProperties(spec) {
  const fieldLines = (spec.fields || []).map(f => `${f.i18nKey}=${f.label}`).join('\n');
  const filterGoLine = (spec.filterFields?.length > 0) ? 'FILTER_GO=Filter\n\n' : '';
  return [
    '# Card',
    `CARD_TITLE=${spec.cardTitle || ''}`,
    `CARD_SUBTITLE=${spec.cardSubtitle || ''}`,
    '',
    '# Form',
    `FORM_TITLE=${spec.formTitle || spec.cardTitle || ''}`,
    '',
    '# Toolbar',
    'MENU_BUTTON_TOOLTIP=Additional Options',
    '',
    '# Overflow menu items',
    'MENU_ABOUT_CARD=What is this card about',
    'MENU_REQUIRED_AUTH=Required Authorization',
    '',
    '# About dialog',
    'ABOUT_DIALOG_TITLE=About This Card',
    'ABOUT_DIALOG_TEXT=This card displays entity information.',
    'ABOUT_DIALOG_CLOSE=Close',
    '',
    '# Required Authorization dialog',
    'REQUIRED_AUTHORIZATION_TITLE=Required Authorizations',
    'REQUIRED_AUTH_ROLE=To access this card, the following authorization role is required:<br/><b>User</b>',
    'CLOSE=Close',
    'GO_TO_SERVICE=Go to Service',
    '',
    filterGoLine + '# Field Labels',
    fieldLines,
    '',
  ].join('\n');
}

function buildMainController(slug, spec) {
  const ns = slug.replace(/-/g, '.');
  const filterFields = spec.filterFields || [];
  const fields = spec.fields || [];

  let filterMethod = '';
  let setDataCall = 'this.getView().getModel().setData(oData);';

  if (filterFields.length > 0) {
    const checks = filterFields.map(beField => {
      const field = fields.find(f => f.beField === beField);
      const vk = field ? field.viewKey : (beField.charAt(0).toLowerCase() + beField.slice(1));
      return `\t\t\t\t\tvar s${beField} = (this.byId("filter${beField}") || { getValue: function(){ return ""; } }).getValue();\n\t\t\t\t\tif (s${beField}) { bMatch = bMatch && String(oItem.${vk} || "").toLowerCase().includes(s${beField}.toLowerCase()); }`;
    }).join('\n');

    filterMethod = `

\t\t\tonFilterGo: function () {
\t\t\t\tvar aAll = this.getView().getModel().getProperty("/allItems") || [];
\t\t\t\tvar aFiltered = aAll.filter(function (oItem) {
\t\t\t\t\tvar bMatch = true;
${checks}
\t\t\t\t\treturn bMatch;
\t\t\t\t}.bind(this));
\t\t\t\tthis.getView().getModel().setProperty("/items", aFiltered);
\t\t\t},`;

    setDataCall = 'var aItems = oData.items || [];\n\t\t\t\t\t\tthis.getView().getModel().setData({ allItems: aItems, items: aItems });';
  }

  return `sap.ui.define(
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

\t\treturn BaseController.extend("com.sap.partner.wz.${ns}.Main", {
\t\t\tformatter: formatter,

\t\t\tonInit: function () {
\t\t\t\tthis.getView().setModel(new JSONModel({}));
\t\t\t},

\t\t\tonCardReady: function () {
\t\t\t\tthis._loadData();
\t\t\t},

\t\t\tonStatusPress: function (oEvent) {},${filterMethod}

\t\t\tonMenuPress: function (oEvent) {
\t\t\t\tconst oView = this.getView();
\t\t\t\tconst oButton = oEvent.getSource();
\t\t\t\tif (this._pMenu) {
\t\t\t\t\tthis._pMenu.then(function (oMenu) { oMenu.openBy(oButton); });
\t\t\t\t\treturn;
\t\t\t\t}
\t\t\t\tthis._pMenu = Fragment.load({
\t\t\t\t\tid: oView.getId(),
\t\t\t\t\tname: "com.sap.partner.wz.${ns}.fragments.Menu",
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
\t\t\t\t\t\t${setDataCall}
\t\t\t\t\t}.bind(this))
\t\t\t\t\t.catch(function (oError) {
\t\t\t\t\t\tif (oError && typeof oError.getParameters === "function") {
\t\t\t\t\t\t\toErrorHandler.handleCustomErrorEvent(oError);
\t\t\t\t\t\t} else {
\t\t\t\t\t\t\tLog.error("${slug}: data loading error", oError);
\t\t\t\t\t\t}
\t\t\t\t\t})
\t\t\t\t\t.finally(function () {
\t\t\t\t\t\tif (oForm) { oForm.setBusy(false); }
\t\t\t\t\t});
\t\t\t}
\t\t});
\t}
);`;
}

// ── Static files ───────────────────────────────────────────────────────────────

export function generateStaticFiles(cardSlug, spec = {}) {
  const slug = cardSlug || 'card';
  // Namespace uses dots; slug may contain hyphens (e.g. "employee-details-card" → "employee.details.card")
  const slugDot = slug.replace(/-/g, '.');
  const slugPath = slugDot.replace(/\./g, '/');
  const sub = (s) => s
    .replace(/com\.sap\.partner\.wz\.SLUG/g, `com.sap.partner.wz.${slugDot}`)
    .replace(/com\/sap\/partner\/wz\/SLUG/g, `com/sap/partner/wz/${slugPath}`)
    .replace(/SLUG/g, slug);
  const pkgJson = spec.generateTests ? sub(T_PACKAGE_JSON_WITH_TESTS) : sub(T_PACKAGE_JSON);
  const isTable = (spec.viewControls || []).some(c => /table/i.test(c));

  const files = [
    { path: 'src/Component.js',               content: sub(T_COMPONENT),              action: 'create' },
    { path: 'src/Main.controller.js',          content: buildMainController(slug, spec), action: 'create' },
    { path: 'src/model/formatter.js',          content: T_FORMATTER,                    action: 'create' },
    { path: 'src/css/style.css',               content: '',                             action: 'create' },
    { path: 'src/test/mockserver.js',          content: T_MOCKSERVER,                   action: 'create' },
    { path: 'package.json',                    content: pkgJson,                        action: 'create' },
    { path: 'ui5-local.yaml',                  content: sub(T_UI5_LOCAL_YAML),          action: 'create' },
    { path: 'ui5.yaml',                        content: sub(T_UI5_YAML),               action: 'create' },
    // manifest and i18n — fully deterministic from spec, no LLM needed
    { path: 'src/manifest.json',               content: generateManifest(slug, slugDot, spec.destinationName || ''), action: 'create' },
    { path: 'src/i18n/i18n.properties',        content: generateI18nProperties(spec),  action: 'create' },
    // SDK stubs — always needed: ui5 serve uses them via ui5-middleware-servestatic
    { path: `${SDK_BASE_PATH}/CustomError.js`,       content: T_STUB_CUSTOM_ERROR,       action: 'create' },
    { path: `${SDK_BASE_PATH}/Base.controller.js`,   content: T_STUB_BASE_CONTROLLER,    action: 'create' },
    { path: `${SDK_BASE_PATH}/ErrorHandler.js`,      content: T_STUB_ERROR_HANDLER,      action: 'create' },
    { path: `${SDK_BASE_PATH}/StorageUtils.js`,               content: T_STUB_STORAGE_UTILS,           action: 'create' },
    { path: `${SDK_BASE_PATH}/library.js`,                    content: T_STUB_LIBRARY,                 action: 'create' },
    { path: `${SDK_BASE_PATH}/AuthorizationDialog.controller.js`, content: T_STUB_AUTHORIZATION_DIALOG, action: 'create' },
    // AMD stubs — same files at path without /resources/ so ui5-test-runner CDN regex doesn't intercept
    { path: `${SDK_AMD_PATH}/CustomError.js`,       content: T_STUB_CUSTOM_ERROR,       action: 'create' },
    { path: `${SDK_AMD_PATH}/Base.controller.js`,   content: T_STUB_BASE_CONTROLLER,    action: 'create' },
    { path: `${SDK_AMD_PATH}/ErrorHandler.js`,      content: T_STUB_ERROR_HANDLER,      action: 'create' },
    { path: `${SDK_AMD_PATH}/StorageUtils.js`,      content: T_STUB_STORAGE_UTILS,      action: 'create' },
    { path: `${SDK_AMD_PATH}/library.js`,           content: T_STUB_LIBRARY,            action: 'create' },
    { path: `${SDK_AMD_PATH}/AuthorizationDialog.controller.js`, content: T_STUB_AUTHORIZATION_DIALOG, action: 'create' },
    // Sandbox files — needed for VIZ-001 preview via `npm run sandbox`
    { path: 'src/test/sandboxSetup.js',              content: T_SANDBOX_SETUP,                    action: 'create' },
    { path: 'src/test/manual/index.html',            content: sub(T_MANUAL_INDEX_HTML),           action: 'create' },
    { path: 'src/test/manual/init.js',               content: T_MANUAL_INIT_JS,                   action: 'create' },
  ];

  // DataEngine — only for table layout (REST pagination/sort/filter helper)
  if (isTable) {
    files.push({ path: 'src/test/utils/DataEngine.js', content: T_DATA_ENGINE, action: 'create' });
  }

  // README + confluence.html — always
  const fieldRows = (spec.fields || []).map(f => `| ${f.beField} | ${f.label} |`).join('\n') || '| — | — |';
  const today = new Date().toISOString().slice(0, 10);
  const namespace = `com.sap.partner.wz.${slugDot}`;
  const destination = spec.destinationName || '—';
  const protocolLabel = { rest: 'REST', odata2: 'OData v2', odata4: 'OData v4' }[spec.protocol] || '—';

  const docSections = [
    `# ${spec.cardTitle || slug}`,
    '',
    `> ${spec.cardSubtitle || ''}`,
    '',
    '## Technical Details',
    '',
    '| Parameter   | Value |',
    '|-------------|-------|',
    `| Destination | ${destination} |`,
    `| Namespace   | ${namespace} |`,
    '| Card Type   | Component (SAP Work Zone IC) |',
    '',
    '## Data Sources',
    '',
    '### Endpoint 1',
    '',
    '| Parameter | Value |',
    '|-----------|-------|',
    `| Type      | ${protocolLabel} |`,
    '| Method    | GET |',
    '| URL       | — |',
    '',
    '| BE Field | Label |',
    '|----------|-------|',
    fieldRows,
    '',
    '## Version History',
    '',
    '| Version | Date | Changes |',
    '|---------|------|---------|',
    `| 1.0.0   | ${today} | Initial release |`,
    '',
  ].join('\n');

  files.push({ path: 'README.md',     content: docSections, action: 'create' });
  files.push({ path: 'confluence.html', content: generateConfluencePage(spec, slug, slugDot), action: 'create' });

  if (spec.generateTests) {
    files.push(
      { path: 'src/test/unit/AllTests.js',           content: T_ALL_TESTS,                    action: 'create' },
      { path: 'src/test/unit/unitTests.qunit.html',  content: sub(T_UNIT_TESTS_HTML),          action: 'create' },
      { path: 'src/test/unit/unitTests.qunit.js',    content: sub(T_UNIT_TESTS_JS),            action: 'create' },
      { path: '.nycrc.json',                         content: T_NYCRC,                         action: 'create' }
    );
  }

  return files;
}

// ── System prompt ─────────────────────────────────────────────────────────────

export const systemPrompt = `You are a Developer agent in Dark Factory that generates SAP Work Zone Integration Cards.

## Language Rule

ALL generated content MUST be in English — mock data values, labels, status values, comments, error messages, summary text. No exceptions regardless of the language of the order.

## Your Role

Given a card spec from the Architect, you produce 2 of the 5 extension-point source files.
(View.view.xml is generated in a separate focused call. manifest.json, i18n.properties, and static files are handled by templates — do NOT include them.)
The card uses the templateSF pattern — a SAP UI5 AMD-style Component card.

## Required Output Format

\`\`\`json
{
  "thinking": "Your plan: which fields map to which controls, any formatters used, etc.",
  "files": [
    { "path": "src/helpers/DataHelper.js", "content": "COMPLETE file content", "action": "create" },
    { "path": "src/test/utils/MockDataGenerator.js", "content": "COMPLETE file content", "action": "create" }
  ],
  "questions": [],
  "summary": "What was generated",
  "next_steps": ["Deploy to Work Zone content package"]
}
\`\`\`

## Files to Generate

### 1. src/helpers/DataHelper.js — EXTENSION POINT

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
\t\t\t// IMPLEMENT based on spec.viewControls:
\t\t}
\t};
});
\`\`\`

**If spec.viewControls contains a Table control** — collection, _processData returns { items: [...] }:
\`\`\`javascript
_processData: function (oRawData) {
\tconst aRaw = Array.isArray(oRawData) ? oRawData : (oRawData.value || oRawData.results || []);
\treturn {
\t\titems: aRaw.map(function (oItem) {
\t\t\treturn {
\t\t\t\t// One line per field: viewKey: oItem.beField || ""
\t\t\t};
\t\t})
\t};
}
\`\`\`

**If spec.viewControls does NOT contain a Table control** — single entity, _processData returns a flat object:
\`\`\`javascript
_processData: function (oRawData) {
\tconst oMapped = {
\t\t// One line per field: viewKey: oRawData.beField || ""
\t};
\treturn oMapped;
}
\`\`\`

**Protocol note:** For OData (spec.protocol === "odata2" or "odata4"), adjust the request URL to include OData query params and unwrap the response accordingly. Do NOT change the function signature or the catch block.

---

### 2. src/test/utils/MockDataGenerator.js — EXTENSION POINT

**CRITICAL: MockDataGenerator keys must match beField exactly (same notation as in the real BE response).**
The mock server wraps the array as { aRawData }, and DataHelper._processData() reads oItem[beField].
Using viewKey (camelCase) instead of beField produces empty rows.

**If spec.viewControls does NOT contain a Table control** — getData() returns a single object with beField keys:
\`\`\`javascript
sap.ui.define([], function () {
\t"use strict";
\tconst datasf = { /* keys = beField (PascalCase), values from spec.mockData */ };
\treturn { getData: function () { return datasf; } };
});
\`\`\`

**If spec.viewControls contains a Table control** — getData() returns an array with beField keys. Use spec.mockData as the template for row 1; vary values realistically across all rows. Generate the number of rows requested in the order (default: 5).
\`\`\`javascript
sap.ui.define([], function () {
\t"use strict";
\tconst aData = [
\t\t{ /* row 1: keys = beField (same as BE response), values from spec.mockData */ },
\t\t{ /* row 2: realistic variation, same beField keys */ },
\t\t// ...
\t];
\treturn { getData: function () { return aData; } };
});
\`\`\`

---

## Critical Rules

1. Always exactly 2 files — no more, no less
2. COMPLETE content only — no truncation, no "// ... rest of file"
3. SAPUI5 AMD style ONLY — use sap.ui.define(), NOT import/export
4. loadData() in DataHelper.js must NOT be modified — only _processData()
5. Do not add extra fields or logic not present in the spec
6. Validate: every spec.fields[].viewKey must appear in DataHelper._processData()
7. Validate: every spec.mockData key must appear in MockDataGenerator.getData()`;

// ── View generator (separate call to stay within Hyperspace token limit) ─────

export const viewGeneratorSystemPrompt = `You are a Developer agent generating a single SAP UI5 View file for a Work Zone Integration Card.

## Language Rule

ALL generated content MUST be in English — placeholder text, no-data messages, button labels, comments. No exceptions regardless of the language of the order.

## Your Role

Generate ONLY src/View.view.xml based on the spec and DataHelper context provided.
Use SAPUI5 XML view syntax.

## Namespace Rule

Use **spec.cardNamespace** (pre-computed, dots only) — NEVER spec.cardSlug — in XML namespace contexts.
- controllerName: \`com.sap.partner.wz.\${spec.cardNamespace}.Main\`
Example: cardNamespace = "pp.points.card" → \`com.sap.partner.wz.pp.points.card.Main\`

## Required Output Format

\`\`\`json
{
  "thinking": "controls chosen, column count, field-to-control mapping",
  "files": [
    { "path": "src/View.view.xml", "content": "COMPLETE file content", "action": "create" }
  ],
  "summary": "View generated"
}
\`\`\`

## View Generation Rules

### If spec.viewControls does NOT contain a Table control (form / details view)

Distribute fields across 1–4 columns:
- 1–3 fields: 1 column  |  4–6: 2 columns  |  7–9: 3 columns  |  10+: 4 columns

Field controls:
- "Text": \`<Text text="{/viewKey}" />\`
- "Link": \`<Link text="{/viewKey}" press=".onStatusPress" />\`
- "ObjectStatus": \`<ObjectStatus text="{/viewKey}" />\`
- formatter "formatDate": \`<Text text="{ path: '/viewKey', formatter: '.formatter.formatDate' }" />\`

Template (adjust columnsXL/L/M to match column count):
\`\`\`xml
<mvc:View
\tcontrollerName="com.sap.partner.wz.{cardNamespace}.Main"
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

### If spec.viewControls contains sap.m.Table

Bind items to \`{/items}\`. One Column per field, one cell per field in ColumnListItem.

- column header: \`<Text text="{i18n>I18N_KEY}" />\`
- cell default: \`<Text text="{viewKey}" />\`
- cell with formatter: \`<Text text="{ path: 'viewKey', formatter: '.formatter.formatDate' }" />\`

Template:
\`\`\`xml
<mvc:View
\tcontrollerName="com.sap.partner.wz.{cardNamespace}.Main"
\txmlns:mvc="sap.ui.core.mvc"
\txmlns="sap.m"
\txmlns:core="sap.ui.core"
>
\t<VBox class="sapUiSmallMargin">
\t\t<OverflowToolbar design="Transparent">
\t\t\t<Title text="{i18n>FORM_TITLE}" level="H4" />
\t\t\t<ToolbarSpacer />
\t\t\t<Button id="menuButton" icon="sap-icon://overflow" type="Transparent"
\t\t\t\ttooltip="{i18n>MENU_BUTTON_TOOLTIP}" press=".onMenuPress" />
\t\t</OverflowToolbar>
\t\t<Table id="mainTable" items="{/items}" growing="true" growingThreshold="20">
\t\t\t<columns>
\t\t\t\t<Column><Text text="{i18n>I18N_KEY}" /></Column>
\t\t\t</columns>
\t\t\t<items>
\t\t\t\t<ColumnListItem>
\t\t\t\t\t<cells>
\t\t\t\t\t\t<Text text="{viewKey}" />
\t\t\t\t\t</cells>
\t\t\t\t</ColumnListItem>
\t\t\t</items>
\t\t</Table>
\t</VBox>
</mvc:View>
\`\`\`

### Multiple controls in spec.viewControls

Reason from spec.viewControls list and spec.fields to compose the View.
Render controls in the order they appear in spec.viewControls.
Wrap in VBox with standard sapUiSmallMargin.

### Filter bar (Table views only)

Only add filter controls when spec.filterFields is a non-empty array.
Use ONLY the beField names listed in spec.filterFields — never add filters for other fields.
Place filter inputs in a HBox above the OverflowToolbar.
Each Input uses the matching spec.fields[].i18nKey as placeholder and id="filter{BeField}" (e.g. id="filterTier").
Add one "Filter" button with i18n key FILTER_GO, press=".onFilterGo" at the end of the HBox.
The FILTER_GO key MUST also appear in src/i18n/i18n.properties as: FILTER_GO=Filter

The controller MUST include an onFilterGo handler that:
1. Reads each filter input value by id (sap.ui.getCore().byId("filter{BeField}").getValue())
2. Builds a params object: { BeField: value, ... } — skip empty values
3. Calls this._oDataHelper.getData(params) and updates the model with the result

If spec.filterFields is absent or empty → do NOT add any filter controls.

## Critical Rules

1. Exactly 1 file: src/View.view.xml
2. COMPLETE content — no truncation
3. Every spec.fields[].viewKey must appear in bindings
4. Every spec.fields[].i18nKey must appear in labels
5. SAPUI5 XML syntax only`;

/**
 * @param {object} spec
 * @param {string} dataHelperContent — DataHelper.js from Call 1 (for binding consistency)
 * @returns {string}
 */
export function generateViewUserPrompt(spec, dataHelperContent = '') {
  const slug = spec.cardSlug || 'card';
  const specForLLM = { ...spec, cardNamespace: slug.replace(/-/g, '.') };
  const specText = JSON.stringify(specForLLM, null, 2);
  const lines = [
    '# Integration Card Spec',
    '',
    '```json',
    specText,
    '```'
  ];
  if (dataHelperContent) {
    lines.push('', '# DataHelper.js (generated in previous call — match viewKey bindings)', '', '```javascript', dataHelperContent, '```');
  }
  lines.push('', `Generate src/View.view.xml for all ${spec.fields?.length || 0} fields. Respond with valid JSON.`);
  return lines.join('\n');
}

// ── User prompt ───────────────────────────────────────────────────────────────

/**
 * @param {string} orderDescription
 * @param {object} spec — currentSpec from orchestrator (inner spec from architect)
 * @param {number} retryCount
 * @param {string|null} errorFeedback
 * @returns {string}
 */
export function generateUserPrompt(orderDescription, spec, retryCount = 0, errorFeedback = null) {
  // Provide pre-computed namespace so LLM doesn't need to convert hyphens to dots
  const slug = spec.cardSlug || 'card';
  const specForLLM = { ...spec, cardNamespace: slug.replace(/-/g, '.') };
  const specText = JSON.stringify(specForLLM, null, 2);

  let prompt = `# Original Order\n\n${orderDescription}\n\n# Integration Card Spec\n\n\`\`\`json\n${specText}\n\`\`\`\n\n# Your Task\n\nGenerate the 2 extension-point source files for this Integration Card. (manifest.json, i18n.properties, Main.controller.js, and View.view.xml are generated separately.)\n\n**Checklist before responding:**\n- [ ] src/helpers/DataHelper.js: _processData() maps all ${spec.fields ? spec.fields.length : '?'} fields, viewControls = ${JSON.stringify(spec.viewControls || [])}, protocol = ${spec.protocol || 'rest'}\n- [ ] src/test/utils/MockDataGenerator.js: getData() returns correct data shape for viewControls = ${JSON.stringify(spec.viewControls || [])}, generate ${spec.mockRowCount || 5} rows\n\nRespond with valid JSON following the required format.`;

  if (retryCount > 0 && errorFeedback) {
    prompt += `\n\n# ⚠️ RETRY ${retryCount}\n\nPrevious attempt had issues:\n\n${errorFeedback}\n\nFix these issues in your response.`;
  }

  return prompt;
}


// ── Test generator (separate LLM call to stay within Hyperspace token limits) ──

export const testGeneratorSystemPrompt = `You are a QUnit test writer for SAP UI5 Integration Cards.

Given a DataHelper.js implementation and a card spec, generate DataHelper.qunit.js with exactly 4 QUnit modules.

## Required Output Format

\`\`\`json
{
  "files": [
    { "path": "src/test/unit/helpers/DataHelper.qunit.js", "content": "COMPLETE file content", "action": "create" }
  ]
}
\`\`\`

## File Structure

4 QUnit modules in this exact order:

**Module 1 — field mapping:**
Pass an object built from spec.mockData (all beFields present), assert each viewKey equals its mockData value.

**Module 2 — missing field fallback:**
Call \`DataHelper._processData({})\` — assert every viewKey equals \`""\`.

**Module 3 — null field fallback:**
Call \`DataHelper._processData({ FirstBeField: null })\` — assert corresponding viewKey equals \`""\`.
Use the first field from spec.fields.

**Module 4 — immutability:**
Call \`DataHelper._processData\` with a raw object, assert original keys are unchanged.

## Import line

\`com/sap/partner/wz/{cardSlug}/helpers/DataHelper\`
(substitute actual cardSlug value)

## Rules

- SAPUI5 AMD style: sap.ui.define(), NOT import/export
- /* global QUnit */ and /* istanbul ignore file */ at the top
- Complete file only — no truncation`;

/**
 * @param {object} spec — full architect spec
 * @param {string} dataHelperContent — content of DataHelper.js generated by developer
 * @returns {string}
 */
export function generateTestsUserPrompt(spec, dataHelperContent) {
  return `# Card Spec

\`\`\`json
${JSON.stringify({ cardSlug: spec.cardSlug, fields: spec.fields, mockData: spec.mockData }, null, 2)}
\`\`\`

# DataHelper.js Implementation

\`\`\`javascript
${dataHelperContent}
\`\`\`

Generate DataHelper.qunit.js with 4 QUnit modules as specified. Respond with valid JSON.`;
}

export default { systemPrompt, generateStaticFiles, generateUserPrompt, viewGeneratorSystemPrompt, generateViewUserPrompt, testGeneratorSystemPrompt, generateTestsUserPrompt };
