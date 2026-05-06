// Тест local-runner: запускает приложение из workspace/, проверяет URL, останавливает
import localRunner from '../server/local-runner.js';

const APP_NAME = 'df-test-local-runner';

function check(label, ok, detail = '') {
  console.log(`${ok ? '✓' : '✗ FAIL:'} ${label}${detail ? ' — ' + detail : ''}`);
  if (!ok) process.exitCode = 1;
}

console.log('=== test-local-runner ===\n');

let result;
try {
  result = await localRunner.deploy(APP_NAME, (step, msg) => {
    console.log(`  [${step}] ${msg}`);
  });
  console.log('');

  check('deploy вернул url', typeof result.url === 'string' && result.url.startsWith('http://localhost:'), result.url);
  check('deploy вернул pid', typeof result.pid === 'number' && result.pid > 0, String(result.pid));
  check('deploy вернул port', typeof result.port === 'number', String(result.port));

  // Проверяем HTTP
  const res = await fetch(result.url);
  check('GET / возвращает 200', res.status === 200, `status=${res.status}`);

  // Teardown
  localRunner.teardown(result.pid, APP_NAME);
  await new Promise(r => setTimeout(r, 500));

  // Убеждаемся что порт освободился
  const res2 = await fetch(result.url, { signal: AbortSignal.timeout(1000) }).catch(() => null);
  check('После teardown порт недоступен', res2 === null);

} catch (e) {
  check('deploy без ошибок', false, e.message);
}

console.log('');
const failed = process.exitCode === 1;
console.log(failed ? '1+ FAILED' : 'ALL CHECKS PASSED');
