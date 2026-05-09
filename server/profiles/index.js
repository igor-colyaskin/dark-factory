import integrationCard from './integration-card.js';

const PROFILES = {
  'integration-card': integrationCard,
};

let activeProfileId = 'integration-card';

export function resolveProfile() {
  return integrationCard;
}

export function setActiveProfile(id) {
  if (!PROFILES[id]) {
    throw new Error(`Unknown profile: "${id}"`);
  }
  activeProfileId = id;
}

export function getAvailableProfiles() {
  return Object.values(PROFILES).map(p => ({ id: p.id, name: p.name }));
}

export function getActiveProfileId() {
  return activeProfileId;
}

export default PROFILES;
