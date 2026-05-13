/* istanbul ignore file */
sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
	"use strict";

	// Test double for com/sap/fiorireuselibrary/ui5cardssdk/Base.controller.
	// Full API surface from real SDK — fnODataRead/fnODataCreate are real implementations
	// since they are simple Promise wrappers with no SDK-specific dependencies.

	return Controller.extend("com.sap.fiorireuselibrary.ui5cardssdk.Base", {
		fnAuthMetaDataPRMCheck: function (oMetaData) {
			return !!oMetaData?.metadataString;
		},
		getResourceBundle: function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},
		getCard: function () {
			return this.oCard;
		},
		fnODataRead: function (oModel, sPath, aFilters, oUrlParams) {
			return new Promise(function (resolve, reject) {
				oModel.read(sPath, {
					filters: aFilters || [],
					urlParameters: oUrlParams || {},
					success: resolve,
					error: reject
				});
			});
		},
		fnODataCreate: function (sURL, oData, oModel) {
			return new Promise(function (resolve, reject) {
				oModel.create(sURL, oData, {
					success: function (oData, oResponse) {
						resolve({ data: oData, reponse: oResponse });
					},
					error: reject
				});
			});
		},
		getUrlParameter: function (sParamName) {
			var oUrlParams = new URLSearchParams(window.location.href.split("?")[1]);
			return oUrlParams ? oUrlParams.get(sParamName) : null;
		}
	});
});
