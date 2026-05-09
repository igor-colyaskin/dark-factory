import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = path.join(__dirname, '../cards-registry.json');

function read() {
	if (!existsSync(REGISTRY_PATH)) return [];
	try {
		return JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
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
		entries.push({ slug, name: name || slug, createdAt: now, lastModified: now });
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
