// Run against the static server: node tests/setup_save.cjs [base URL].
// All cloud traffic is disabled: test student answers never reach the collector.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.argv[2] || 'http://127.0.0.1:8000';
const RECORDS = 'digestiveLab.localRecords.v1';
const photo = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    headless: true, args: ['--no-sandbox'],
  });
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    await page.route('**/cloud-config.js*', route => route.fulfill({
      contentType: 'application/javascript', body: "window.VL1_CLOUD_CONFIG={endpoint:''};",
    }));
    for (const url of ['https://script.google.com/**', 'https://script.googleusercontent.com/**',
      'https://fonts.googleapis.com/**', 'https://fonts.gstatic.com/**']) await page.route(url, route => route.abort());
    await page.goto(base);
    await page.fill('#profileName', '共同儲存測試');
    await page.fill('#profileClass', 'S4-01');
    await page.fill('#profileEmail', 'setup-save@example.com');
    await page.click('#profileForm button');
    await page.fill('#initialObservation', '油在水的上方。');
    await page.click('[data-next="2"]');
    await page.selectOption('#hypothesisLiquid', 'X');
    await page.selectOption('#hypothesisOutcome', 'cloudy');
    await page.fill('#reason', '比較加入 X 前後的外觀。');
    for (const [group, value] of [['iv', '消化液組合'], ['dv', '混合物外觀'], ['cv', '反應溫度']])
      await page.click(`[data-group="${group}"][data-variable="${value}"]`);
    await page.check('#assumptionChoices input[value="time"]');
    await page.fill('#controlPlan', '加水作對照，和 X 組比較，保持時間和溫度相同。');

    assert.equal(await page.locator('#saveSetup').count(), 1);
    assert.equal(await page.locator('#saveTextSetup').count(), 0);
    assert.equal(await page.locator('.drawing-tools #saveSetup').count(), 0, 'The shared save button must be below both design inputs.');
    assert(await page.evaluate(() => Boolean(document.querySelector('#setupDescription')
      .compareDocumentPosition(document.querySelector('#saveSetup')) & Node.DOCUMENT_POSITION_FOLLOWING)));
    assert.equal(await page.locator('#saveSetup').innerText(), '儲存設計');

    async function draw(offset = 0) {
      await page.click('[data-tool="pencil"]');
      await page.locator('#setupCanvas').scrollIntoViewIfNeeded();
      const box = await page.locator('#setupCanvas').boundingBox();
      await page.mouse.move(box.x + 35 + offset, box.y + 35);
      await page.mouse.down();
      await page.mouse.move(box.x + 130 + offset, box.y + 95, { steps: 8 });
      await page.mouse.up();
      assert.equal(await page.evaluate(() => state.setupSaved), false);
    }
    async function saveExpected(method, description, hasImage) {
      await page.click('#saveSetup');
      const saved = await page.evaluate(key => {
        const row = JSON.parse(localStorage.getItem(key)).find(record => record.id === state.id);
        return { state: { saved: state.setupSaved, method: state.setupMethod, image: state.setupImage }, setup: row.phase2.setup };
      }, RECORDS);
      assert.equal(saved.state.saved, true);
      assert.equal(saved.state.method, method);
      assert.equal(saved.setup.saved, true);
      assert.equal(saved.setup.method, method);
      assert.equal(saved.setup.description, description);
      assert.equal(saved.setup.image, saved.state.image);
      if (hasImage) assert.match(saved.setup.image, /^data:image\/jpeg;base64,/);
      else assert.equal(saved.setup.image, '');
      return saved.setup;
    }
    async function switchLanguage(language) {
      await page.click('#languageSwitch');
      await page.waitForFunction(language => VL1Language.current === language, language);
    }

    // One shared action saves a real drawing and a separate written answer.
    const firstText = '對照、X、Y、XY 四個試管；每組加液總量相同。';
    await page.fill('#setupDescription', firstText);
    await draw();
    const originalSetup = await saveExpected('drawing', firstText, true);
    await page.click('[data-next="3"]');
    await page.waitForSelector('#phase-3.active');
    const frozen = await page.evaluate(() => structuredClone(state.initialDesign.setup));
    assert.deepEqual(frozen, originalSetup, 'The original design snapshot must preserve both parts.');
    await page.click('[data-back="2"]');

    // Editing either part requires a new save. Saving text keeps the image.
    const revisedText = '修訂設計：每組使用相同搖勻方式。';
    await page.fill('#setupDescription', revisedText);
    assert.equal(await page.evaluate(() => state.setupSaved), false);
    await page.click('[data-next="3"]');
    assert(await page.locator('#phase-2').evaluate(element => element.classList.contains('active')),
      'Unsaved text must not pass the design gate.');
    const writtenRevision = await saveExpected('drawing', revisedText, true);
    assert.equal(writtenRevision.image, originalSetup.image, 'Saving written changes erased the drawing.');
    await draw(40);
    const drawnRevision = await saveExpected('drawing', revisedText, true);
    assert.notEqual(drawnRevision.image, writtenRevision.image, 'The re-save did not capture the latest drawing.');
    assert.deepEqual(await page.evaluate(() => state.initialDesign.setup), frozen, 'Revisions changed the original evidence.');

    // Both language versions operate on the same saved design and live canvas.
    const beforeLanguage = await page.evaluate(() => ({
      saved: state.setupSaved, method: state.setupMethod, image: state.setupImage,
      text: document.querySelector('#setupDescription').value,
      canvas: document.querySelector('#setupCanvas').toDataURL(), initial: state.initialDesign,
    }));
    await switchLanguage('en');
    assert.equal(await page.locator('#saveSetup').innerText(), 'Save design');
    await switchLanguage('zh');
    assert.deepEqual(await page.evaluate(() => ({
      saved: state.setupSaved, method: state.setupMethod, image: state.setupImage,
      text: document.querySelector('#setupDescription').value,
      canvas: document.querySelector('#setupCanvas').toDataURL(), initial: state.initialDesign,
    })), beforeLanguage);

    // Clear affects the image only. The same button saves a text-only design.
    await page.click('#clearCanvas');
    assert.equal(await page.locator('#setupDescription').inputValue(), revisedText);
    assert.equal(await page.evaluate(() => state.setupSaved), false);
    await saveExpected('text', revisedText, false);
    await page.fill('#setupDescription', '   ');
    await page.click('#saveSetup');
    assert.equal(await page.evaluate(() => state.setupSaved), false, 'Empty canvas and whitespace text were accepted.');

    // Image-only and uploaded-photo + text alternatives use the same action.
    await draw();
    await saveExpected('drawing', '', true);
    const photoText = '相片中的四個裝置以相同條件比較。';
    await page.fill('#setupDescription', photoText);
    await page.setInputFiles('#setupPhoto', { name: 'setup.png', mimeType: 'image/png', buffer: photo });
    await page.waitForFunction(() => state.setupMethod === 'photo' && !state.setupSaved);
    await saveExpected('photo', photoText, true);

    await page.setViewportSize({ width: 320, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'The combined design card overflows on a phone.');
    assert(await page.locator('#saveSetup').isVisible());
    assert.equal(await page.locator('#saveSetup').count(), 1);

    // Existing submission lock must cover the shared button and canvas together.
    await page.evaluate(() => { state.submitted = true; applyLock(); });
    assert(await page.locator('#saveSetup').isDisabled());
    assert(await page.locator('#setupDescription').isDisabled());
    assert(await page.locator('#setupPhoto').isDisabled());
    const lockedCanvas = await page.evaluate(() => document.querySelector('#setupCanvas').toDataURL());
    await page.locator('#setupCanvas').scrollIntoViewIfNeeded();
    const box = await page.locator('#setupCanvas').boundingBox();
    await page.mouse.move(box.x + 20, box.y + 20); await page.mouse.down();
    await page.mouse.move(box.x + 100, box.y + 60, { steps: 4 }); await page.mouse.up();
    assert.equal(await page.evaluate(() => document.querySelector('#setupCanvas').toDataURL()), lockedCanvas);
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS: one design save button, combined drawing/text persistence and original snapshot, dirty gate, latest drawing re-save, language preservation, text-only/image-only/photo alternatives, empty rejection, phone layout and submission lock.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
