'use strict';

const bank = JSON.parse(document.getElementById('bank').textContent);
const pronunciations = JSON.parse(document.getElementById('pronunciations').textContent);
const byId = new Map(bank.map(question => [question.id, question]));
const bookOrder = new Map(bank.map((question, index) => [question.id, index]));
const el = id => document.getElementById(id);
const storageKey = 'medspell.progress.v1';

function today() {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')].join('-');
}

function normalize(text) {
  return text.normalize('NFKC').toLowerCase().replace(/[‐‑–—]/g, '-')
    .replace(/[’‘]/g, "'").trim().replace(/\s+/g, ' ');
}

function phrase(question, answer = question.answers[0]) {
  return question.prompt.replace('_', answer);
}

const phraseKey = new Map(bank.map(question => [question.id, normalize(phrase(question))]));

function candidates(scope, mastered) {
  const excluded = new Set(mastered.map(id => phraseKey.get(id)));
  return bank.filter(q => (!scope || q.unit === scope) && !excluded.has(phraseKey.get(q.id)))
    .map(q => q.id);
}

function shuffle(ids) {
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
}

function newQueue(mode, scope, mastered) {
  const ids = candidates(scope, mastered);
  if (mode === 'mix') shuffle(ids);
  return ids;
}

function fresh() {
  return { date: today(), mode: 'seq', scope: 0, goal: 20, done: 0, roundStart: 0,
    mastered: [], ids: candidates(0, []), pos: 0 };
}

function validNumber(value, min, max) {
  return Number.isSafeInteger(value) && value >= min && value <= max;
}

function loadProgress() {
  const seed = fresh();
  try {
    const old = JSON.parse(localStorage.getItem(storageKey));
    if (!old) return seed;
    const mastered = Array.isArray(old.mastered) ? [...new Set(old.mastered.filter(id => byId.has(id)))] : [];
    const scope = validNumber(old.scope, 0, 8) ? old.scope : seed.scope;
    const mode = old.mode === 'mix' ? 'mix' : 'seq';
    const available = candidates(scope, mastered);
    const allowed = new Set(available);
    const validQueue = Array.isArray(old.ids) && old.ids.length === available.length &&
      new Set(old.ids).size === available.length && old.ids.every(id => allowed.has(id));
    const done = validNumber(old.done, 0, Number.MAX_SAFE_INTEGER) ? old.done : 0;
    // Version 1.0 stored the number of extra questions unlocked after the daily goal.
    const baseline = old.roundStart ?? old.extra ?? 0;
    return { date: old.date, mode, scope, mastered, done,
      goal: validNumber(old.goal, 1, bank.length) ? old.goal : seed.goal,
      roundStart: validNumber(baseline, 0, done) ? baseline : 0,
      ids: validQueue ? old.ids : newQueue(mode, scope, mastered),
      pos: validQueue && validNumber(old.pos, 0, old.ids.length) ? old.pos : 0 };
  } catch { return seed; }
}

const s = loadProgress();
let storageOk = true;
let hints = 0;
let activeClip = null;

function stopPronunciation() {
  if (activeClip) {
    activeClip.onended = null;
    activeClip.onerror = null;
    activeClip.pause();
    activeClip = null;
  }
  el('listen').dataset.playing = 'false';
  el('listen').setAttribute('aria-label', '播放完整英文词组');
  el('voiceStatus').textContent = '';
}

async function playPronunciation() {
  if (el('card').hidden) return;
  stopPronunciation();
  const source = pronunciations[s.ids[s.pos]];
  let clip;
  function failed() {
    if (clip && clip !== activeClip) return;
    stopPronunciation();
    el('voiceStatus').textContent = '发音播放失败，请再点一次喇叭。';
  }
  try {
    if (!source) { failed(); return; }
    clip = new Audio(source);
    activeClip = clip;
    clip.onerror = failed;
    clip.onended = () => { if (clip === activeClip) stopPronunciation(); };
    el('listen').dataset.playing = 'true';
    el('listen').setAttribute('aria-label', '重新播放完整英文词组');
    await clip.play();
  } catch { failed(); }
}

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(s));
    storageOk = true;
  } catch { storageOk = false; }
}

