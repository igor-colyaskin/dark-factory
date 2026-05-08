/* global QUnit */
/* istanbul ignore file */
sap.ui.define(["com/sap/partner/wz/templatesf/helpers/DataHelper"], function (DataHelper) {
	"use strict";

	// ─────────────────────────────────────────────────────
	// _processData: field mapping
	// Maps PascalCase backend fields → camelCase view model
	// ─────────────────────────────────────────────────────
	QUnit.module("DataHelper | _processData — field mapping");

	QUnit.test("all known BE fields are mapped to camelCase", function (assert) {
		var oRaw = {
			FirstName:   "Anna",
			LastName:    "Müller",
			EmployeeID:  "E-001",
			Position:    "Developer",
			Department:  "IT",
			Role:        "Admin",
			HRContact:   "hr@example.com",
			Area:        "EMEA",
			Email:       "anna@example.com",
			Status:      "Active",
			ExpDate:     "2025-12-31",
			Certification: "SAP BTP"
		};

		var oResult = DataHelper._processData(oRaw);

		assert.strictEqual(oResult.firstName,    "Anna",            "firstName");
		assert.strictEqual(oResult.lastName,     "Müller",          "lastName");
		assert.strictEqual(oResult.employeeId,   "E-001",           "employeeId");
		assert.strictEqual(oResult.position,     "Developer",       "position");
		assert.strictEqual(oResult.department,   "IT",              "department");
		assert.strictEqual(oResult.role,         "Admin",           "role");
		assert.strictEqual(oResult.hrContact,    "hr@example.com",  "hrContact");
		assert.strictEqual(oResult.area,         "EMEA",            "area");
		assert.strictEqual(oResult.email,        "anna@example.com","email");
		assert.strictEqual(oResult.status,       "Active",          "status");
		assert.strictEqual(oResult.expDate,      "2025-12-31",      "expDate");
		assert.strictEqual(oResult.certification,"SAP BTP",         "certification");
	});

	// ─────────────────────────────────────────────────────
	// _processData: missing / undefined fields → empty string
	// ─────────────────────────────────────────────────────
	QUnit.module("DataHelper | _processData — missing field fallback");

	QUnit.test("missing field falls back to empty string", function (assert) {
		var oResult = DataHelper._processData({});

		assert.strictEqual(oResult.firstName,    "", "firstName defaults to ''");
		assert.strictEqual(oResult.lastName,     "", "lastName defaults to ''");
		assert.strictEqual(oResult.employeeId,   "", "employeeId defaults to ''");
		assert.strictEqual(oResult.position,     "", "position defaults to ''");
		assert.strictEqual(oResult.department,   "", "department defaults to ''");
		assert.strictEqual(oResult.role,         "", "role defaults to ''");
		assert.strictEqual(oResult.hrContact,    "", "hrContact defaults to ''");
		assert.strictEqual(oResult.area,         "", "area defaults to ''");
		assert.strictEqual(oResult.email,        "", "email defaults to ''");
		assert.strictEqual(oResult.status,       "", "status defaults to ''");
		assert.strictEqual(oResult.expDate,      "", "expDate defaults to ''");
		assert.strictEqual(oResult.certification,"", "certification defaults to ''");
	});

	QUnit.test("null field value falls back to empty string", function (assert) {
		var oResult = DataHelper._processData({ FirstName: null, LastName: null });
		assert.strictEqual(oResult.firstName, "", "null FirstName → ''");
		assert.strictEqual(oResult.lastName,  "", "null LastName → ''");
	});

	// ─────────────────────────────────────────────────────
	// _processData: computed field — fullName
	// ─────────────────────────────────────────────────────
	QUnit.module("DataHelper | _processData — computed fullName");

	QUnit.test("fullName = firstName + ' ' + lastName", function (assert) {
		var oResult = DataHelper._processData({ FirstName: "Anna", LastName: "Müller" });
		assert.strictEqual(oResult.fullName, "Anna Müller");
	});

	QUnit.test("fullName with only firstName (no lastName)", function (assert) {
		var oResult = DataHelper._processData({ FirstName: "Anna" });
		assert.strictEqual(oResult.fullName, "Anna", "No trailing space");
	});

	QUnit.test("fullName with only lastName (no firstName)", function (assert) {
		var oResult = DataHelper._processData({ LastName: "Müller" });
		assert.strictEqual(oResult.fullName, "Müller", "No leading space");
	});

	QUnit.test("fullName with neither first nor last name → empty string", function (assert) {
		var oResult = DataHelper._processData({});
		assert.strictEqual(oResult.fullName, "");
	});

	// ─────────────────────────────────────────────────────
	// _processData: input is not mutated
	// ─────────────────────────────────────────────────────
	QUnit.module("DataHelper | _processData — immutability");

	QUnit.test("original input object is not mutated", function (assert) {
		var oRaw = { FirstName: "Test", LastName: "User" };
		var sKeysBefore = JSON.stringify(Object.keys(oRaw).sort());
		DataHelper._processData(oRaw);
		assert.strictEqual(JSON.stringify(Object.keys(oRaw).sort()), sKeysBefore, "Keys unchanged");
		assert.ok(!oRaw.hasOwnProperty("fullName"), "fullName not added to original");
	});
});
