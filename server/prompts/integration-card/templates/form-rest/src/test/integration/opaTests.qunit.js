/* global QUnit */
/* istanbul ignore file */

// Must be set BEFORE sap.ui.require — QUnit auto-starts by default.
// Setting it inside the require callback is too late.
QUnit.config.autostart = false;

sap.ui.require(["com/sap/partner/wz/templatesf/test/integration/AllJourneys"], function () {
	"use strict";
	QUnit.start();
});