function rollDay() {
  if (s.date === today()) return false;
  s.date = today();
  s.done = 0;
  s.roundStart = 0;
  save();
  return true;
}

function groupDone() { return s.done - s.roundStart; }

function draw(message = '') {
  stopPronunciation();
  rollDay();
  const question = byId.get(s.ids[s.pos]);
  const reachedGoal = groupDone() >= s.goal;
  el('card').hidden = !question || reachedGoal;
  el('finish').hidden = !el('card').hidden;
  const [, month, day] = s.date.split('-');
  el('date').textContent = Number(month) + '月' + Number(day) + '日';
  el('date').setAttribute('datetime', s.date);
  el('progress').textContent = String(groupDone());
  el('target').textContent = '/ ' + s.goal + ' 题';
  el('dayCount').textContent = '今日已答对 ' + s.done + ' 题';
  el('scoreline').setAttribute('aria-valuenow', String(Math.min(groupDone(), s.goal)));
  el('scoreline').setAttribute('aria-valuemax', String(s.goal));
  el('bar').style.width = Math.min(100, groupDone() / s.goal * 100) + '%';
  el('modeLabel').textContent = s.mode === 'seq' ? '顺序练习' : '乱序练习';
  el('notice').textContent = storageOk ? message : '当前环境无法保存进度，请使用已安装的应用。';
  el('feedback').textContent = '';
  el('word').setAttribute('aria-invalid', 'false');
  el('word').value = '';
  hints = 0;
  el('hint').textContent = '查看提示';
  el('goal').value = s.goal;
  el('mode').value = s.mode;
  el('scope').value = s.scope;
  if (question && !reachedGoal) {
    el('unit').textContent = 'UNIT ' + String(question.unit).padStart(2, '0') + ' · 第 ' + question.no + ' 题';
    const [before, after] = question.prompt.split('_');
    const blank = document.createElement('span');
    blank.className = 'blank';
    el('phrase').replaceChildren(document.createTextNode(before), blank, document.createTextNode(after));
    el('zh').textContent = question.zh;
  }
  if (el('card').hidden) {
    const empty = s.ids.length === 0;
    el('finishTitle').textContent = empty ? '这个范围的词都已斩过' : reachedGoal ? '本组目标已完成' : '所选范围已练完';
    el('finishText').textContent = empty ? '可以换个单元，或从已斩词库移回词汇。' :
      '今天共答对 ' + s.done + ' 题。可以继续练一组，也可以切换单元。';
    el('more').hidden = empty;
    el('more').textContent = '再练一组（' + Math.min(s.goal, question ? s.ids.length - s.pos : s.ids.length) + ' 题）';
  }
}

function renderLibrary() {
  const query = normalize(el('librarySearch').value);
  el('libraryCount').textContent = String(s.mastered.length);
  const rows = [];
  for (const id of [...s.mastered].reverse()) {
    const q = byId.get(id);
    const english = q.answers.map(answer => phrase(q, answer)).join(' / ');
    if (query && !normalize(english + ' ' + q.zh + ' Unit ' + q.unit).includes(query)) continue;
    const row = document.createElement('li');
    const description = document.createElement('div');
    const title = document.createElement('strong');
    const detail = document.createElement('small');
    title.textContent = english;
    detail.textContent = q.zh + ' · Unit ' + q.unit + ' 第 ' + q.no + ' 题';
    description.append(title, detail);
    const restore = document.createElement('button');
    restore.type = 'button';
    restore.className = 'quiet';
    restore.dataset.restore = id;
    restore.textContent = '移回练习';
    restore.onclick = () => restoreWord(id);
    row.append(description, restore);
    rows.push(row);
  }
  el('libraryList').replaceChildren(...rows);
  el('libraryEmpty').hidden = rows.length > 0;
  el('libraryEmpty').textContent = s.mastered.length ? '没有找到匹配的词汇。' : '斩过的词会保存在这里。';
}

function cutWord() {
  if (el('card').hidden) return;
  const id = s.ids[s.pos];
  const key = phraseKey.get(id);
  const keep = item => phraseKey.get(item) !== key;
  s.mastered.push(id);
  const prefix = s.ids.slice(0, s.pos).filter(keep);
  s.ids = prefix.concat(s.ids.slice(s.pos).filter(keep));
  s.pos = prefix.length;
  save();
  renderLibrary();
  draw('已斩：' + phrase(byId.get(id)) + '。可在已斩词库移回。');
}

