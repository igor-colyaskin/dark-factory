sap.ui.define(
	["sap/ui/core/UIComponent", "com/sap/fiorireuselibrary/ui5cardssdk/ErrorHandler", "sap/base/Log"],
	function (UIComponent, ErrorHandler, Log) {
		"use strict";

		return UIComponent.extend("com.sap.partner.wz.employee.directory.Component", {
			init: function () {
				UIComponent.prototype.init.apply(this, arguments);
				this._oErrorHandler = new ErrorHandler(this);
			},

			onCardReady: function (oCard) {
				if (!oCard) {
					return;
				}

				this.oCard = oCard;
				this._oErrorHandler.checkMaintenanceMode();

				this.getRootControl()
					.loaded()
					.then((oView) => {
						oView.getController().onCardReady(oCard);
					})
					.catch((oError) => {
						if (oError && typeof oError.getParameters === "function") {
							this._oErrorHandler.handleCustomErrorEvent(oError);
						} else {
							Log.error("employee-directory: card initialization error", oError);
						}
					});
			},

			getCard: function () {
				return this.oCard;
			},

			getErrorHandler: function () {
				return this._oErrorHandler;
			}
		});
	}
);