/* eslint-disable jsdoc/require-jsdoc, jsdoc/require-param, jsdoc/require-returns */
sap.ui.define(
	[
		"com/sap/fiorireuselibrary/ui5cardssdk/Base.controller",
		"com/sap/fiorireuselibrary/ui5cardssdk/AuthorizationDialog.controller",
		"sap/base/Log",
		"sap/ui/core/Fragment",
		"sap/ui/model/json/JSONModel",
		"./helpers/DataHelper",
		"./model/formatter"
	],
	function (BaseController, AuthorizationDialog, Log, Fragment, JSONModel, DataHelper, formatter) {
		"use strict";

		return BaseController.extend("com.sap.partner.wz.templatesf.Main", {
			formatter: formatter,

			onInit: function () {
				this.getView().setModel(new JSONModel({}));
			},

			onCardReady: function () {
				this._loadData();
			},

			onStatusPress: function (oEvent) {
				// TODO: implement status action (e.g. open popover or navigate)
			},

			onMenuPress: function (oEvent) {
				const oView = this.getView();
				const oButton = oEvent.getSource();

				if (this._pMenu) {
					this._pMenu.then(function (oMenu) {
						oMenu.openBy(oButton);
					});
					return;
				}

				this._pMenu = Fragment.load({
					id: oView.getId(),
					name: "com.sap.partner.wz.templatesf.fragments.Menu",
					controller: this
				}).then(function (oMenu) {
					oView.addDependent(oMenu);
					oMenu.openBy(oButton);
					return oMenu;
				});
			},

			onWhatIsCardAboutPress: function () {
				if (!this._pAboutDialog) {
					this._pAboutDialog = Fragment.load({
						id: this.getView().getId(),
						name: "com.sap.partner.wz.templatesf.fragments.WhatIsCardAbout",
						controller: this
					}).then(function (oDialog) {
						this.getView().addDependent(oDialog);
						return oDialog;
					}.bind(this)).catch(function (oError) {
						Log.error("templateSF: failed to load WhatIsCardAbout dialog", oError);
						this._pAboutDialog = null;
					}.bind(this));
				}
				this._pAboutDialog.then(function (oDialog) {
					oDialog.open();
				});
			},

			onCloseWhatIsCardAboutDialog: function () {
				if (this._pAboutDialog) {
					this._pAboutDialog.then(function (oDialog) {
						oDialog.close();
					});
				}
			},

			onRequiredAuthorizationPress: function () {
				const oAuthDialog = new AuthorizationDialog(this.getOwnerComponent());
				oAuthDialog.openDialog();
			},

			_loadData: function () {
				const oForm = this.byId("employeeForm");
				if (oForm) {
					oForm.setBusy(true);
				}

				const oCard = this.getOwnerComponent().getCard();
				const oErrorHandler = this.getOwnerComponent().getErrorHandler();

				DataHelper.loadData(oCard)
					.then(
						function (oData) {
							Log.debug("templateSF: data loaded", JSON.stringify(oData));
							this.getView().getModel().setData(oData);
						}.bind(this)
					)
					.catch(function (oError) {
						if (oError && typeof oError.getParameters === "function") {
							oErrorHandler.handleCustomErrorEvent(oError);
						} else {
							Log.error("templateSF: data loading error", oError);
						}
					})
					.finally(function () {
						if (oForm) {
							oForm.setBusy(false);
						}
					});
			}
		});
	}
);
