const keys = ["d", "f", "j", "k"];
const stage = document.getElementById("stage");
const overlay = document.getElementById("startOverlay");
const scoreEl = document.getElementById("score");
const comboEl = document.getElementById("combo");
const comboSideEl = document.getElementById("comboSide");
const accEl = document.getElementById("acc");
const bestEl = document.getElementById("best");
const hitCountEl = document.getElementById("hitCount");
const missCountEl = document.getElementById("missCount");
const progressBar = document.getElementById("progressBar");
const statusText = document.getElementById("statusText");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");
const musicBtn = document.getElementById("musicBtn");
const songTitleEl = document.getElementById("songTitle");
const songNameEl = document.getElementById("songName");
const songInfoEl = document.getElementById("songInfo");
const songButtonsEl = document.getElementById("songButtons");

let notes = [];
let running = false;
let paused = false;
let currentPractice = false;
let score = 0;
let combo = 0;
let maxCombo = 0;
let hits = 0;
let misses = 0;
let totalJudged = 0;
let startTime = 0;
let rafId = null;
let audioCtx = null;
let beatTimer = null;
let musicTimer = null;
let musicStep = 0;
let musicEnabled = localStorage.getItem("starline_music") !== "off";
let pauseStarted = 0;
let chart = [];
let nextChartIndex = 0;
let approachDuration = 1500;
let currentSongIndex = 0;
let best = 0;

const hitWindows = {
  perfect: 80,
  great: 140,
  good: 230
};

const songs = [
  {
    id: "neon_classroom",
    name: "Neon Classroom",
    info: "基础难度 · 中速节奏 · 适合熟悉玩法",
    duration: 45000,
    stepMs: 240,
    approach: { normal: 1500, practice: 1900 },
    chartSteps: {
      normal: [0, 2, 4, 6, 8, 10, 12, 14],
      practice: [0, 4, 8, 12]
    },
    melody: [
      392, 493.88, 587.33, 493.88,
      659.25, null, 587.33, 493.88,
      392, 329.63, 392, null,
      493.88, 587.33, 783.99, null
    ],
    bass: [
      196, null, null, null,
      246.94, null, null, null,
      164.81, null, null, null,
      220, null, null, null
    ],
    harmony: [
      [392, 493.88],
      [392, 587.33],
      [329.63, 493.88],
      [349.23, 440]
    ]
  },
  {
    id: "starlight_run",
    name: "Starlight Run",
    info: "进阶难度 · 快速旋律 · 连续音符更多",
    duration: 45000,
    stepMs: 210,
    approach: { normal: 1350, practice: 1750 },
    chartSteps: {
      normal: [0, 2, 3, 5, 7, 8, 10, 12, 13, 15],
      practice: [0, 3, 7, 10, 13]
    },
    melody: [
      440, 493.88, 554.37, 659.25,
      739.99, 659.25, 554.37, 493.88,
      440, null, 493.88, 587.33,
      659.25, 783.99, 739.99, null
    ],
    bass: [
      220, null, null, null,
      277.18, null, null, null,
      246.94, null, null, null,
      293.66, null, null, null
    ],
    harmony: [
      [440, 554.37],
      [493.88, 659.25],
      [369.99, 493.88],
      [392, 587.33]
    ]
  },
  {
    id: "moon_circuit",
    name: "Moon Circuit",
    info: "舒缓难度 · 慢速节拍 · 判定更容易观察",
    duration: 45000,
    stepMs: 285,
    approach: { normal: 1750, practice: 2100 },
    chartSteps: {
      normal: [0, 4, 6, 8, 12, 14],
      practice: [0, 8, 12]
    },
    melody: [
      329.63, null, 392, null,
      493.88, null, 440, null,
      392, null, 329.63, null,
      293.66, 329.63, 392, null
    ],
    bass: [
      164.81, null, null, null,
      196, null, null, null,
      146.83, null, null, null,
      164.81, null, null, null
    ],
    harmony: [
      [329.63, 392],
      [293.66, 440],
      [246.94, 392],
      [261.63, 329.63]
    ]
  },
  {
    id: "comet_drive",
    name: "Comet Drive",
    info: "挑战难度 · 高速节拍 · 适合追求连击",
    duration: 45000,
    stepMs: 190,
    approach: { normal: 1250, practice: 1650 },
    chartSteps: {
      normal: [0, 1, 3, 4, 6, 8, 9, 11, 12, 14, 15],
      practice: [0, 3, 6, 9, 12, 15]
    },
    melody: [
      523.25, 659.25, 783.99, 659.25,
      587.33, 659.25, 880, null,
      783.99, 659.25, 587.33, 493.88,
      523.25, 587.33, 659.25, null
    ],
    bass: [
      261.63, null, null, null,
      293.66, null, null, null,
      246.94, null, null, null,
      261.63, null, null, null
    ],
    harmony: [
      [523.25, 659.25],
      [587.33, 783.99],
      [493.88, 659.25],
      [523.25, 783.99]
    ]
  }
];

