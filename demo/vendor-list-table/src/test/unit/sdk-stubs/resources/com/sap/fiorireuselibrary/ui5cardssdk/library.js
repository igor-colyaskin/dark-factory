/* istanbul ignore file */
// UI5 requires library.js when a library is listed in sap.ui5.dependencies.libs in manifest.json.
// Without it the card Component fails to load ("Card content failed to create component").
sap.ui.define(["sap/ui/core/Lib"], function (Lib) {
	"use strict";
	return Lib.init({
		name: "com.sap.fiorireuselibrary.ui5cardssdk",
		version: "1.0.0"
	});
});
