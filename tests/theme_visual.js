// Offline rendering only: no ServiceTool server, API or device requests.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    await page.route('**/*', route => route.abort());
    const css = ['styles.css', 'workspace.css', 'designer.css', 'theme.css']
      .map(file => fs.readFileSync(`static/${file}`, 'utf8')).join('\n');
    const html = fs.readFileSync('static/index.html', 'utf8');
    const appearance = html.match(/<label class="theme-setting">[\s\S]*?<\/label>/)[0];
    await page.setContent(`<style>${css}</style>
      <header class="hero"><h1>ServiceTool – Darstellung</h1></header>
      <main class="layout">
        <section class="card span-2"><h2>Einstellungen</h2>${appearance}
          <div class="actions"><button>Speichern</button><button class="success">Verbunden</button>
          <button class="danger">Löschen</button><button disabled>Deaktiviert</button></div></section>
        <section class="designer-card"><div class="designer-toolbar"><input value="Beispielplan"></div>
          <div class="designer-columns"><span>#</span><span>Rast</span><span>Temperatur</span><span>Dauer</span><span>autonext</span></div>
          <div class="designer-steps"><div class="designer-step" aria-selected="true"><span>1</span><span>Maltoserast</span><span>63 °C</span><span>30 min</span><span class="designer-continue">▶</span></div>
          <div class="designer-step"><span>2</span><span>Abmaischen</span><span>78 °C</span><span>5 min</span><span class="designer-pause">■</span></div></div></section>
        <section class="card span-2 explorer"><h2>Explorer</h2><table class="file-table"><thead><tr><th><button class="table-sort">Name</button></th><th>Typ</th></tr></thead>
          <tbody><tr class="selected"><td>Beispielplan.json</td><td>JSON</td></tr><tr class="version-group"><td>Gespeicherte Versionen</td><td>2</td></tr></tbody></table>
          <textarea id="explorerContent" style="height:70px;min-height:70px">{ "name": "Beispielplan" }</textarea></section>
        <section class="card span-2"><h2>Hilfe / Status</h2><p class="hint">Beispieltext für die lokale Darstellungsprüfung.</p>
          <span class="connection-state online process-active">Prozess aktiv</span>
          <span class="connection-state installing">Installation</span></section>
      </main><dialog class="profile-dialog"><h2>Profil</h2><label>Name<input value="Testgerät"></label><button>Speichern</button></dialog>`);
    await page.addScriptTag({content:fs.readFileSync('static/theme.js','utf8')});
    const output = fs.mkdtempSync(path.join(os.tmpdir(), 'servicetool-theme-'));
    for (const mode of ['light','dark']) {
      await page.evaluate(value => ServiceToolTheme.apply(value), mode);
      await page.waitForTimeout(200); // Allow existing button color transitions to finish.
      const expected = mode === 'dark' ? 'rgb(33, 37, 41)' : 'rgb(244, 246, 249)';
      assert.equal(await page.locator('body').evaluate(node => getComputedStyle(node).backgroundColor), expected);
      if (mode === 'dark') assert.equal(await page.locator('button.success').evaluate(node => getComputedStyle(node).color), 'rgb(117, 183, 152)');
      await page.screenshot({path:path.join(output, `${mode}.png`),fullPage:true});
      await page.locator('dialog').evaluate(node => node.showModal());
      if (mode === 'dark') assert.equal(await page.locator('dialog').evaluate(node => getComputedStyle(node).backgroundColor),'rgb(43, 48, 53)');
      await page.screenshot({path:path.join(output, `${mode}-dialog.png`)});
      await page.locator('dialog').evaluate(node => node.close());
    }
    await page.emulateMedia({colorScheme:'dark'});
    await page.evaluate(() => ServiceToolTheme.apply('system'));
    await page.waitForFunction(() => document.documentElement.dataset.bsTheme === 'dark');
    await page.emulateMedia({colorScheme:'light'});
    await page.waitForFunction(() => document.documentElement.dataset.bsTheme === 'light');
    await page.evaluate(() => ServiceToolTheme.translate('en'));
    assert.equal(await page.locator('#appearanceLabel').textContent(), 'Appearance');
    console.log(`Offline theme rendering and system switch passed. Screenshots: ${output}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
