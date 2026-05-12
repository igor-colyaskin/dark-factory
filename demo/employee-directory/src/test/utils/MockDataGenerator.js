sap.ui.define([], function () {
	"use strict";

	const aData = [
		{ EmployeeId: "EMP-001", FirstName: "Alex",       LastName: "Smith",     Department: "Finance",      Position: "Senior Analyst",         Email: "a.smith@company.com" },
		{ EmployeeId: "EMP-002", FirstName: "Maria",      LastName: "Johnson",   Department: "Development",  Position: "Lead Developer",         Email: "m.johnson@company.com" },
		{ EmployeeId: "EMP-003", FirstName: "David",      LastName: "Brown",     Department: "Marketing",    Position: "Product Manager",        Email: "d.brown@company.com" },
		{ EmployeeId: "EMP-004", FirstName: "Anna",       LastName: "Wilson",    Department: "Development",  Position: "Frontend Developer",     Email: "a.wilson@company.com" },
		{ EmployeeId: "EMP-005", FirstName: "Steven",     LastName: "Taylor",    Department: "HR",           Position: "HR Manager",             Email: "s.taylor@company.com" },
		{ EmployeeId: "EMP-006", FirstName: "Elena",      LastName: "Martin",    Department: "Finance",      Position: "Financial Controller",   Email: "e.martin@company.com" },
		{ EmployeeId: "EMP-007", FirstName: "Paul",       LastName: "Walker",    Department: "Development",  Position: "Backend Developer",      Email: "p.walker@company.com" },
		{ EmployeeId: "EMP-008", FirstName: "Olivia",     LastName: "Lewis",     Department: "Marketing",    Position: "Content Manager",        Email: "o.lewis@company.com" },
		{ EmployeeId: "EMP-009", FirstName: "Igor",       LastName: "Clarke",    Department: "IT",           Position: "System Administrator",   Email: "i.clarke@company.com" },
		{ EmployeeId: "EMP-010", FirstName: "Natalie",    LastName: "Hall",      Department: "HR",           Position: "Recruiter",              Email: "n.hall@company.com" },
		{ EmployeeId: "EMP-011", FirstName: "Andrew",     LastName: "Young",     Department: "Development",  Position: "Software Architect",     Email: "a.young@company.com" },
		{ EmployeeId: "EMP-012", FirstName: "Svetlana",   LastName: "King",      Department: "Finance",      Position: "Accountant",             Email: "s.king@company.com" },
		{ EmployeeId: "EMP-013", FirstName: "Michael",    LastName: "Scott",     Department: "IT",           Position: "DevOps Engineer",        Email: "m.scott@company.com" },
		{ EmployeeId: "EMP-014", FirstName: "Julia",      LastName: "White",     Department: "Marketing",    Position: "UX Designer",            Email: "j.white@company.com" },
		{ EmployeeId: "EMP-015", FirstName: "Roman",      LastName: "Harris",    Department: "Development",  Position: "QA Engineer",            Email: "r.harris@company.com" },
		{ EmployeeId: "EMP-016", FirstName: "Victoria",   LastName: "Nelson",    Department: "HR",           Position: "HR Director",            Email: "v.nelson@company.com" },
		{ EmployeeId: "EMP-017", FirstName: "Constantine", LastName: "Adams",    Department: "IT",           Position: "Network Engineer",       Email: "c.adams@company.com" },
		{ EmployeeId: "EMP-018", FirstName: "Tatiana",    LastName: "Baker",     Department: "Finance",      Position: "Auditor",                Email: "t.baker@company.com" }
	];

	return {
		getData: function () {
			return aData;
		}
	};
});
