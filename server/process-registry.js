// In-memory registry of running app processes.
// Survives only while the DF server is running — by design (Local Runner is on-demand).
class ProcessRegistry {
  constructor() {
    this._map = new Map(); // appName → { pid, port, startedAt }
  }

  register(appName, { pid, port }) {
    this._map.set(appName, { pid, port, startedAt: Date.now() });
  }

  get(appName) {
    return this._map.get(appName) || null;
  }

  remove(appName) {
    this._map.delete(appName);
  }

  list() {
    return Array.from(this._map.entries()).map(([appName, info]) => ({ appName, ...info }));
  }
}

export default new ProcessRegistry();
