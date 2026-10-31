const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('static/theme.js', 'utf8');

(async () => {
  const nodes = Object.fromEntries(['appearance', 'appearanceLabel', 'appearanceSystem',
    'appearanceLight', 'appearanceDark'].map(id => [id, {
    value: '', addEventListener(event, callback) { this[event] = callback; }
  }]));
  const media = { matches: true, addEventListener(event, callback) { this[event] = callback; } };
  const root = { dataset: {} }, writes = [], alerts = [];
  const context = vm.createContext({ document: { documentElement: root,
    getElementById: id => nodes[id] }, window: { matchMedia: () => media,
    alert: message => alerts.push(message) } });
  vm.runInContext(source + '\nglobalThis.theme = ServiceToolTheme;', context);
  const theme = context.theme;
  theme.apply(undefined);
  assert.equal(root.dataset.bsTheme, 'light');
  theme.apply('dark');
  assert.equal(root.dataset.bsTheme, 'dark');
  media.matches = false; media.change();
  assert.equal(root.dataset.bsTheme, 'dark');
  theme.apply('system');
  assert.equal(root.dataset.bsTheme, 'light');
  media.matches = true; media.change();
  assert.equal(root.dataset.bsTheme, 'dark');
  assert.equal(nodes.appearance.value, 'system');
  theme.translate('de'); assert.equal(nodes.appearanceDark.textContent, 'Dunkel');
  theme.translate('en'); assert.equal(nodes.appearanceDark.textContent, 'Dark');
  let fail = false;
  theme.bind(async value => { if (fail) throw new Error('test save failed');
    writes.push(value); return { appearance: value }; });
  nodes.appearance.value = 'light'; await nodes.appearance.change();
  assert.deepEqual(writes, ['light']);
  assert.equal(root.dataset.bsTheme, 'light');
  fail = true; nodes.appearance.value = 'dark'; await nodes.appearance.change();
  assert.equal(nodes.appearance.value, 'light');
  assert.equal(root.dataset.bsTheme, 'light');
  assert.equal(nodes.appearance.disabled, false);
  assert.equal(alerts.length, 1);
  theme.apply('invalid'); assert.equal(root.dataset.bsTheme, 'light');
  const fallback = vm.createContext({document:{documentElement:{dataset:{}},getElementById:()=>null},window:{}});
  vm.runInContext(source + '\nServiceToolTheme.apply("system");', fallback);
  assert.equal(fallback.document.documentElement.dataset.bsTheme, 'light');
  console.log('Theme: defaults, explicit/system changes, DE/EN, saving, failure recovery and browser fallback passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
