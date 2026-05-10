/* istanbul ignore file */
sap.ui.define(
	[
		"com/sap/partner/wz/templatesf/Component",
		"com/sap/fiorireuselibrary/ui5cardssdk/ErrorHandler",
		"sap/ui/thirdparty/sinon",
		"sap/ui/thirdparty/sinon-qunit"
	],
	function (Component, ErrorHandler) {
		"use strict";

		QUnit.module("Component - Unit Tests", {
			beforeEach: function () {
				this.oSandbox = sinon.sandbox.create();
				this.oComponent = new Component();
			},
			afterEach: function () {
				this.oComponent.destroy();
				this.oSandbox.restore();
			}
		});

		QUnit.test("Should initialize the ErrorHandler during init", function (assert) {
			const oErrorHandler = this.oComponent.getErrorHandler();

			assert.ok(oErrorHandler, "ErrorHandler instance was created");
			assert.ok(oErrorHandler instanceof ErrorHandler, "ErrorHandler is of correct type");
		});

		QUnit.test("onCardReady: should store card and trigger maintenance check", function (assert) {
			// --- Arrange ---

			// Мокаем getRootControl() чтобы не крашился async chain
			var oControllerMock = {
				onCardReady: this.oSandbox.stub()
			};
			var oViewMock = {
				loaded: this.oSandbox.stub().returns(
					Promise.resolve({
						getController: function () {
							return oControllerMock;
						}
					})
				)
			};
			this.oSandbox.stub(this.oComponent, "getRootControl").returns(oViewMock);

			// Мокаем checkMaintenanceMode на реальном экземпляре ErrorHandler
			var oErrorHandler = this.oComponent.getErrorHandler();
			var oMaintenanceStub = this.oSandbox.stub(oErrorHandler, "checkMaintenanceMode");

			var oCardMock = {
				getCombinedParameters: this.oSandbox.stub(),
				getManifestEntry: this.oSandbox.stub()
			};

			// --- Act ---
			this.oComponent.onCardReady(oCardMock);

			// --- Assert: только то, что компонент делает синхронно ---
			assert.strictEqual(this.oComponent.getCard(), oCardMock, "Card instance was correctly stored");
			assert.ok(oMaintenanceStub.calledOnce, "Maintenance mode check was triggered");
		});

		QUnit.test("Should exit onCardReady if no card is provided", function (assert) {
			// Act
			this.oComponent.onCardReady(null);

			// Assert
			assert.strictEqual(this.oComponent.getCard(), undefined, "Early return worked: card is undefined");
		});
	}
);
