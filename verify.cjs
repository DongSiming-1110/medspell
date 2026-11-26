const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'harmonyos', 'entry', 'src', 'main', 'resources', 'rawfile', 'index.html'), 'utf8');
const blocks = Object.fromEntries([...source.matchAll(/<script(?: id="([^"]+)" type="application\/json")?>([\s\S]*?)<\/script>/g)]
  .map(([, id, body]) => [id || 'practice', body]));
const {bank: bankText, pronunciations: audioText, practice: script} = blocks;
const bank = JSON.parse(bankText);
const audio = JSON.parse(audioText);
const questions = new Map(bank.map(q => [q.id, q]));
const storageKey = 'medspell.progress.v1';

class Element {
  constructor() {
    this.children = [];
    this.value = '';
    this.style = {};
    this.dataset = {};
    this.hidden = false;
    this.open = false;
  }

  get textContent() {
    return this.children.map(child => typeof child === 'string' ? child : child.textContent).join('');
  }

  set textContent(value) { this.children = [String(value)]; }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.append(child); return child; }
  replaceChildren(...children) { this.children = children; }
  add(option) { this.append(option); }
  focus() {}
  scrollIntoView() {}
  reportValidity() { return true; }
  setAttribute(name, value) { this[name] = String(value); }
}

function boot(storage = new Map(), Audio) {
  const elements = new Map();
  for (const match of source.matchAll(/<[a-z][^<>]*\sid="([^"]+)"[^<>]*>/gi)) {
    const element = new Element();
    element.hidden = /\shidden(?:\s|>)/.test(match[0]);
    elements.set(match[1], element);
  }
  const el = id => {
    assert.ok(elements.has(id), 'Missing HTML element #' + id);
    return elements.get(id);
  };
  el('bank').textContent = bankText;
  el('pronunciations').textContent = audioText;
  const context = vm.createContext({
    Audio,
    document: {
      getElementById: el,
      createElement: () => new Element(),
      createTextNode: text => text,
      createDocumentFragment: () => new Element(),
      addEventListener() {}
    },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value))
    },
    Option: class extends Element {
      constructor(text, value) { super(); this.textContent = text; this.value = String(value); }
    },
    setInterval() {}
  });
  vm.runInContext(script, context, {filename: 'medspell-page.js'});

  const state = () => JSON.parse(storage.get(storageKey));
  const current = () => {
    const {ids, pos} = state();
    return questions.get(ids[pos]);
  };
  function click(id) { return el(id).onclick({target: el(id), preventDefault() {}}); }
  function submit(value) {
    assert.equal(el('card').hidden, false, 'Cannot answer a hidden practice card');
    el('word').value = value;
    el('form').onsubmit({preventDefault() {}});
  }
  function settings(goal, scope, mode, button = 'apply') {
    el('goal').value = String(goal);
    el('scope').value = String(scope);
    el('mode').value = mode;
    click(button);
  }
  function search(query) {
    el('library').open = true;
    el('library').ontoggle?.({target: el('library')});
    el('librarySearch').value = query;
    el('librarySearch').oninput({target: el('librarySearch')});
    return el('libraryList').textContent;
  }
  function restore(id) {
    function find(nodes) {
      for (const node of nodes) {
        if (node.dataset?.restore === id) return node;
        const button = find(node.children || []);
        if (button) return button;
      }
    }
    const button = find(el('libraryList').children);
    assert.ok(button, 'No restore action for ' + id);
    button.onclick({target: button, preventDefault() {}});
  }
  return {el, state, current, click, submit, settings, search, restore, storage,
    correct: () => submit(current().answers[0])};
}

function completedBlock(app, count) {
  for (let i = 0; i < count; i++) {
    assert.equal(app.el('card').hidden, false, 'Expected another question at index ' + i);
    app.correct();
  }
  assert.equal(app.el('finish').hidden, false);
  assert.equal(app.el('card').hidden, true);
}

function seedLegacy(pos, extra = 0) {
  const today = boot().state().date;
  const legacy = {
    mode: 'seq', scope: 0, goal: 30, date: today, done: pos, extra,
    ids: bank.map(q => q.id), pos
  };
  return new Map([[storageKey, JSON.stringify(legacy)]]);
}

assert.equal(bank.length, 248);
assert.deepEqual(Array.from({length: 8}, (_, i) => bank.filter(q => q.unit === i + 1).length),
  [38, 28, 44, 36, 19, 25, 30, 28]);
assert.ok(bank.every(q => q.answers.length && q.prompt.split('_').length === 2));
assert.deepEqual(Object.keys(audio).sort(), bank.map(q => q.id).sort());
for (const q of bank) assert.ok(/^data:audio\/mpeg;base64,[A-Za-z0-9+/]+=*$/.test(audio[q.id]), 'No embedded MP3 for ' + q.id);
assert.equal(bank[0].prompt.replace('_', bank[0].answers[0]), 'neuron overload');

{
  const app = boot(seedLegacy(30));
  assert.equal(app.el('card').hidden, true);
  assert.equal(app.state().done, 30);
  app.click('more');
  assert.equal(app.current().id, bank[30].id);
  completedBlock(app, 30);
  assert.equal(app.state().done, 60);

  app.click('clearFinished');
  assert.equal(app.el('settings').open, true);
  app.settings(7, 2, 'seq', 'newRound');
  assert.equal(app.current().id, '2-1');
  assert.equal(app.state().done, 60);
  app.correct();
  const resumed = boot(app.storage);
  assert.equal(resumed.current().id, '2-2');
  assert.equal(resumed.state().done, 61);
  completedBlock(resumed, 6);

  resumed.settings(5, 3, 'seq');
  assert.equal(resumed.current().id, '3-1');
  assert.equal(resumed.el('card').hidden, false);
  completedBlock(resumed, 5);
  assert.equal(resumed.state().done, 72);
}

