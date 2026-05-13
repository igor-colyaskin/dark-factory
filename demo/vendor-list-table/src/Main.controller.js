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

		return BaseController.extend("com.sap.partner.wz.vendor.list.table.Main", {
			formatter: formatter,

			onInit: function () {
				this.getView().setModel(new JSONModel({}));
			},

			onCardReady: function () {
				this._loadData();
			},

			onStatusPress: function (oEvent) {},

			onFilterGo: function () {
				var aAll = this.getView().getModel().getProperty("/allItems") || [];
				var aFiltered = aAll.filter(function (oItem) {
					var bMatch = true;
					var sTier = (this.byId("filterTier") || { getValue: function(){ return ""; } }).getValue();
					if (sTier) { bMatch = bMatch && String(oItem.tier || "").toLowerCase().includes(sTier.toLowerCase()); }
					var sStatus = (this.byId("filterStatus") || { getValue: function(){ return ""; } }).getValue();
					if (sStatus) { bMatch = bMatch && String(oItem.status || "").toLowerCase().includes(sStatus.toLowerCase()); }
					return bMatch;
				}.bind(this));
				this.getView().getModel().setProperty("/items", aFiltered);
			},

			onMenuPress: function (oEvent) {
				const oView = this.getView();
				const oButton = oEvent.getSource();
				if (this._pMenu) {
					this._pMenu.then(function (oMenu) { oMenu.openBy(oButton); });
					return;
				}
				this._pMenu = Fragment.load({
					id: oView.getId(),
					name: "com.sap.partner.wz.vendor.list.table.fragments.Menu",
					controller: this
				}).then(function (oMenu) {
					oView.addDependent(oMenu);
					oMenu.openBy(oButton);
					return oMenu;
				});
			},

			_loadData: function () {
				const oForm = this.byId("employeeForm");
				if (oForm) { oForm.setBusy(true); }
				const oCard = this.getOwnerComponent().getCard();
				const oErrorHandler = this.getOwnerComponent().getErrorHandler();
				DataHelper.loadData(oCard)
					.then(function (oData) {
						var aItems = oData.items || [];
						this.getView().getModel().setData({ allItems: aItems, items: aItems });
					}.bind(this))
					.catch(function (oError) {
						if (oError && typeof oError.getParameters === "function") {
							oErrorHandler.handleCustomErrorEvent(oError);
						} else {
							Log.error("vendor-list-table: data loading error", oError);
						}
					})
					.finally(function () {
						if (oForm) { oForm.setBusy(false); }
					});
			}
		});
	}
);