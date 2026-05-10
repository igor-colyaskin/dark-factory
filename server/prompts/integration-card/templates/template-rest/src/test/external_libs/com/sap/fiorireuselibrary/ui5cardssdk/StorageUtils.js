/* istanbul ignore file */
sap.ui.define(["sap/ui/util/Storage"], function (Storage) {
	"use strict";

	return {
		/**
		 * Creates a storage instance with the specified key prefix.
		 * @param {string} sStorageKeyPrefix - The prefix for storage keys.
		 */
		createStorage: function (sStorageKeyPrefix) {
			this.oStorage = new Storage(Storage.Type.local, sStorageKeyPrefix); //(Storage.Type.session, sStorageKeyPrefix);
		},
		/**
		 * Sets an item in the storage with the specified key and value.
		 * @param {string} key - The key under which the value should be stored.
		 * @param {*} value - The value to be stored.
		 * @returns {*} The result of the put operation,  the value that was stored.
		 */
		setItem: function (key, value) {
			return this.oStorage.put(key, value);
		},

		/**
		 * Reads an item from the storage with the specified key.
		 * @param {string} key - The key of the item to be retrieved.
		 * @returns {*} The value associated with the key, or null if not found.
		 */
		readItem: function (key) {
			return this.oStorage.get(key);
		},
		/**
		 * Removes an item from the storage with the specified key.
		 * @param {string} key - The key of the item to be removed.
		 * @returns {boolean} Whether the deletion succeeded; if the key didn't exists, the method also reports a success
		 */
		removeItem: function (key) {
			return this.oStorage.remove(key);
		}
	};
});