function restoreWord(id) {
  if (!s.mastered.includes(id)) return;
  s.mastered = s.mastered.filter(item => item !== id);
  const present = new Set(s.ids);
  const added = candidates(s.scope, s.mastered).filter(item => !present.has(item));
  const remaining = s.ids.slice(s.pos);
  if (s.mode === 'seq') {
    remaining.push(...added);
    remaining.sort((a, b) => bookOrder.get(a) - bookOrder.get(b));
  } else {
    for (const item of added) remaining.splice(Math.floor(Math.random() * (remaining.length + 1)), 0, item);
  }
  s.ids = s.ids.slice(0, s.pos).concat(remaining);
  save();
  renderLibrary();
  draw('已移回练习：' + phrase(byId.get(id)));
}

function settings(startOver) {
  const goal = Number(el('goal').value);
  const scope = Number(el('scope').value);
  const mode = el('mode').value;
  if (!validNumber(goal, 1, bank.length)) {
    el('goal').reportValidity();
    el('goal').focus();
    return;
  }
  rollDay();
  if (startOver || scope !== s.scope || mode !== s.mode) {
    s.roundStart = s.done;
    s.ids = newQueue(mode, scope, s.mastered);
    s.pos = 0;
  }
  s.goal = goal;
  s.scope = scope;
  s.mode = mode;
  save();
  el('settings').open = false;
  draw(startOver ? '新一组已开始。' : '已保存练习设置。');
  el('card').scrollIntoView?.({ block: 'nearest' });
}

el('form').onsubmit = event => {
  event.preventDefault();
  rollDay();
  const q = byId.get(s.ids[s.pos]);
  if (!q || groupDone() >= s.goal) { draw(); return; }
  const value = normalize(el('word').value);
  if (!value || !q.answers.some(answer => normalize(answer) === value)) {
    el('word').setAttribute('aria-invalid', 'true');
    el('feedback').className = 'msg err';
    el('feedback').textContent = value ? '再试一次，留意拼写和词形。' : '先写下你的答案。';
    el('word').focus();
    return;
  }
  s.done++;
  s.pos++;
  save();
  draw('✓ 上一题答对了：' + phrase(q));
  if (!el('card').hidden) el('word').focus();
};
el('hint').onclick = () => {
  const answer = byId.get(s.ids[s.pos]).answers[0];
  el('feedback').className = 'msg';
  el('feedback').textContent = ++hints === 1 ? '首字母 ' + answer[0] + '，共 ' +
    answer.replace(/\s/g, '').length + ' 个字符。' : '参考答案：' + answer;
  el('hint').textContent = '查看答案';
};
el('ban').onclick = cutWord;
el('listen').onclick = playPronunciation;
el('word').oninput = () => {
  if (el('feedback').className === 'msg err') {
    el('word').setAttribute('aria-invalid', 'false');
    el('feedback').textContent = '';
    el('feedback').className = 'msg';
  }
};
el('librarySearch').oninput = renderLibrary;
function openSettings() {
  el('settings').open = true;
  el('settings').scrollIntoView?.({ block: 'start' });
}
el('clearRound').onclick = openSettings;
el('clearFinished').onclick = openSettings;
el('apply').onclick = () => settings(false);
el('newRound').onclick = () => settings(true);
el('more').onclick = () => {
  rollDay();
  s.roundStart = s.done;
  if (s.pos >= s.ids.length) {
    s.ids = newQueue(s.mode, s.scope, s.mastered);
    s.pos = 0;
  }
  save();
  draw();
};
for (let unit = 1; unit <= 8; unit++) {
  el('scope').add(new Option('Unit ' + unit + ' · ' + candidates(unit, []).length + ' 题', unit));
}
el('goal').max = bank.length;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopPronunciation();
  else if (rollDay()) draw();
});
setInterval(() => { if (rollDay()) draw(); }, 30000);
rollDay();
save();
renderLibrary();
draw();
