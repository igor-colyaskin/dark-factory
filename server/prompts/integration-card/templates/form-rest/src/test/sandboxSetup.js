/* istanbul ignore file */
// SOURCE: https://github.com/SAP-samples/build-workzone-integration/blob/main/advanced/context-awareness/README.md
// This module provides context-aware integration capabilities for SAP Work Zone

sap.ui.define([], function () {
	const WZContext = {};
	const DynamicContext = {};
	const WZHostId = "wz-host";
	let DefaultCardHost;
	const aCards = [];

	return {
		createDefaultHostCard: function () {
			DefaultCardHost = new window.sap.ui.integration.Host(WZHostId, {
				resolveDestination: function (sDestinationName, oCard) {
					switch (sDestinationName) {
						case "PRM":
							return "";
						case "EXCEPTION_MANAGEMENT":
							return "";
						case "LEVELING":
							return "";
						case "NOTIFICATION_SERVICE":
							return "";
						case "TEMPLATE":
							return "";
						default:
							console.error("Unknown destination.");
							break;
					}
				}
			});

			DefaultCardHost.getContextValue = function (contextName) {
				return this.getObjectValue(WZContext, DynamicContext, contextName);
			}.bind(this);
		},

		addCardToRefreshOnContextChange(oCard) {
			aCards.push(oCard);
		},
		refreshAllCards: function () {
			aCards.forEach((oCard) => {
				oCard.refresh();
			});
		},
		// TODO - add InnerHTML to the project
		refreshFilterBar: function () {
			const context = JSON.stringify(DynamicContext, null, 2);

			document.getElementById("filter-bar").innerText = `context: ${context}`;
		},

		getObjectValue: async function (context, dynamicContext, path) {
			const parts = path.split("/");
			let node = context[parts[0]] ? context : dynamicContext;
			let index = 0;

			while (node && parts[index]) {
				node = node[parts[index]];
				index++;
			}
			node = node || "";
			return await node;
		},

		// add event handler
		_addEventListenerOnUpdateContext: function () {
			return (e) => {
				const type = e.getParameter("type");
				const { namespace, context, type: actionType } = e.getParameter("parameters");

				if (type !== "updateContext" && !(type === "Custom" && actionType === "updateContext")) {
					return;
				}

				DynamicContext[namespace] = DynamicContext[namespace] || {};
				Object.assign(DynamicContext[namespace], context);
				this.refreshAllCards();
			};
		},

		addContextAwarnessAndHostToCard: function (oCard) {
			this.addContextAwareness(oCard);
			this.assignHostToCard(oCard);
		},

		// main method
		addContextAwareness: function (oCard) {
			oCard.attachEvent("action", this._addEventListenerOnUpdateContext());
			this.addCardToRefreshOnContextChange(oCard);
		},

		assignHostToCard: function (oCard) {
			if (!DefaultCardHost) {
				this.createDefaultHostCard();
			}
			// Array.from(document.getElementsByTagName('ui-integration-card')).forEach((item) => {
			//   item.setAttribute('host', WZHostId);
			// });
			// add the CustomData template to the item template
			oCard.data("host", WZHostId, true);
			oCard.setHost(DefaultCardHost);
		}
	};
});
