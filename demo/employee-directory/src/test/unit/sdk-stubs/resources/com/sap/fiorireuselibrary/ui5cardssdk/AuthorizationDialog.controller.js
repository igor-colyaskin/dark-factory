/* istanbul ignore file */
sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
	"use strict";

	// Test double for com/sap/fiorireuselibrary/ui5cardssdk/AuthorizationDialog.controller.
	// openDialog and closeAuthDialog are no-ops — Fragment loading requires live DOM.

	return Controller.extend("com.sap.fiorireuselibrary.ui5cardssdk.AuthorizationDialog", {
		constructor: function (oComponent) {
			this._oComponent = oComponent;
		},
		openDialog: function (sRequestMode) {},
		closeAuthDialog: function () {}
	});
});
