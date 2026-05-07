import nodejsApp from './nodejs-app.js';

const PROFILES = {
  'nodejs-app': nodejsApp,
};

export function resolveProfile() {
  const profileId = process.env.ACTIVE_PROFILE || 'nodejs-app';
  const profile = PROFILES[profileId];
  if (!profile) {
    console.warn(`[PROFILE] Unknown profile "${profileId}", falling back to nodejs-app`);
    return nodejsApp;
  }
  return profile;
}

export default PROFILES;
