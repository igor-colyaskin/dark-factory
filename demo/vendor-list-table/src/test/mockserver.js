sap.ui.define(
	["sap/ui/core/util/MockServer", "./utils/MockDataGenerator"],
	function (MockServer, MockDataGenerator) {
		"use strict";

		return {
			init: function () {
				return new Promise(function (resolve) {
					var oMockServer = new MockServer({ rootUri: "/api/" });

					oMockServer.setRequests([
						{
							method: "GET",
							path: new RegExp(".*"),
							response: function (oXhr) {
								var aRawData = MockDataGenerator.getData();
								oXhr.respondJSON(200, {}, JSON.stringify({ aRawData }));
								return true;
							}
						}
					]);

					oMockServer.start();
					resolve();
				});
			}
		};
	}
);