/* istanbul ignore file */
sap.ui.define(
	[
		"../sandboxSetup",
		"../mockserver",
		"sap/ui/integration/widgets/Card"
	],
	function (sandbox, mockserver, Card) {
		"use strict";
		mockserver.init()
			.then(function () {
				var oCard = new Card({
					manifest: "../../manifest.json",
					width: "80rem",
					height: "auto"
				});
				var bHidden = false;
				oCard.addEventDelegate({
					onAfterRendering: function () {
						if (!bHidden) {
							bHidden = true;
							var oSpinner = document.getElementById("df-loading");
							if (oSpinner) { oSpinner.style.display = "none"; }
						}
					}
				});
				oCard.placeAt("content");
				sandbox.addContextAwarnessAndHostToCard(oCard);
			})
			.catch(function (error) {
				console.error("Failed to initialize mock server:", error);
			});
	}
);