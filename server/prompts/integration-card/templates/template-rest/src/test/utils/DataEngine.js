sap.ui.define([], function () {
	"use strict";

	var aSystemParams = ["$top", "$skip", "search", "sortPath", "sortOrder", "partnerId"];

	return {
		/**
		 * Processes mock data: filter → search → sort → paginate.
		 * @param {Array} aData - Full dataset
		 * @param {URLSearchParams} oParams - Request parameters
		 * @returns {{value: Array, totalCount: number}}
		 */
		process: function (aData, oParams) {
			var aResult = aData.slice();

			aResult = this._applyFilters(aResult, oParams);
			aResult = this._applySearch(aResult, oParams.get("search"));
			aResult = this._applySorting(aResult, oParams.get("sortPath"), oParams.get("sortOrder"));

			var iTotal = aResult.length;

			// If $top is not specified, return all results
			var iTop = oParams.has("$top") ? parseInt(oParams.get("$top"), 10) : iTotal;
			var iSkip = parseInt(oParams.get("$skip"), 10) || 0;

			return {
				value: aResult.slice(iSkip, iSkip + iTop),
				totalCount: iTotal
			};
		},

		_applyFilters: function (aData, oParams) {
			var aFiltered = aData.slice();

			oParams.forEach(function (sValue, sKey) {
				var sCleanKey = sKey.replace("[]", "");

				if (aSystemParams.indexOf(sCleanKey) !== -1) {
					return;
				}

				var aValues = oParams.getAll(sKey);
				if (aValues.length > 0) {
					aFiltered = aFiltered.filter(function (oItem) {
						return aValues.indexOf(String(oItem[sCleanKey] || "")) !== -1;
					});
				}
			});

			return aFiltered;
		},

		_applySearch: function (aData, sSearch) {
			if (!sSearch) {
				return aData;
			}
			var sQ = sSearch.toLowerCase();
			return aData.filter(function (oItem) {
				return (
					(oItem.certifiedUserName && oItem.certifiedUserName.toLowerCase().indexOf(sQ) !== -1) ||
					(oItem.certifiedUserId && oItem.certifiedUserId.toLowerCase().indexOf(sQ) !== -1) ||
					(oItem.certificationId && oItem.certificationId.toLowerCase().indexOf(sQ) !== -1) ||
					(oItem.certificationName && oItem.certificationName.toLowerCase().indexOf(sQ) !== -1)
				);
			});
		},

		_applySorting: function (aData, sSortPath, sSortOrder) {
			if (!sSortPath) {
				return aData;
			}

			return aData.sort(function (a, b) {
				var vA = a[sSortPath];
				var vB = b[sSortPath];

				if (vA == null) {
					return 1;
				}
				if (vB == null) {
					return -1;
				}

				var iResult = 0;
				if (vA < vB) {
					iResult = -1;
				}
				if (vA > vB) {
					iResult = 1;
				}

				return sSortOrder === "Descending" ? -iResult : iResult;
			});
		}
	};
});
