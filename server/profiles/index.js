import nodejsApp from './nodejs-app.js';
import integrationCard from './integration-card.js';

const PROFILES = {
  'nodejs-app': nodejsApp,
  'integration-card': integrationCard,
};

let activeProfileId = process.env.ACTIVE_PROFILE || 'nodejs-app';

export function resolveProfile() {
  const profile = PROFILES[activeProfileId];
  if (!profile) {
    console.warn(`[PROFILE] Unknown profile "${activeProfileId}", falling back to nodejs-app`);
    return nodejsApp;
  }
  return profile;
}

export function setActiveProfile(id) {
  if (!PROFILES[id]) {
    throw new Error(`Unknown profile: "${id}"`);
  }
  activeProfileId = id;
  console.log(`[PROFILE] Active profile changed to: ${id}`);
}

export function getAvailableProfiles() {
  return Object.values(PROFILES).map(p => ({ id: p.id, name: p.name }));
}

export function getActiveProfileId() {
  return activeProfileId;
}

export default PROFILES;