currentSongIndex = Number(localStorage.getItem("starline_song") || 0);
if (!songs[currentSongIndex]) currentSongIndex = 0;

function currentSong() {
  return songs[currentSongIndex];
}

function bestKey() {
  return "starline_best_" + currentSong().id;
}

function updateBestDisplay() {
  best = Number(localStorage.getItem(bestKey()) || 0);
  bestEl.textContent = best;
}

function updateSongDisplay() {
  const song = currentSong();
  songNameEl.textContent = song.name;
  songInfoEl.textContent = song.info;
  songTitleEl.textContent = "♪ " + song.name;
  updateBestDisplay();
  document.querySelectorAll(".song-option").forEach((button, index) => {
    button.classList.toggle("active", index === currentSongIndex);
  });
}

function renderSongButtons() {
  songButtonsEl.innerHTML = "";
  songs.forEach((song, index) => {
    const button = document.createElement("button");
    button.className = "song-option";
    button.type = "button";
    button.textContent = `${index + 1}. ${song.name}`;
    button.addEventListener("click", () => selectSong(index));
    songButtonsEl.appendChild(button);
  });
  updateSongDisplay();
}

function selectSong(index) {
  if (running || paused) return;
  currentSongIndex = (index + songs.length) % songs.length;
  localStorage.setItem("starline_song", String(currentSongIndex));
  updateSongDisplay();
  setStatus("已选择曲目：" + currentSong().name + " · Space / Enter 开始");
}

function changeSong(direction) {
  if (running || paused) return;
  selectSong(currentSongIndex + direction);
}

updateBestDisplay();

function setupAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass || audioCtx) return;
  audioCtx = new AudioContextClass();
}

function playTone(freq, durationSeconds = 0.08, type = "sine", gain = 0.04, delaySeconds = 0) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime + delaySeconds;
  const osc = audioCtx.createOscillator();
  const volume = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  volume.gain.setValueAtTime(0.0001, now);
  volume.gain.exponentialRampToValueAtTime(gain, now + 0.012);
  volume.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);
  osc.connect(volume).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + durationSeconds);
}

function beep(freq = 440, durationSeconds = 0.055, type = "sine", gain = 0.055) {
  playTone(freq, durationSeconds, type, gain);
}

function startBeat() {
  clearInterval(beatTimer);
  const song = currentSong();
  const beatFreqs = song.bass.filter(Boolean);
  let step = 0;
  beatTimer = setInterval(() => {
    if (!running || !audioCtx) return;
    beep(beatFreqs[step % beatFreqs.length], 0.045, "triangle", step % 4 === 0 ? 0.06 : 0.035);
    step++;
  }, song.stepMs * 2);
}

function playMusicStep() {
  if (!running || !audioCtx || !musicEnabled) return;
  const song = currentSong();
  const index = musicStep % song.melody.length;
  const melody = song.melody[index];
  const bass = song.bass[index];

  if (melody) playTone(melody, 0.18, "sine", 0.022);
  if (bass) playTone(bass, 0.26, "triangle", 0.018);
  if (index % 4 === 0) {
    const chord = song.harmony[Math.floor(index / 4) % song.harmony.length];
    chord.forEach((freq, offset) => playTone(freq, 0.32, "triangle", 0.012, offset * 0.018));
  }

  musicStep++;
}

function startMusic(reset = false) {
  clearInterval(musicTimer);
  if (reset) musicStep = 0;
  if (!musicEnabled) return;
  playMusicStep();
  musicTimer = setInterval(playMusicStep, currentSong().stepMs);
}

