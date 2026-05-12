/* istanbul ignore file */
sap.ui.define([], function () {
	"use strict";

	// Test double for com/sap/fiorireuselibrary/ui5cardssdk/CustomError.
	// ES6 class hierarchy mirrors real SDK so instanceof guards work correctly.

	class CustomError extends Error {
		constructor(name, title, message, illustratedMessageType) {
			super(message);
			this.title = title;
			this.name = name;
			this.illustratedMessageType = illustratedMessageType;
		}
		getParameters() {
			return {
				message: this.message,
				name: this.name,
				title: this.title,
				illustratedMessageType: this.illustratedMessageType
			};
		}
	}

	class NotFoundPartnerIDError extends CustomError {
		constructor(title, message) {
			super("NotFoundPartnerIDError", title || "Need to set Partner filter first", message, "");
		}
	}

	class UnauthorizedError extends CustomError {
		constructor(title, message) {
			super("UnauthorizedError", title || "Not authorized", message, "");
		}
	}

	class GenericError extends CustomError {
		constructor(title, message) {
			super("GenericError", title || "Unexpected behaviour", message, "");
		}
	}

	return { NotFoundPartnerIDError, UnauthorizedError, GenericError };
});
