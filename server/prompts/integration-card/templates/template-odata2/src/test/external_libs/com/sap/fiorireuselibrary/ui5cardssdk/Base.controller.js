/* istanbul ignore file */
sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
	"use strict";

	return Controller.extend("com.sap.fiorireuselibrary.ui5cardssdk.Base", {
		fnAuthMetaDataPRMCheck: function (oMetaData) {
			return !!oMetaData?.metadataString;
		},
		getResourceBundle: function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},
		getCard() {
			return this.oCard;
		},
		fnODataRead: function (oModel, sPath, aFilters, oUrlParams) {
			return new Promise((resolve, reject) => {
				oModel.read(sPath, {
					filters: aFilters || [],
					urlParameters: oUrlParams || {},
					success: (oData) => resolve(oData),
					error: (oError) => reject(oError)
				});
			});
		},
		fnODataCreate: function (sURL, oData, oModel) {
			return new Promise(function (resolve, reject) {
				oModel.create(sURL, oData, {
					filters: null,
					async: true,
					success: function (oData, oResponse) {
						resolve({ data: oData, reponse: oResponse });
					},
					error: function (oError) {
						reject(oError);
					}
				});
			});
		},
		getUrlParameter: function (sParamName) {
			const sUrl = window.location.href;
			let oUrlParams = new URLSearchParams(sUrl.split("?")[1]);
			return oUrlParams?.get(sParamName);
		}
	});
});