function stopAudioLoops() {
  clearInterval(beatTimer);
  clearInterval(musicTimer);
}

function accuracy() {
  return totalJudged ? Math.round((hits / totalJudged) * 100) : 100;
}

function rankFrom(resultScore, resultAccuracy) {
  if (resultAccuracy >= 95 && resultScore > 25000) return "S";
  if (resultAccuracy >= 85) return "A";
  if (resultAccuracy >= 70) return "B";
  return "C";
}

function setStatus(text) {
  statusText.textContent = text;
}

function updateActionButtons() {
  pauseBtn.disabled = !running && !paused;
  pauseBtn.textContent = paused ? "继续游戏（P）" : "暂停 / 继续（P）";
  musicBtn.textContent = musicEnabled ? "背景音乐：开（M）" : "背景音乐：关（M）";
  document.querySelectorAll(".song-option").forEach(button => {
    button.disabled = running || paused;
  });
}

function updateHUD() {
  scoreEl.textContent = score;
  comboEl.textContent = combo;
  comboSideEl.textContent = combo;
  accEl.textContent = accuracy() + "%";
  hitCountEl.textContent = hits;
  missCountEl.textContent = misses;
}

function laneFromPitch(freq, loopIndex, step) {
  if (freq <= 360) return loopIndex % 2 === 0 ? 0 : 1;
  if (freq <= 430) return 1;
  if (freq <= 540) return step % 4 === 0 ? 2 : 1;
  return step % 4 === 0 ? 3 : 2;
}

function buildChart(practice = false) {
  const song = currentSong();
  const steps = practice ? song.chartSteps.practice : song.chartSteps.normal;
  const loopMs = song.melody.length * song.stepMs;
  const firstPlayableTime = approachDuration + 220;
  const result = [];

  for (let loopStart = 0, loopIndex = 0; loopStart < song.duration - 600; loopStart += loopMs, loopIndex++) {
    steps.forEach(step => {
      const freq = song.melody[step];
      if (!freq) return;

      const targetTime = loopStart + step * song.stepMs;
      if (targetTime < firstPlayableTime || targetTime > song.duration - 500) return;

      result.push({
        lane: laneFromPitch(freq, loopIndex, step),
        targetTime,
        spawnTime: targetTime - approachDuration
      });
    });
  }

  return result.sort((a, b) => a.spawnTime - b.spawnTime);
}

function resetGame(practice = false) {
  notes.forEach(note => note.el.remove());
  document.querySelectorAll(".perfect-flash").forEach(el => el.remove());
  notes = [];
  running = false;
  paused = false;
  score = 0;
  combo = 0;
  maxCombo = 0;
  hits = 0;
  misses = 0;
  totalJudged = 0;
  approachDuration = practice ? currentSong().approach.practice : currentSong().approach.normal;
  chart = buildChart(practice);
  nextChartIndex = 0;
  progressBar.style.width = "0%";
  updateHUD();
  updateActionButtons();
}

function focusStage() {
  try {
    stage.focus({ preventScroll: true });
  } catch {
    stage.focus();
  }
}

function startGame(practice = false) {
  currentPractice = practice;
  setupAudio();
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();

  resetGame(practice);
  overlay.style.display = "none";
  running = true;
  paused = false;
  startTime = performance.now();

  startBeat();
  startMusic(true);
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
  setStatus((practice ? "练习模式" : "挑战模式") + "：" + currentSong().name + " · D F J K 击打 · P 暂停 · R 重开");
  updateActionButtons();
  focusStage();
}

function pauseGame() {
  if (!running || paused) return;
  running = false;
  paused = true;
  pauseStarted = performance.now();
  stopAudioLoops();
  cancelAnimationFrame(rafId);
  overlay.style.display = "grid";
  overlay.innerHTML = `
    <div class="overlay-card">
      <h2>游戏已暂停</h2>
      <p>按 P 或 Space 继续游戏，也可以按 R 重新开始本局、M 开关背景音乐。</p>
      <button class="big-button" onclick="resumeGame()">继续游戏</button>
      <button class="ghost-button" onclick="restartGame()">重新开始</button>
    </div>
  `;
  setStatus("已暂停 · P / Space 继续 · R 重开 · M 音乐");
  updateActionButtons();
}

