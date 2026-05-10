/* global QUnit */
/* istanbul ignore file */
sap.ui.define(["com/sap/partner/wz/templatesf/test/utils/DataEngine"], function (DataEngine) {
	"use strict";

	// ─────────────────────────────────────────────────────
	// Test fixtures
	// ─────────────────────────────────────────────────────

	function makeRecord(oOverrides) {
		return Object.assign(
			{
				certifiedUserName: "John Smith",
				certifiedUserId: "USR-001",
				certificationId: "C-001",
				certificationName: "SAP BTP Consultant",
				logicalProductName: "SAP BTP",
				source: "Academy",
				partnerAccountId: "PA-001"
			},
			oOverrides || {}
		);
	}

	var DATASET = [
		makeRecord({
			certifiedUserName: "Alice Brown",
			certifiedUserId: "USR-001",
			certificationId: "C-001",
			certificationName: "SAP BTP Consultant",
			source: "Academy"
		}),
		makeRecord({
			certifiedUserName: "Bob Miller",
			certifiedUserId: "USR-002",
			certificationId: "C-002",
			certificationName: "HR Suite Expert",
			source: "Partner"
		}),
		makeRecord({
			certifiedUserName: "Carol White",
			certifiedUserId: "USR-003",
			certificationId: "C-003",
			certificationName: "Finance Architect",
			source: "Academy"
		}),
		makeRecord({
			certifiedUserName: "David Garcia",
			certifiedUserId: "USR-004",
			certificationId: "C-004",
			certificationName: "Supply Chain Pro",
			source: "External"
		}),
		makeRecord({
			certifiedUserName: "Emma Wilson",
			certifiedUserId: "USR-005",
			certificationId: "C-005",
			certificationName: "SAP HANA Specialist",
			source: "Partner"
		})
	];

	function params(sQuery) {
		return new URLSearchParams(sQuery || "");
	}

	// ─────────────────────────────────────────────────────
	// _applySearch
	// Searches: certifiedUserName, certifiedUserId,
	//           certificationId, certificationName
	// Note: logicalProductName is NOT in DataEngine search
	//       (differs from SearchField in controller)
	// ─────────────────────────────────────────────────────
	QUnit.module("DataEngine | _applySearch");

	QUnit.test("null/empty query → all records returned", function (assert) {
		assert.strictEqual(DataEngine._applySearch(DATASET, null).length, 5);
		assert.strictEqual(DataEngine._applySearch(DATASET, "").length, 5);
	});

	QUnit.test("match by certifiedUserName (case-insensitive)", function (assert) {
		var aResult = DataEngine._applySearch(DATASET, "alice");
		assert.strictEqual(aResult.length, 1);
		assert.strictEqual(aResult[0].certifiedUserName, "Alice Brown");
	});

	QUnit.test("match by certifiedUserId", function (assert) {
		var aResult = DataEngine._applySearch(DATASET, "USR-003");
		assert.strictEqual(aResult.length, 1);
		assert.strictEqual(aResult[0].certifiedUserId, "USR-003");
	});

	QUnit.test("match by certificationId", function (assert) {
		var aResult = DataEngine._applySearch(DATASET, "C-002");
		assert.strictEqual(aResult.length, 1);
		assert.strictEqual(aResult[0].certificationId, "C-002");
	});

	QUnit.test("match by certificationName (partial)", function (assert) {
		// "SAP" matches "SAP BTP Consultant" and "SAP HANA Specialist"
		var aResult = DataEngine._applySearch(DATASET, "SAP");
		assert.strictEqual(aResult.length, 2);
	});

	QUnit.test("no match → empty array", function (assert) {
		var aResult = DataEngine._applySearch(DATASET, "xxxxxxxxxxx");
		assert.strictEqual(aResult.length, 0);
	});

	QUnit.test("search does NOT match logicalProductName", function (assert) {
		// logicalProductName = "SAP BTP" for all fixtures
		// but only certificationName search should match "BTP Consultant"
		var aResult = DataEngine._applySearch(DATASET, "SAP BTP");
		// Matches "SAP BTP Consultant" (certificationName) only
		assert.strictEqual(aResult.length, 1);
		assert.strictEqual(aResult[0].certificationName, "SAP BTP Consultant");
	});

	// ─────────────────────────────────────────────────────
	// _applyFilters
	// System params ignored: $top, $skip, search,
	//                        sortPath, sortOrder, partnerId
	// ─────────────────────────────────────────────────────
	QUnit.module("DataEngine | _applyFilters");

	QUnit.test("no params → all records returned", function (assert) {
		assert.strictEqual(DataEngine._applyFilters(DATASET, params()).length, 5);
	});

	QUnit.test("filter by single field value", function (assert) {
		var aResult = DataEngine._applyFilters(DATASET, params("source=Academy"));
		assert.strictEqual(aResult.length, 2);
		aResult.forEach(function (r) {
			assert.strictEqual(r.source, "Academy");
		});
	});

	QUnit.test("multi-value for same field → OR logic", function (assert) {
		var oP = params("source=Academy&source=Partner");
		var aResult = DataEngine._applyFilters(DATASET, oP);
		assert.strictEqual(aResult.length, 4, "Academy(2) + Partner(2)");
	});

	QUnit.test("two different fields → AND logic", function (assert) {
		// source=Academy AND certificationName matching "USR-001"
		var oP = params("source=Academy&certifiedUserId=USR-001");
		var aResult = DataEngine._applyFilters(DATASET, oP);
		assert.strictEqual(aResult.length, 1);
		assert.strictEqual(aResult[0].certifiedUserId, "USR-001");
	});

	QUnit.test("system param '$top' is ignored (no filtering)", function (assert) {
		// $top is a system param — should not filter by it
		var aResult = DataEngine._applyFilters(DATASET, params("$top=2"));
		assert.strictEqual(aResult.length, 5, "All 5 records, $top not applied as filter");
	});

	QUnit.test("system param 'partnerId' is ignored", function (assert) {
		var aResult = DataEngine._applyFilters(DATASET, params("partnerId=PA-001"));
		assert.strictEqual(aResult.length, 5, "All 5 records, partnerId ignored");
	});

	QUnit.test("no matching value → empty array", function (assert) {
		var aResult = DataEngine._applyFilters(DATASET, params("source=NonExistent"));
		assert.strictEqual(aResult.length, 0);
	});

	// ─────────────────────────────────────────────────────
	// _applySorting
	// ─────────────────────────────────────────────────────
	QUnit.module("DataEngine | _applySorting");

	var SORT_DATA = [
		{ name: "Charlie", score: 30 },
		{ name: "Alice", score: 10 },
		{ name: "Bob", score: 20 }
	];

	QUnit.test("no sortPath → original order preserved", function (assert) {
		var aResult = DataEngine._applySorting(SORT_DATA.slice(), null, "Ascending");
		assert.strictEqual(aResult[0].name, "Charlie");
		assert.strictEqual(aResult[2].name, "Bob");
	});

	QUnit.test("Ascending sort by string field", function (assert) {
		var aResult = DataEngine._applySorting(SORT_DATA.slice(), "name", "Ascending");
		assert.strictEqual(aResult[0].name, "Alice");
		assert.strictEqual(aResult[1].name, "Bob");
		assert.strictEqual(aResult[2].name, "Charlie");
	});

	QUnit.test("Descending sort by string field", function (assert) {
		var aResult = DataEngine._applySorting(SORT_DATA.slice(), "name", "Descending");
		assert.strictEqual(aResult[0].name, "Charlie");
		assert.strictEqual(aResult[1].name, "Bob");
		assert.strictEqual(aResult[2].name, "Alice");
	});

	QUnit.test("Ascending sort by numeric field", function (assert) {
		var aResult = DataEngine._applySorting(SORT_DATA.slice(), "score", "Ascending");
		assert.strictEqual(aResult[0].score, 10);
		assert.strictEqual(aResult[2].score, 30);
	});

	QUnit.test("null values sorted last regardless of direction", function (assert) {
		var aData = [{ name: "Zebra" }, { name: null }, { name: "Apple" }];

		var aAsc = DataEngine._applySorting(aData.slice(), "name", "Ascending");
		var aDesc = DataEngine._applySorting(aData.slice(), "name", "Descending");

		assert.strictEqual(aAsc[2].name, null, "null last in Ascending");
		assert.strictEqual(aDesc[2].name, null, "null last in Descending");
	});

	// ─────────────────────────────────────────────────────
	// process — full pipeline
	// ─────────────────────────────────────────────────────
	QUnit.module("DataEngine | process");

	QUnit.test("no params → all records, correct totalCount", function (assert) {
		var oResult = DataEngine.process(DATASET, params());
		assert.strictEqual(oResult.value.length, 5);
		assert.strictEqual(oResult.totalCount, 5);
	});

	QUnit.test("$top limits returned records", function (assert) {
		var oResult = DataEngine.process(DATASET, params("$top=2"));
		assert.strictEqual(oResult.value.length, 2);
		assert.strictEqual(oResult.totalCount, 5, "totalCount is full count, not paged");
	});

	QUnit.test("$skip offsets returned records", function (assert) {
		var oResult = DataEngine.process(DATASET, params("$skip=3"));
		assert.strictEqual(oResult.value.length, 2, "5 total - 3 skipped = 2");
	});

	QUnit.test("$top + $skip — correct window", function (assert) {
		var oResult = DataEngine.process(DATASET, params("$top=2&$skip=1"));
		assert.strictEqual(oResult.value.length, 2);
		// Default dataset order, second and third records
		assert.strictEqual(oResult.value[0].certifiedUserName, "Bob Miller");
		assert.strictEqual(oResult.value[1].certifiedUserName, "Carol White");
	});

	QUnit.test("totalCount reflects post-filter count, not post-paginate", function (assert) {
		// Filter to Academy (2 records), paginate to top=1
		var oP = params("source=Academy&$top=1");
		var oResult = DataEngine.process(DATASET, oP);
		assert.strictEqual(oResult.value.length, 1, "Only 1 record returned");
		assert.strictEqual(oResult.totalCount, 2, "But totalCount = 2 (filtered, not paged)");
	});

	QUnit.test("filter + search + sort combined", function (assert) {
		// Filter: source=Academy, Search: "alice", Sort by certifiedUserName Ascending
		var oP = new URLSearchParams("source=Academy&search=alice&sortPath=certifiedUserName&sortOrder=Ascending");
		var oResult = DataEngine.process(DATASET, oP);
		assert.strictEqual(oResult.value.length, 1);
		assert.strictEqual(oResult.value[0].certifiedUserName, "Alice Brown");
	});

	QUnit.test("$skip beyond total → empty value array, correct totalCount", function (assert) {
		var oResult = DataEngine.process(DATASET, params("$skip=10"));
		assert.strictEqual(oResult.value.length, 0);
		assert.strictEqual(oResult.totalCount, 5);
	});
});
