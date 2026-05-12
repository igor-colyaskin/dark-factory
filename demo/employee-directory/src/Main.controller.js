sap.ui.define(
	[
		"com/sap/fiorireuselibrary/ui5cardssdk/Base.controller",
		"sap/base/Log",
		"sap/ui/model/json/JSONModel",
		"./helpers/DataHelper",
		"./helpers/PaginationManager",
		"./model/formatter"
	],
	function (BaseController, Log, JSONModel, DataHelper, PaginationManager, formatter) {
		"use strict";

		return BaseController.extend("com.sap.partner.wz.employee.directory.Main", {
			formatter: formatter,

			onInit: function () {
				this._oAllItems = [];
				this._oTableModel = new JSONModel({ items: [] });
				this._oConfigModel = new JSONModel({
					currentPage: 0,
					totalPages: 1,
					itemsPerPage: 10
				});
				this._oFilterModel = new JSONModel({ searchQuery: "" });

				this.getView().setModel(this._oTableModel, "tableModel");
				this.getView().setModel(this._oConfigModel, "configModel");
				this.getView().setModel(this._oFilterModel, "filterModel");
			},

			onCardReady: function () {
				this._loadData();
			},

			_loadData: function () {
				var oTable = this.byId("mainTable");
				var oCard = this.getOwnerComponent().getCard();
				var oErrorHandler = this.getOwnerComponent().getErrorHandler();

				oTable.setBusy(true);
				DataHelper.loadData(oCard)
					.then(function (oData) {
						this._oAllItems = oData.items || [];
						this._applyFilterAndPaginate();
					}.bind(this))
					.catch(function (oError) {
						if (oError && typeof oError.getParameters === "function") {
							oErrorHandler.handleCustomErrorEvent(oError);
						} else {
							Log.error("employee-directory: data load error", oError);
						}
					})
					.finally(function () {
						oTable.setBusy(false);
					}.bind(this));
			},

			_applyFilterAndPaginate: function () {
				var sQuery = this._oFilterModel.getProperty("/searchQuery").toLowerCase();
				var aFiltered = sQuery
					? this._oAllItems.filter(function (oItem) {
						return Object.values(oItem).some(function (sVal) {
							return String(sVal).toLowerCase().indexOf(sQuery) !== -1;
						});
					})
					: this._oAllItems.slice();

				PaginationManager.updatePagination(this._oConfigModel, aFiltered.length);

				var iPage = this._oConfigModel.getProperty("/currentPage");
				var iSize = this._oConfigModel.getProperty("/itemsPerPage");
				this._oTableModel.setProperty("/items", aFiltered.slice(iPage * iSize, (iPage + 1) * iSize));
			},

			onSearch: function (oEvent) {
				var sQuery = oEvent.getParameter("newValue") !== undefined
					? oEvent.getParameter("newValue")
					: (oEvent.getParameter("query") || "");
				this._oFilterModel.setProperty("/searchQuery", sQuery);
				this._oConfigModel.setProperty("/currentPage", 0);
				this._applyFilterAndPaginate();
			},

			onNextPage: function () {
				this._oConfigModel.setProperty("/currentPage", PaginationManager.getNextPage(this._oConfigModel));
				this._applyFilterAndPaginate();
			},

			onPrevPage: function () {
				this._oConfigModel.setProperty("/currentPage", PaginationManager.getPrevPage(this._oConfigModel));
				this._applyFilterAndPaginate();
			},

			onPageQuantityChanged: function (oEvent) {
				var iSize = parseInt(oEvent.getParameter("selectedItem").getKey(), 10);
				this._oConfigModel.setProperty("/itemsPerPage", iSize);
				this._oConfigModel.setProperty("/currentPage", 0);
				this._applyFilterAndPaginate();
			}
		});
	}
);
