/* istanbul ignore file */
sap.ui.define([], function () {
	"use strict";
	var WZHostId = "wz-host";
	var DefaultCardHost;
	return {
		createDefaultHostCard: function () {
			DefaultCardHost = new window.sap.ui.integration.Host(WZHostId, {
				resolveDestination: function () {
					return "";
				}
			});
		},
		addContextAwarnessAndHostToCard: function (oCard) {
			if (!DefaultCardHost) {
				this.createDefaultHostCard();
			}
			oCard.setHost(DefaultCardHost);
		}
	};
});