/* istanbul ignore file */
sap.ui.define(["sap/ui/base/Object"], function (BaseObject) {
	"use strict";

	// Test double for com/sap/fiorireuselibrary/ui5cardssdk/ErrorHandler.
	// All 4 public methods are no-ops — error display requires live card/DOM
	// which is not available in the unit test environment.

	return BaseObject.extend("com.sap.fiorireuselibrary.ui5cardssdk.ErrorHandler", {
		constructor: function (oComponent) {
			this._oComponent = oComponent;
		},
		handleErrorEvent: function (oEvent, showMessageBox) {},
		handleCustomErrorEvent: function (oEvent) {},
		attachErrorHandlingForModel: function (oModel) {},
		checkMaintenanceMode: function () {}
	});
});
