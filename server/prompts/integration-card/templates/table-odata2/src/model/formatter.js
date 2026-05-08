/* eslint-disable jsdoc/require-jsdoc, jsdoc/require-param, jsdoc/require-returns */
sap.ui.define(
	["sap/ui/core/format/DateFormat"],
	function (DateFormat) {
		"use strict";

		return {
			/**
			 * Formats an ISO date string for display.
			 * Example: "2024-01-15" → "15.01.2024"
			 */
			formatDate: function (sDate) {
				if (!sDate) {
					return "";
				}
				const oInstance = DateFormat.getDateInstance({ pattern: "dd.MM.yyyy" });
				return oInstance.format(new Date(sDate));
			}
		};
	}
);
