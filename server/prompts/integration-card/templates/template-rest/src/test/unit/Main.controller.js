/* global QUnit */
/* istanbul ignore file */
sap.ui.define(
	[
		"com/sap/partner/wz/templatesf/Main.controller",
		"com/sap/partner/wz/templatesf/helpers/DataHelper",
		"sap/ui/core/Fragment",
		"sap/ui/model/json/JSONModel",
		"sap/ui/thirdparty/sinon",
		"sap/ui/thirdparty/sinon-qunit"
	],
	function (MainController, DataHelper, Fragment, JSONModel, sinon) {
		"use strict";

		QUnit.module(
			"Main Controller",
			{
				beforeEach: function () {
					this.oSandbox = sinon.sandbox.create();

					this.oController = new MainController();

					this.oModel = new JSONModel({});

					this.oFormStub = {
						setBusy: this.oSandbox.stub()
					};

					this.oViewStub = {
						setModel: this.oSandbox.stub(),
						getModel: this.oSandbox.stub().returns(this.oModel),
						byId: this.oSandbox.stub().withArgs("employeeForm").returns(this.oFormStub)
					};

					this.oCardStub = {};

					this.oErrorHandlerStub = {
						handleCustomErrorEvent: this.oSandbox.stub()
					};

					this.oComponentStub = {
						getCard: this.oSandbox.stub().returns(this.oCardStub),
						getErrorHandler: this.oSandbox.stub().returns(this.oErrorHandlerStub)
					};

					this.oSandbox.stub(this.oController, "getView").returns(this.oViewStub);
					this.oSandbox.stub(this.oController, "getOwnerComponent").returns(this.oComponentStub);
					this.oSandbox.stub(this.oController, "byId").withArgs("employeeForm").returns(this.oFormStub);
				},

				afterEach: function () {
					this.oController.destroy();
					this.oSandbox.restore();
				}
			},
			function () {

				// ─────────────────────────────────────────────────────
				// _loadData: success path
				// ─────────────────────────────────────────────────────
				QUnit.module("Sub-Module: _loadData — success", function () {
					QUnit.test("sets view model data on success", function (assert) {
						var done = assert.async();
						var oData = { firstName: "Anna", lastName: "Müller" };

						this.oSandbox.stub(DataHelper, "loadData").returns(Promise.resolve(oData));
						this.oSandbox.stub(this.oModel, "setData");

						this.oController._loadData();

						setTimeout(function () {
							assert.ok(
								this.oModel.setData.calledOnceWith(oData),
								"setData called with resolved data"
							);
							done();
						}.bind(this), 0);
					});

					QUnit.test("form is set busy before request and unset after", function (assert) {
						var done = assert.async();
						this.oSandbox.stub(DataHelper, "loadData").returns(Promise.resolve({}));

						this.oController._loadData();

						assert.ok(this.oFormStub.setBusy.calledWith(true), "setBusy(true) called immediately");

						setTimeout(function () {
							assert.ok(this.oFormStub.setBusy.calledWith(false), "setBusy(false) called after promise");
							done();
						}.bind(this), 0);
					});
				});

				// ─────────────────────────────────────────────────────
				// _loadData: error path
				// ─────────────────────────────────────────────────────
				QUnit.module("Sub-Module: _loadData — error handling", function () {
					QUnit.test("CustomError (has getParameters) → delegates to ErrorHandler", function (assert) {
						var done = assert.async();
						var oCustomError = {
							getParameters: function () { return {}; }
						};

						this.oSandbox.stub(DataHelper, "loadData").returns(Promise.reject(oCustomError));

						this.oController._loadData();

						setTimeout(function () {
							assert.ok(
								this.oErrorHandlerStub.handleCustomErrorEvent.calledOnceWith(oCustomError),
								"handleCustomErrorEvent called with the custom error"
							);
							done();
						}.bind(this), 0);
					});

					QUnit.test("generic Error → does NOT call ErrorHandler", function (assert) {
						var done = assert.async();
						var oGenericError = new Error("Network failure");

						this.oSandbox.stub(DataHelper, "loadData").returns(Promise.reject(oGenericError));

						this.oController._loadData();

						setTimeout(function () {
							assert.ok(
								this.oErrorHandlerStub.handleCustomErrorEvent.notCalled,
								"handleCustomErrorEvent not called for generic error"
							);
							done();
						}.bind(this), 0);
					});

					QUnit.test("form is unset busy even when request fails", function (assert) {
						var done = assert.async();
						this.oSandbox.stub(DataHelper, "loadData").returns(Promise.reject(new Error("fail")));

						this.oController._loadData();

						setTimeout(function () {
							assert.ok(this.oFormStub.setBusy.calledWith(false), "setBusy(false) called after rejection");
							done();
						}.bind(this), 0);
					});
				});

				// ─────────────────────────────────────────────────────
				// onWhatIsCardAboutPress / onCloseWhatIsCardAboutDialog
				// ─────────────────────────────────────────────────────
				QUnit.module("Sub-Module: About dialog", function () {
					QUnit.test("onWhatIsCardAboutPress loads fragment and opens dialog", function (assert) {
						var done = assert.async();
						var oDialogStub = { open: this.oSandbox.stub() };

						this.oViewStub.addDependent = this.oSandbox.stub();
						this.oViewStub.getId = this.oSandbox.stub().returns("viewId");

						this.oSandbox.stub(Fragment, "load").returns(Promise.resolve(oDialogStub));

						this.oController.onWhatIsCardAboutPress();

						setTimeout(function () {
							assert.ok(Fragment.load.calledOnce, "Fragment.load called once");
							assert.ok(this.oViewStub.addDependent.calledWith(oDialogStub), "dialog added as dependent");
							assert.ok(oDialogStub.open.calledOnce, "dialog.open() called");
							done();
						}.bind(this), 0);
					});

					QUnit.test("second call to onWhatIsCardAboutPress reuses fragment (no second load)", function (assert) {
						var done = assert.async();
						var oDialogStub = { open: this.oSandbox.stub() };

						this.oViewStub.addDependent = this.oSandbox.stub();
						this.oViewStub.getId = this.oSandbox.stub().returns("viewId");

						this.oSandbox.stub(Fragment, "load").returns(Promise.resolve(oDialogStub));

						this.oController.onWhatIsCardAboutPress();

						setTimeout(function () {
							this.oController.onWhatIsCardAboutPress();
							setTimeout(function () {
								assert.ok(Fragment.load.calledOnce, "Fragment.load called only once for two presses");
								assert.ok(oDialogStub.open.calledTwice, "dialog.open() called twice");
								done();
							}.bind(this), 0);
						}.bind(this), 0);
					});

					QUnit.test("onCloseWhatIsCardAboutDialog closes the dialog", function (assert) {
						var done = assert.async();
						var oDialogStub = { open: this.oSandbox.stub(), close: this.oSandbox.stub() };

						this.oViewStub.addDependent = this.oSandbox.stub();
						this.oViewStub.getId = this.oSandbox.stub().returns("viewId");

						this.oSandbox.stub(Fragment, "load").returns(Promise.resolve(oDialogStub));

						this.oController.onWhatIsCardAboutPress();

						setTimeout(function () {
							this.oController.onCloseWhatIsCardAboutDialog();
							setTimeout(function () {
								assert.ok(oDialogStub.close.calledOnce, "dialog.close() called");
								done();
							}.bind(this), 0);
						}.bind(this), 0);
					});
				});
			}
		);
	}
);
