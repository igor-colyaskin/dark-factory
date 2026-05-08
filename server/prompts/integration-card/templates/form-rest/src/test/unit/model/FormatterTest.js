/* global QUnit */
/* istanbul ignore file */
sap.ui.define(["com/sap/partner/wz/templatesf/model/formatter"], function (Formatter) {
	"use strict";

	// ─────────────────────────────────────────────────────
	// formatDate
	// Pattern: dd.MM.yyyy
	// Note: new Date("YYYY-MM-DD") parses as UTC midnight,
	// so exact day values are timezone-sensitive.
	// Tests verify output shape and edge cases, not exact values.
	// ─────────────────────────────────────────────────────
	QUnit.module("Formatter | formatDate");

	QUnit.test("null → empty string", function (assert) {
		assert.strictEqual(Formatter.formatDate(null), "");
	});

	QUnit.test("undefined → empty string", function (assert) {
		assert.strictEqual(Formatter.formatDate(undefined), "");
	});

	QUnit.test("empty string → empty string", function (assert) {
		assert.strictEqual(Formatter.formatDate(""), "");
	});

	QUnit.test("valid ISO date string → matches dd.MM.yyyy pattern", function (assert) {
		var sResult = Formatter.formatDate("2024-06-15");
		assert.ok(/^\d{2}\.\d{2}\.\d{4}$/.test(sResult), "Pattern dd.MM.yyyy matched. Got: '" + sResult + "'");
	});

	QUnit.test("valid ISO date string → non-empty result", function (assert) {
		assert.notStrictEqual(Formatter.formatDate("2024-06-15"), "", "Non-empty for valid input");
	});

	QUnit.test("year is preserved in the output", function (assert) {
		var sResult = Formatter.formatDate("2024-06-15");
		assert.ok(sResult.indexOf("2024") !== -1, "Year 2024 is present in the output. Got: '" + sResult + "'");
	});
});
