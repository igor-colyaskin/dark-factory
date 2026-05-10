/* istanbul ignore file */
// SOURCE: https://github.com/SAP-samples/build-workzone-integration/blob/main/advanced/context-awareness/README.md

sap.ui.define([], function () {
	const WZContext = {};
	const DynamicContext = {};
	const WZHostId = "wz-host";
	let DefaultCardHost;
	const aCards = [];

	return {
		createDefaultHostCard: function () {
			DefaultCardHost = new window.sap.ui.integration.Host(WZHostId, {
				resolveDestination: function (sDestinationName) {
					switch (sDestinationName) {
						case "TEMPLATE":
							return "";
						default:
							console.error("Unknown destination:", sDestinationName);
							break;
					}
				}
			});

			DefaultCardHost.getContextValue = function (contextName) {
				return this.getObjectValue(WZContext, DynamicContext, contextName);
			}.bind(this);
		},

		addCardToRefreshOnContextChange: function (oCard) {
			aCards.push(oCard);
		},

		refreshAllCards: function () {
			aCards.forEach((oCard) => oCard.refresh());
		},

		getObjectValue: async function (context, dynamicContext, path) {
			const parts = path.split("/");
			let node = context[parts[0]] ? context : dynamicContext;
			let index = 0;
			while (node && parts[index]) {
				node = node[parts[index]];
				index++;
			}
			return await (node || "");
		},

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

		addContextAwareness: function (oCard) {
			oCard.attachEvent("action", this._addEventListenerOnUpdateContext());
			this.addCardToRefreshOnContextChange(oCard);
		},

		assignHostToCard: function (oCard) {
			if (!DefaultCardHost) {
				this.createDefaultHostCard();
			}
			oCard.data("host", WZHostId, true);
			oCard.setHost(DefaultCardHost);
		}
	};
});
