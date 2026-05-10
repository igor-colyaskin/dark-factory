/* istanbul ignore file */
sap.ui.define(["sap/ui/util/Storage"], function (Storage) {
	"use strict";

	return {
		createStorage: function (sStorageKeyPrefix) {
			this.oStorage = new Storage(Storage.Type.local, sStorageKeyPrefix);
		},
		setItem: function (key, value) {
			return this.oStorage.put(key, value);
		},
		readItem: function (key) {
			return this.oStorage.get(key);
		},
		removeItem: function (key) {
			return this.oStorage.remove(key);
		}
	};
});
