/* istanbul ignore file */
sap.ui.define([], function () {
	"use strict";

	// Test double for com/sap/fiorireuselibrary/ui5cardssdk/StorageUtils.
	// In-memory store replaces real localStorage so tests run without browser storage
	// and storage state is fully controllable via _reset().

	var _store = {};

	return {
		createStorage: function (sStorageKeyPrefix) {
			this._prefix = sStorageKeyPrefix;
			if (!_store[sStorageKeyPrefix]) {
				_store[sStorageKeyPrefix] = {};
			}
		},
		setItem: function (key, value) {
			if (this._prefix) {
				_store[this._prefix][key] = value;
			}
		},
		readItem: function (key) {
			if (this._prefix && _store[this._prefix]) {
				var val = _store[this._prefix][key];
				return val !== undefined ? val : null;
			}
			return null;
		},
		removeItem: function (key) {
			if (this._prefix && _store[this._prefix]) {
				delete _store[this._prefix][key];
			}
		},
		// test-only: wipe all stored data between QUnit modules
		_reset: function () {
			_store = {};
			this._prefix = undefined;
		}
	};
});
