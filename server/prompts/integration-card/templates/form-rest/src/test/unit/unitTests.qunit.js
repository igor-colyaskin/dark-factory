/* global QUnit */
/* istanbul ignore file */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.loader.config({
		paths: {
			"com/sap/fiorireuselibrary/ui5cardssdk": "../../test/external_libs/com/sap/fiorireuselibrary/ui5cardssdk"
		}
	});

	sap.ui.require(["com/sap/partner/wz/templatesf/test/unit/AllTests"], function () {
		QUnit.start();
	});
});
