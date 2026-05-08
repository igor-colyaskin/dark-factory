sap.ui.define(["sap/base/Log", "com/sap/fiorireuselibrary/ui5cardssdk/CustomError"], function (Log, CustomError) {
	"use strict";

	return {
		/**
		 * Loads data from the backend and processes it into the view model.
		 * The network layer — do not modify for specific implementations.
		 *
		 * @param {object} oCard - Integration Card instance
		 * @returns {Promise<object>} View model data
		 */
		loadData: function (oCard) {
			return oCard
				.request({
					url: "{{destinations.mydestination}}/api/entity",
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

		// ─────────────────────────────────────────────────────────────────
		// EXTENSION POINT
		// When creating a new card from this template, modify only this
		// function. Map the raw BE response fields to the view model and
		// add any computed / derived fields needed by the view.
		//
		// @param  {object} oRawData - raw response from the backend
		// @returns {object}          - flat object consumed by View bindings
		// ─────────────────────────────────────────────────────────────────
		_processData: function (oRawData) {
			// ── Field mapping: BE field → view model field ──────────────
			const oMapped = {
				firstName:  oRawData.FirstName  || "",
				lastName:   oRawData.LastName   || "",
				employeeId: oRawData.EmployeeID || "",
				position:   oRawData.Position   || "",
				department: oRawData.Department || "",
				role:       oRawData.Role       || "",
				hrContact:  oRawData.HRContact  || "",
				area:       oRawData.Area       || "",
				email:      oRawData.Email      || "",
				status:     oRawData.Status     || "",
				expDate:    oRawData.ExpDate     || ""
			};

			// ── Computed fields ──────────────────────────────────────────
			oMapped.fullName = [oMapped.firstName, oMapped.lastName]
				.filter(Boolean)
				.join(" ");

			return oMapped;
		}
	};
});
