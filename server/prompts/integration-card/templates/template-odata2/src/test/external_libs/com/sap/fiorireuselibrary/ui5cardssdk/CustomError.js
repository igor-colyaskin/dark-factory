/* istanbul ignore file */
sap.ui.define(["sap/ui/base/Object"], function (BaseObject) {
	"use strict";

	var GenericError = BaseObject.extend("com.sap.fiorireuselibrary.ui5cardssdk.CustomError.GenericError", {
		constructor: function (sTitle, sMessage) {
			BaseObject.call(this);
			this._sTitle = sTitle;
			this._sMessage = sMessage;
		},

		getParameters: function () {
			return {
				title: this._sTitle,
				message: this._sMessage
			};
		}
	});

	return {
		GenericError: GenericError
	};
});
