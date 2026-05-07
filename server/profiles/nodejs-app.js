import architectPrompts from '../prompts/architect.js';
import developerPrompts from '../prompts/developer.js';
import testerPrompts from '../prompts/tester.js';

export default {
  id: 'nodejs-app',
  name: 'Node.js App',
  prompts: {
    architect: architectPrompts,
    developer: developerPrompts,
    tester: testerPrompts,
  },
  deployer: 'local-runner',
  verifier: 'vision',
};
