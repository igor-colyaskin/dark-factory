/* istanbul ignore file */
sap.ui.define(
	[
		"sap/m/Button",
		"sap/m/Dialog",
		"sap/ui/integration/designtime/editor/CardEditor",
		"../sandboxSetup",
		"../mockserver",
		"sap/ui/integration/widgets/Card",
		"sap/base/Log"
	],
	function (Button, Dialog, CardEditor, sandbox, mockserver, Card, Log) {
		initMockServer(mockserver, Card);
		var oCard = new Card({
			id: "sampleCard",
			manifest: "../../manifest.json",
			width: "80rem",
			height: "auto"
		});
		oCard.placeAt("content");
		sandbox.addContextAwarnessAndHostToCard(oCard);
		generateButtons(Button, Dialog, CardEditor);
	}
);

function initMockServer(mockserver, Card) {
	// initialize the mock server
	mockserver
		.init()
		.then(() => {
			// initialize the embedded component on the HTML page
			sap.ui.require(["sap/ui/core/ComponentSupport"]);
		})
		.catch((error) => {
			console.log("Failed to initialize mock server:", error);
		});
}

function generateButtons(Button, Dialog, CardEditor) {
	sap.ui.require(["sap-ui-integration-editor"]);
	var oButton = new Button({
		text: "Show Card Editor for Administrator",
		press: function () {
			var oDialog = new Dialog({
				title: "Edit Card Settings as Administrator",
				horizontalScrolling: false,
				beginButton: new Button({
					type: "Emphasized",
					text: "OK",
					press: function () {
						sap.m.MessageToast.show("Apply settings");
						document
							.getElementById("sampleCard")
							._getControl()
							.setManifestChanges([oEditor.getCurrentSettings()]);
						oDialog.close();
					}
				}),
				endButton: new Button({
					text: "Close",
					press: function () {
						oDialog.close();
					}
				})
			});
			var oEditor = new CardEditor({
				card: document.getElementById("sampleCard")._getControl(),
				mode: "admin",
				allowSettings: true,
				allowDynamicValues: true,
				language: "fr"
			});
			oDialog.addContent(oEditor);
			oDialog.open();
		}
	});
	oButton.placeAt("buttons");
}
