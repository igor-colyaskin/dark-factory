#!/usr/bin/env node
/**
 * Dark Factory — help screen
 * Prints a grouped list of available npm commands.
 */

const GROUPS = [
  {
    title: '🚀 Run the app',
    commands: [
      ['npm start',          'Production — real OpenRouter API + real Fly.io deploy'],
      ['npm run dev',        'Production with auto-reload (node --watch)'],
      ['npm run mock:full',  'Mock LLM + real file write + real Fly deploy'],
      ['npm run mock:fast',  'Mock everything (no LLM, no deploy) — UI/UX debugging'],
      ['npm run demo',       'Mock everything + theatrical delays — for presentations']
    ]
  },
  {
    title: '🧹 Housekeeping',
    commands: [
      ['npm run clean',      'Remove state/current.json and workspace/'],
      ['npm run fresh',      'Clean + restart in production mode'],
      ['npm run restart',    'Kill port 3000 and restart']
    ]
  },
  {
    title: '🧪 Tests',
    commands: [
      ['npm test',           'Run tests from test/ with node --test']
    ]
  },
  {
    title: '❓ Help',
    commands: [
      ['npm run help',       'Show this help screen']
    ]
  }
];

const HINTS = [
  'Open http://localhost:3000 after start.',
  'Configure .env (see .env.example). mock-fast and demo need no keys.',
  'See CONCEPT.md section 8.1 for mode details.',
  'See docs/RUN_MODES.md for troubleshooting.'
];

function pad(s, n) { return s + ' '.repeat(Math.max(0, n - s.length)); }

console.log('');
console.log('🏭 Dark Factory — available commands');
console.log('');

const colWidth = 22;

for (const group of GROUPS) {
  console.log(group.title);
  for (const [cmd, desc] of group.commands) {
    console.log('  ' + pad(cmd, colWidth) + desc);
  }
  console.log('');
}

console.log('💡 Tips:');
for (const tip of HINTS) {
  console.log('  • ' + tip);
}
console.log('');