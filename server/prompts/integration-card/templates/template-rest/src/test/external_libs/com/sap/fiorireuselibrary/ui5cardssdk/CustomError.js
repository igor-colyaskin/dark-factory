/* istanbul ignore file */
sap.ui.define(["sap/ui/base/Object"], function (BaseObject) {
	"use strict";

	/**
	 * Stub for com.sap.fiorireuselibrary.ui5cardssdk.CustomError
	 *
	 * DataHelper.js использует: throw new CustomError.GenericError(title, msg)
	 * Controller проверяет:     typeof oError.getParameters === "function"
	 * Оба требования удовлетворены этим стабом.
	 */
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
