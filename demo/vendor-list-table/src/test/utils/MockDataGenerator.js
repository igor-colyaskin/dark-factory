sap.ui.define([], function () {
	"use strict";

	const aData = [
		{
			vendorId: "V-00123",
			name: "Acme Solutions GmbH",
			Tier: "Gold",
			Status: "Active",
			Country: "DE",
			ContactName: "Maria Schmidt",
			ContactEmail: "m.schmidt@acme.de",
			CertificationLevel: "Advanced",
			LastAuditDate: "2024-11-15"
		},
		{
			vendorId: "V-00124",
			name: "TechBridge Ltd",
			Tier: "Silver",
			Status: "Active",
			Country: "GB",
			ContactName: "James Walker",
			ContactEmail: "j.walker@techbridge.co.uk",
			CertificationLevel: "Standard",
			LastAuditDate: "2024-09-03"
		},
		{
			vendorId: "V-00125",
			name: "Nordic Supply AS",
			Tier: "Gold",
			Status: "Under Review",
			Country: "NO",
			ContactName: "Erik Lindqvist",
			ContactEmail: "e.lindqvist@nordicsupply.no",
			CertificationLevel: "Advanced",
			LastAuditDate: "2024-06-20"
		},
		{
			vendorId: "V-00126",
			name: "Iberian Parts SL",
			Tier: "Bronze",
			Status: "Inactive",
			Country: "ES",
			ContactName: "Carlos Ruiz",
			ContactEmail: "c.ruiz@iberianparts.es",
			CertificationLevel: "Basic",
			LastAuditDate: "2023-12-01"
		},
		{
			vendorId: "V-00127",
			name: "Alpine Components AG",
			Tier: "Platinum",
			Status: "Active",
			Country: "CH",
			ContactName: "Sophie Meier",
			ContactEmail: "s.meier@alpinecomp.ch",
			CertificationLevel: "Expert",
			LastAuditDate: "2025-01-10"
		},
		{
			vendorId: "V-00128",
			name: "Eastline Trading Co",
			Tier: "Silver",
			Status: "Active",
			Country: "PL",
			ContactName: "Anna Kowalski",
			ContactEmail: "a.kowalski@eastline.pl",
			CertificationLevel: "Standard",
			LastAuditDate: "2024-08-22"
		},
		{
			vendorId: "V-00129",
			name: "Delta Logistics BV",
			Tier: "Bronze",
			Status: "Under Review",
			Country: "NL",
			ContactName: "Pieter van den Berg",
			ContactEmail: "p.vandenberg@deltalog.nl",
			CertificationLevel: "Basic",
			LastAuditDate: "2024-03-18"
		},
		{
			vendorId: "V-00130",
			name: "Meridian Global SAS",
			Tier: "Gold",
			Status: "Inactive",
			Country: "FR",
			ContactName: "Claire Dupont",
			ContactEmail: "c.dupont@meridianglobal.fr",
			CertificationLevel: "Advanced",
			LastAuditDate: "2023-10-05"
		}
	];

	return {
		getData: function () {
			return aData;
		}
	};
});
