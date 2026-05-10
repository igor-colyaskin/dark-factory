/* eslint-disable jsdoc/require-jsdoc, jsdoc/require-param, jsdoc/require-returns */
sap.ui.define(
	[
		"com/sap/fiorireuselibrary/ui5cardssdk/Base.controller",
		"com/sap/fiorireuselibrary/ui5cardssdk/AuthorizationDialog.controller",
		"sap/base/Log",
		"sap/ui/core/Fragment",
		"./model/formatter"
	],
	function (BaseController, AuthorizationDialog, Log, Fragment, formatter) {
		"use strict";

		return BaseController.extend("com.sap.partner.wz.templatetable.Main", {
			formatter: formatter,

			onCardReady: function () {
				this._oErrorHandler = this.getOwnerComponent().getErrorHandler();

				this.getView()
					.getModel()
					.metadataLoaded()
					.then(() => this._bindView())
					.catch((oError) => {
						Log.error("templatetable: metadataLoaded failed", oError);
						if (oError && typeof oError.getParameters === "function") {
							this._oErrorHandler.handleCustomErrorEvent(oError);
						}
					});
			},

			// ─────────────────────────────────────────────────────────────────
			// EXTENSION POINT
			// Replace "TemplateEntitySet" with the real OData entity set name.
			// Add filters here if the table requires server-side filtering.
			// ─────────────────────────────────────────────────────────────────
			_bindView: function () {
				this.byId("mainTable").bindItems({
					path: "/TemplateEntitySet",
					template: this.byId("mainTableTemplate"),
					templateShareable: false
				});
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
					name: "com.sap.partner.wz.templatetable.fragments.Menu",
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
						name: "com.sap.partner.wz.templatetable.fragments.WhatIsCardAbout",
						controller: this
					}).then(function (oDialog) {
						this.getView().addDependent(oDialog);
						return oDialog;
					}.bind(this)).catch(function (oError) {
						Log.error("templatetable: failed to load WhatIsCardAbout dialog", oError);
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
			}
		});
	}
);
