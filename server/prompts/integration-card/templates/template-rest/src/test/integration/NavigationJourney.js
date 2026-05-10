/* istanbul ignore file */
sap.ui.define(["sap/ui/test/opaQunit"], function (opaTest) {
	"use strict";

	// ── Stability rationale ───────────────────────────────────────────
	//
	// These tests verify STRUCTURAL contracts of the Simple Form card:
	//   - The form control (id="employeeForm") is rendered and visible
	//     after card init and data load.
	//   - The menu button (id="menuButton", icon overflow) is present
	//     in the toolbar — it exists in every card in the suite.
	//   - Pressing the menu button opens a sap.m.Menu with the two
	//     standard items: "What is this card about" / "Required Authorization".
	//
	// Explicitly NOT tested here (too volatile):
	//   - Field values (depend on mock data)
	//   - i18n label text (changes with translations)
	//   - Dialog content (text is a template placeholder)
	//
	// ─────────────────────────────────────────────────────────────────

	QUnit.module("Integration | Structural Layout");

	// ─────────────────────────────────────────────────────────────────
	// Test 1 — Form is rendered
	//
	// Verifies: sap.ui.layout.form.Form with id="employeeForm" is
	// rendered and visible after card init + mock data load.
	// Fails only if the form is removed or its id changed.
	// ─────────────────────────────────────────────────────────────────
	opaTest("The employee form should be visible on the page", function (Given, When, Then) {
		Given.iStartMyApp();

		Then.onTheMainPage.iShouldSeeTheForm();

		Then.iTeardownMyApp();
	});

	// ─────────────────────────────────────────────────────────────────
	// Test 2 — Menu button is present in the toolbar
	//
	// Verifies: Button with id="menuButton" and icon sap-icon://overflow
	// is rendered and visible. This button is part of the standard
	// toolbar contract shared by all cards in the suite.
	// ─────────────────────────────────────────────────────────────────
	opaTest("The menu button should be visible in the toolbar", function (Given, When, Then) {
		Given.iStartMyApp();

		Then.onTheMainPage.iShouldSeeTheMenuButton();

		Then.iTeardownMyApp();
	});

	// ─────────────────────────────────────────────────────────────────
	// Test 3 — Pressing the menu button opens the overflow menu
	//
	// Verifies the complete path:
	//   Button press → onMenuPress() → Fragment.load → sap.m.Menu.openBy()
	// ─────────────────────────────────────────────────────────────────
	opaTest("Clicking the menu button should open the overflow menu", function (Given, When, Then) {
		Given.iStartMyApp();

		When.onTheMainPage.iClickTheMenuButton();

		Then.onTheMainPage.iShouldSeeTheOverflowMenu();

		Then.iTeardownMyApp();
	});
});
