sap.ui.define(
	["sap/ui/core/format/DateFormat"],
	function (DateFormat) {
		"use strict";

		return {
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