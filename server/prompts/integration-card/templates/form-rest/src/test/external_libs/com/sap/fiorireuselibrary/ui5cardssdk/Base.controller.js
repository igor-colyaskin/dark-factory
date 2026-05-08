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
			// return this.getCard().resolveDestination("myDestination").then(() => {
			return new Promise((resolve, reject) => {
				oModel.read(sPath, {
					filters: aFilters || [],
					urlParameters: oUrlParams || {},
					/**
					 * Success callback for the OData read operation.
					 * @param {object} oData - The data returned from the successful OData read operation.
					 */
					success: (oData) => {
						resolve(oData);
					},
					/**
					 * Error callback for the OData read operation.
					 * @param {object} oError - The error object returned from the failed OData read operation.
					 */
					error: (oError) => {
						reject(oError);
					}
				});
			});
			// });
		},
		fnODataCreate: function (sURL, oData, oModel) {
			return new Promise(function (resolve, reject) {
				const oParameters = {
					filters: null,
					async: true,
					/**
					 * Success callback for the OData create operation.
					 * @param {object} oData - The data returned from the successful OData create operation.
					 * @param {object} oResponse - The full response object from the OData create operation.
					 */
					success: function (oData, oResponse) {
						resolve({
							data: oData,
							reponse: oResponse
						});
					},
					/**
					 * Error callback for the OData create operation.
					 * @param {object} oError - The error object returned from the failed OData create operation.
					 */
					error: function (oError) {
						reject(oError);
					}
				};
				oModel.create(sURL, oData, oParameters);
			});
		},
		getUrlParameter: function (sParamName) {
			const sUrl = window.location.href;
			let oUrlParams = new URLSearchParams(sUrl.split("?")[1]);
			return oUrlParams?.get(sParamName);
		}
	});
});
