/* istanbul ignore file */
sap.ui.define(
	["sap/ui/core/util/MockServer", "./utils/MockDataGenerator", "./utils/DataEngine"],
	function (MockServer, MockDataGenerator, DataEngine) {
		"use strict";

		return {
			init: function () {
				return new Promise(function (resolve) {
					var oMockServer = new MockServer({ rootUri: "/api/" });

					oMockServer.setRequests([
						{
							method: "GET",
							path: new RegExp("entity(.*)"),
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
