sap.ui.define(["sap/base/Log", "com/sap/fiorireuselibrary/ui5cardssdk/CustomError"], function (Log, CustomError) {
	"use strict";

	return {
		loadData: function (oCard) {
			return oCard
				.request({
					url: "{{destinations.VENDOR_API}}/api/vendors",
					method: "GET",
					parameters: {}
				})
				.then(
					function (oResponse) {
						const oEntity = oResponse.aRawData || oResponse;
						return this._processData(oEntity);
					}.bind(this)
				)
				.catch(function (oError) {
					Log.error("DataHelper: request failed", oError);
					if (oError && typeof oError.getParameters === "function") {
						throw oError;
					}
					const sMsg = oError.message || (typeof oError === "string" ? oError : "Network Error");
					throw new CustomError.GenericError("Data Loading Error", sMsg);
				});
		},

		_processData: function (oRawData) {
			const aRaw = Array.isArray(oRawData) ? oRawData : (oRawData.value || oRawData.results || []);
			return {
				items: aRaw.map(function (oItem) {
					return {
						vendorId: oItem.vendorId || "",
						name: oItem.name || "",
						tier: oItem.Tier || "",
						status: oItem.Status || "",
						country: oItem.Country || "",
						contactName: oItem.ContactName || "",
						contactEmail: oItem.ContactEmail || "",
						certificationLevel: oItem.CertificationLevel || "",
						lastAuditDate: oItem.LastAuditDate || ""
					};
				})
			};
		}
	};
});
