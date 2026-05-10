/* istanbul ignore file */
sap.ui.define(["sap/ui/test/Opa5"], function (Opa5) {
	"use strict";

	return Opa5.extend("integration.arrangements.Startup", {
		/**
		 * Starts the app in an iFrame using the manual test page.
		 *
		 * Why iFrame + manual/index.html:
		 *   This is an Integration Card (type: Component). The UIComponent
		 *   requires a sap.ui.integration.widgets.Card host to call
		 *   onCardReady(). Without the host, _loadData() never runs and
		 *   the table stays empty.
		 *   manual/index.html bootstraps the full stack:
		 *     MockServer → Card widget → Component → onCardReady → data
		 *
		 * Path is relative to opaTests.qunit.html location.
		 */
		iStartMyApp: function () {
			return this.iStartMyAppInAFrame("../manual/index.html");
		},

		iTeardownMyApp: function () {
			return this.iTeardownMyAppInAFrame();
		}
	});
});