function resumeGame() {
  if (!paused) return;
  const pauseDuration = performance.now() - pauseStarted;
  startTime += pauseDuration;
  running = true;
  paused = false;
  overlay.style.display = "none";
  startBeat();
  startMusic(false);
  rafId = requestAnimationFrame(loop);
  setStatus("继续游戏 · D F J K 击打 · P 暂停 · R 重开 · M 音乐");
  updateActionButtons();
  focusStage();
}

function togglePause() {
  if (paused) {
    resumeGame();
  } else if (running) {
    pauseGame();
  }
}

function restartGame() {
  startGame(currentPractice);
}

function toggleMusic() {
  musicEnabled = !musicEnabled;
  localStorage.setItem("starline_music", musicEnabled ? "on" : "off");
  if (!musicEnabled) {
    clearInterval(musicTimer);
    setStatus("背景音乐已关闭 · M 可重新开启");
  } else {
    setupAudio();
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    if (running) startMusic(false);
    setStatus("背景音乐已开启 · M 可关闭");
  }
  updateActionButtons();
}

function spawnNote(chartNote) {
  const lane = chartNote.lane;
  const laneEl = document.querySelector(`.lane[data-lane="${lane}"]`);
  const el = document.createElement("div");
  el.className = "note";
  el.style.top = "-42px";
  laneEl.appendChild(el);
  notes.push({
    lane,
    y: -42,
    el,
    hit: false,
    targetTime: chartNote.targetTime,
    spawnTime: chartNote.spawnTime
  });
}

function judgeY() {
  const lane = document.querySelector(".lane");
  const laneRect = lane.getBoundingClientRect();
  const judgeRect = document.querySelector(".judge-line").getBoundingClientRect();
  return judgeRect.top - laneRect.top - 16;
}

function showJudge(text, color) {
  const el = document.createElement("div");
  el.className = "perfect-flash";
  el.textContent = text;
  el.style.color = color;
  stage.appendChild(el);
  setTimeout(() => el.remove(), 600);
}

function setLaneActive(lane, active) {
  const keyEl = document.getElementById("key" + lane);
  const laneEl = document.querySelector(`.lane[data-lane="${lane}"]`);
  keyEl.classList.toggle("active", active);
  laneEl.classList.toggle("active", active);
}

function flashLane(lane) {
  const keyEl = document.getElementById("key" + lane);
  keyEl.classList.add("hit");
  setTimeout(() => keyEl.classList.remove("hit"), 110);
}

function recordMiss(playSound = true) {
  combo = 0;
  misses++;
  totalJudged++;
  showJudge("MISS", "#ff6b8a");
  if (playSound) beep(110, 0.06, "sawtooth", 0.035);
  updateHUD();
}

function handleInput(lane) {
  flashLane(lane);
  if (!running) return;

  const elapsed = performance.now() - startTime;
  const candidates = notes
    .filter(note => note.lane === lane && !note.hit)
    .map(note => ({ note, diff: Math.abs(elapsed - note.targetTime) }))
    .sort((a, b) => a.diff - b.diff);

  if (!candidates.length || candidates[0].diff > hitWindows.good) {
    recordMiss();
    return;
  }

  const { note, diff } = candidates[0];
  note.hit = true;
  note.el.remove();
  notes = notes.filter(item => item !== note);

  let add = 0;
  let label = "";
  let color = "";
  if (diff <= hitWindows.perfect) {
    add = 1000 + combo * 12;
    label = "PERFECT";
    color = "#fff2a8";
  } else if (diff <= hitWindows.great) {
    add = 650 + combo * 8;
    label = "GREAT";
    color = "#7af5ff";
  } else {
    add = 320 + combo * 4;
    label = "GOOD";
    color = "#d8a4ff";
  }

  score += add;
  combo++;
  maxCombo = Math.max(maxCombo, combo);
  hits++;
  totalJudged++;
  showJudge(label, color);
  beep([392, 493.88, 587.33, 783.99][lane], 0.055, "sine", 0.045);
  updateHUD();
}

