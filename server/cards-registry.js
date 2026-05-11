import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = path.join(__dirname, '../cards-registry.json');

function read() {
	if (!existsSync(REGISTRY_PATH)) return [];
	try {
		const entries = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
		// One-time migration: assign sequential IDs to entries that don't have one
		let maxId = entries.reduce((m, e) => e.id ? Math.max(m, e.id) : m, 0);
		let dirty = false;
		for (const e of entries) {
			if (!e.id) { e.id = ++maxId; dirty = true; }
		}
		if (dirty) writeFileSync(REGISTRY_PATH, JSON.stringify(entries, null, 2), 'utf8');
		return entries;
	} catch {
		return [];
	}
}

function write(entries) {
	writeFileSync(REGISTRY_PATH, JSON.stringify(entries, null, 2), 'utf8');
}

export function readRegistry() {
	return read();
}

export function registerCard({ slug, name }) {
	const entries = read();
	const existing = entries.findIndex(e => e.slug === slug);
	const now = new Date().toISOString();
	if (existing >= 0) {
		entries[existing].lastModified = now;
		entries[existing].name = name || entries[existing].name;
	} else {
		const newId = entries.reduce((m, e) => e.id ? Math.max(m, e.id) : m, 0) + 1;
		entries.push({ id: newId, slug, name: name || slug, createdAt: now, lastModified: now });
	}
	write(entries);
}

export function updateCardModified(slug) {
	const entries = read();
	const entry = entries.find(e => e.slug === slug);
	if (entry) {
		entry.lastModified = new Date().toISOString();
		write(entries);
	}
}

export function removeCard(slug) {
	const entries = read().filter(e => e.slug !== slug);
	write(entries);
}

export default { readRegistry, registerCard, updateCardModified, removeCard };
