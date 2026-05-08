/* istanbul ignore file */
sap.ui.define(
	["sap/ui/test/Opa5", "./arrangements/Startup", "./pages/Card", "./NavigationJourney"],
	function (Opa5, Startup) {
		"use strict";

		Opa5.extendConfig({
			arrangements: new Startup(),
			autoWait: true,
			timeout: 40, // seconds — card init + mock data load
			pollingInterval: 400 // ms
		});
	}
);