function endGame() {
  running = false;
  paused = false;
  stopAudioLoops();
  cancelAnimationFrame(rafId);

  if (score > best) {
    best = score;
    localStorage.setItem(bestKey(), String(best));
    bestEl.textContent = best;
  }

  const finalAccuracy = accuracy();
  const rank = rankFrom(score, finalAccuracy);
  overlay.style.display = "grid";
  overlay.innerHTML = `
    <div class="overlay-card">
      <div class="rank gradient">${rank}</div>
      <h2>演奏结束</h2>
      <p>得分：<b>${score}</b>　准确率：<b>${finalAccuracy}%</b>　最高连击：<b>${maxCombo}</b></p>
      <p>命中：<b>${hits}</b>　失误：<b>${misses}</b>　最高分：<b>${best}</b></p>
      <button class="big-button" onclick="startGame(false)">再玩一次</button>
      <button class="ghost-button" onclick="startGame(true)">练习模式</button>
    </div>
  `;
  setStatus("演奏结束 · Space 再玩一次 · R 重开 · M 音乐");
  updateActionButtons();
}

function loop(now) {
  if (!running) return;

  const elapsed = now - startTime;
  progressBar.style.width = Math.min(100, elapsed / currentSong().duration * 100) + "%";

  if (elapsed >= currentSong().duration) {
    endGame();
    return;
  }

  while (nextChartIndex < chart.length && chart[nextChartIndex].spawnTime <= elapsed) {
    spawnNote(chart[nextChartIndex]);
    nextChartIndex++;
  }

  const targetY = judgeY();

  notes.forEach(note => {
    const visualProgress = (elapsed - note.spawnTime) / approachDuration;
    const startY = -42;
    if (visualProgress <= 1) {
      note.y = startY + (targetY - startY) * visualProgress;
    } else {
      note.y = targetY + (elapsed - note.targetTime) * 0.42;
    }
    note.el.style.top = note.y + "px";
  });

  const missed = notes.filter(note => elapsed - note.targetTime > hitWindows.good && !note.hit);
  if (missed.length) {
    missed.forEach(note => {
      note.hit = true;
      note.el.remove();
      recordMiss(false);
    });
    notes = notes.filter(note => !missed.includes(note));
  }

  rafId = requestAnimationFrame(loop);
}

document.getElementById("startBtn").addEventListener("click", () => startGame(false));
document.getElementById("practiceBtn").addEventListener("click", () => startGame(true));
pauseBtn.addEventListener("click", togglePause);
restartBtn.addEventListener("click", restartGame);
musicBtn.addEventListener("click", toggleMusic);

for (let i = 0; i < keys.length; i++) {
  document.getElementById("key" + i).addEventListener("mousedown", () => setLaneActive(i, true));
  document.getElementById("key" + i).addEventListener("mouseup", () => setLaneActive(i, false));
  document.getElementById("key" + i).addEventListener("mouseleave", () => setLaneActive(i, false));
  document.getElementById("key" + i).addEventListener("click", () => handleInput(i));
}

document.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();
  const lane = keys.indexOf(key);

  if (lane !== -1) {
    event.preventDefault();
    setLaneActive(lane, true);
    if (!event.repeat) handleInput(lane);
    return;
  }

  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    if (paused) {
      resumeGame();
    } else if (!running) {
      startGame(false);
    }
    return;
  }

  if (key === "p") {
    event.preventDefault();
    if (!event.repeat) togglePause();
    return;
  }

  if (key === "r") {
    event.preventDefault();
    if (!event.repeat) restartGame();
    return;
  }

  if (key === "m") {
    event.preventDefault();
    if (!event.repeat) toggleMusic();
    return;
  }

  if (!running && !paused && key >= "1" && key <= String(songs.length)) {
    event.preventDefault();
    selectSong(Number(key) - 1);
    return;
  }

  if (!running && !paused && event.key === "[") {
    event.preventDefault();
    changeSong(-1);
    return;
  }

  if (!running && !paused && event.key === "]") {
    event.preventDefault();
    changeSong(1);
  }
});

document.addEventListener("keyup", event => {
  const lane = keys.indexOf(event.key.toLowerCase());
  if (lane !== -1) setLaneActive(lane, false);
});

window.startGame = startGame;
window.resumeGame = resumeGame;
window.togglePause = togglePause;
window.restartGame = restartGame;
window.toggleMusic = toggleMusic;
window.selectSong = selectSong;
window.changeSong = changeSong;

renderSongButtons();
setStatus("Space / Enter 开始 · D F J K 击打 · P 暂停 · R 重开 · M 音乐 · [ ] 选曲");
updateHUD();
updateActionButtons();
