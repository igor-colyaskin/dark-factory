import architectPrompts from '../prompts/integration-card/architect.js';
import developerPrompts from '../prompts/integration-card/developer.js';
import testerPrompts from '../prompts/integration-card/tester.js';

export default {
  id: 'integration-card',
  name: 'Integration Card',
  prompts: {
    architect: architectPrompts,
    developer: developerPrompts,
    tester: testerPrompts,
  },
  deployer: 'none',
  verifier: 'manifest',
};
