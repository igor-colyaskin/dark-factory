/* istanbul ignore file */
sap.ui.define(["sap/ui/core/util/MockServer"], function (MockServer) {
	"use strict";

	const sDataPath = "com/sap/partner/wz/templatetable/test/data/";

	var oMockServer;

	return {
		init: function () {
			return new Promise(function (resolve, reject) {
				try {
					// EXTENSION POINT: rootUri must match dataSources.mainService.uri in manifest.json
					// (the path segment after the destination, without the destination placeholder)
					oMockServer = new MockServer({
						rootUri: "/sap/opu/odata/sap/TEMPLATETABLE_SRV/"
					});

					var sMetadataUrl = sap.ui.require.toUrl(sDataPath + "metadata.xml");
					var sJsonFilesUrl = sap.ui.require.toUrl(sDataPath);

					// MockServer reads metadata.xml and auto-serves all entity sets.
					// Entity set mock data is loaded from {EntitySetName}.json in the data folder.
					oMockServer.simulate(sMetadataUrl, {
						sMockdataBaseUrl: sJsonFilesUrl,
						bGenerateMissingMockData: true
					});

					MockServer.config({
						autoRespond: true,
						autoRespondAfter: 100
					});

					oMockServer.start();
					resolve();
				} catch (error) {
					reject(error);
				}
			});
		},

		getMockServer: function () {
			return oMockServer;
		}
	};
});
