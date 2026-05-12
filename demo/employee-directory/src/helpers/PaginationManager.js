sap.ui.define([], function () {
	"use strict";

	return {
		updatePagination: function (oConfigModel, iTotalCount) {
			var iItemsPerPage = oConfigModel.getProperty("/itemsPerPage") || 10;
			var iTotalPages = Math.ceil(iTotalCount / iItemsPerPage) || 1;
			var iCurrentPage = oConfigModel.getProperty("/currentPage") || 0;

			oConfigModel.setProperty("/totalCount", iTotalCount);
			oConfigModel.setProperty("/totalPages", iTotalPages);

			if (iCurrentPage >= iTotalPages) {
				oConfigModel.setProperty("/currentPage", 0);
			}
		},

		getNextPage: function (oConfigModel) {
			var iCurrent = oConfigModel.getProperty("/currentPage");
			var iTotal = oConfigModel.getProperty("/totalPages");
			return iCurrent + 1 < iTotal ? iCurrent + 1 : iCurrent;
		},

		getPrevPage: function (oConfigModel) {
			var iCurrent = oConfigModel.getProperty("/currentPage");
			return iCurrent > 0 ? iCurrent - 1 : 0;
		}
	};
});