{
  const app = boot(seedLegacy(4));
  assert.equal(app.current().id, '1-5');
  app.submit('incorrect spelling');
  assert.equal(app.current().id, '1-5');
  assert.equal(app.el('word')['aria-invalid'], 'true');
  app.el('word').oninput();
  assert.equal(app.el('word')['aria-invalid'], 'false');
  app.submit('  ' + app.current().answers[0].toUpperCase() + '  ');
  assert.equal(app.current().id, '1-6');
  assert.equal(app.el('progress').textContent, '5');
  assert.equal(app.el('dayCount').textContent, '今日已答对 5 题');
  app.click('ban');
  assert.equal(app.state().done, 5);
  assert.equal(app.current().id, '1-7');
  const restarted = boot(app.storage);
  assert.equal(restarted.current().id, '1-7');
  assert.match(restarted.search('smear'), /PAP smear/i);
  assert.match(restarted.search('涂片'), /PAP smear/i);
  assert.doesNotMatch(restarted.search('zzzzzz'), /PAP smear/i);

  restarted.settings(248, 6, 'mix');
  assert.ok(!restarted.state().ids.includes('6-19'), 'Same expression in another unit must be excluded');
  assert.equal(new Set(restarted.state().ids).size, 24);
  assert.ok(restarted.state().ids.every(id => questions.get(id).unit === 6));
  restarted.settings(248, 0, 'mix');
  assert.equal(new Set(restarted.state().ids).size, 246);
  assert.ok(!restarted.state().ids.includes('1-6'));
  const yesterday = restarted.state();
  const currentId = restarted.current().id;
  yesterday.date = '2001-01-01';
  restarted.storage.set(storageKey, JSON.stringify(yesterday));
  const nextDay = boot(restarted.storage);
  assert.equal(nextDay.state().done, 0);
  assert.equal(nextDay.current().id, currentId);
  assert.match(nextDay.search('smear'), /PAP smear/i);
  nextDay.restore('1-6');
  assert.doesNotMatch(nextDay.search('smear'), /PAP smear/i);
  nextDay.settings(248, 0, 'seq', 'newRound');
  assert.equal(new Set(nextDay.state().ids).size, 248);
}

{
  const app = boot();
  app.settings(30, 5, 'seq');
  for (let i = 1; i <= 19; i++) {
    assert.equal(app.current().id, '5-' + i);
    app.click('ban');
  }
  assert.equal(app.el('card').hidden, true);
  assert.equal(app.state().done, 0);
  const resumed = boot(app.storage);
  assert.equal(resumed.el('card').hidden, true);
  resumed.search('');
  resumed.restore('5-1');
  resumed.settings(30, 5, 'seq', 'newRound');
  assert.equal(resumed.current().id, '5-1');
  completedBlock(resumed, 1);
  resumed.click('more');
  assert.equal(resumed.current().id, '5-1');
  assert.equal(resumed.el('card').hidden, false);
}

{
  // Old versions unlocked one additional answer per tap after the daily goal.
  const app = boot(seedLegacy(32, 3));
  assert.equal(app.current().id, bank[32].id);
  completedBlock(app, 1);
  assert.equal(app.state().done, 33);
}

{
  const app = boot();
  app.settings(30, 1, 'seq');
  app.click('ban');
  app.correct();
  app.correct();
  assert.equal(app.state().done, 2);
  const previous = app.current().id;
  app.click('clearRound');
  assert.equal(app.current().id, previous, 'Opening the picker alone must preserve progress');
  app.settings(3, 1, 'seq', 'newRound');
  assert.equal(app.current().id, '1-2');
  completedBlock(app, 3);
  assert.equal(app.state().done, 5);
  assert.match(app.search('overload'), /neuron overload/i);
}
async function checkPlayback() {
  const clips = [];
  class TestAudio {
    constructor(src) { this.src = src; clips.push(this); }
    play() { return new Promise((resolve, reject) => { this.resolve = resolve; this.reject = reject; }); }
    pause() { this.paused = true; }
  }
  const app = boot(new Map(), TestAudio);
  const initial = app.state();
  const first = app.click('listen');
  assert.ok(clips[0].src === audio['1-1']);
  const replay = app.click('listen');
  assert.equal(clips[0].paused, true);
  assert.ok(clips[1].src === audio['1-1']);
  clips[0].reject(new Error('Superseded'));
  await first;
  assert.equal(app.el('voiceStatus').textContent, '');
  assert.equal(app.el('listen').dataset.playing, 'true');
  clips[1].resolve();
  await replay;
  assert.deepEqual(app.state(), initial);
  app.correct();
  assert.equal(clips[1].paused, true);
  assert.equal(app.el('listen').dataset.playing, 'false');
  const next = app.click('listen');
  assert.ok(clips[2].src === audio['1-2']);
  clips[2].reject(new Error('Decode failed'));
  await next;
  assert.match(app.el('voiceStatus').textContent, /播放失败/);
  const retry = app.click('listen');
  clips[3].resolve();
  await retry;
  clips[3].onended();
  assert.equal(app.el('listen').dataset.playing, 'false');
  assert.equal(app.el('voiceStatus').textContent, '');
  assert.equal(app.current().id, '1-2');
}

checkPlayback().then(() => console.log('PASS: 248 offline pronunciations, playback/replay and error recovery; 8 units, legacy upgrade, spelling, full study blocks, switching units, persistent progress, mastered library, search, restoration, empty unit and day rollover.'))
  .catch(error => { console.error(error); process.exitCode = 1; });
