/* istanbul ignore file */
sap.ui.define(
	[
		"sap/ui/test/Opa5",
		"sap/ui/test/matchers/Properties",
		"sap/ui/test/matchers/Visible",
		"sap/ui/test/actions/Press"
	],
	function (Opa5, Properties, Visible, Press) {
		"use strict";

		// ── ID matching strategy ──────────────────────────────────────────
		// Controls in a Card Component get prefixed IDs at runtime:
		//   e.g. "__component0---Main--employeeForm"
		// Regex anchored at end ($) is stable across component ID changes
		// and immune to accidental partial matches.
		// ─────────────────────────────────────────────────────────────────

		Opa5.createPageObjects({
			onTheMainPage: {
				// ═══════════════════════════════════════════════
				// ACTIONS
				// ═══════════════════════════════════════════════

				actions: {
					iClickTheMenuButton: function () {
						return this.waitFor({
							id: /menuButton$/,
							controlType: "sap.m.Button",
							matchers: new Properties({ icon: "sap-icon://overflow" }),
							actions: new Press(),
							errorMessage: "Menu button (overflow icon) not found or not pressable"
						});
					}
				},

				// ═══════════════════════════════════════════════
				// ASSERTIONS
				// ═══════════════════════════════════════════════

				assertions: {
					iShouldSeeTheForm: function () {
						return this.waitFor({
							id: /employeeForm$/,
							controlType: "sap.ui.layout.form.Form",
							matchers: new Visible(),
							success: function () {
								Opa5.assert.ok(true, "Employee form is visible on the page");
							},
							errorMessage: "sap.ui.layout.form.Form with id 'employeeForm' not found or not visible"
						});
					},

					iShouldSeeTheMenuButton: function () {
						return this.waitFor({
							id: /menuButton$/,
							controlType: "sap.m.Button",
							matchers: [
								new Properties({ icon: "sap-icon://overflow" }),
								new Visible()
							],
							success: function () {
								Opa5.assert.ok(true, "Menu button (overflow icon) is visible in the toolbar");
							},
							errorMessage: "Menu button (sap-icon://overflow) with id 'menuButton' not found or not visible"
						});
					},

					iShouldSeeTheOverflowMenu: function () {
						return this.waitFor({
							controlType: "sap.m.Menu",
							matchers: new Visible(),
							success: function () {
								Opa5.assert.ok(true, "Overflow menu is open and visible");
							},
							errorMessage: "sap.m.Menu did not open after pressing the menu button"
						});
					}
				}
			}
		});
	}
);
