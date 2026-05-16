(function () {
  "use strict";

  var COLS = 24;
  var ROWS = 24;
  var CELL = 20;
  var TICK_MS = 110;
  var STORAGE_KEY = "neuro_snake_high";

  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  var overlay = document.getElementById("overlay");
  var scoreEl = document.getElementById("score");
  var highEl = document.getElementById("highScore");
  var lengthEl = document.getElementById("length");
  var statusEl = document.getElementById("statusText");

  var W = COLS * CELL;
  var H = ROWS * CELL;
  canvas.width = W;
  canvas.height = H;

  var DIR = {
    UP: { x: 0, y: -1 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 },
  };

  var state = {
    snake: [],
    dir: DIR.RIGHT,
    nextDir: DIR.RIGHT,
    food: { x: 0, y: 0 },
    score: 0,
    high: 0,
    running: false,
    paused: false,
    tick: 0,
    lastFrame: 0,
    gameOver: false,
  };

  function pad4(n) {
    var s = String(Math.floor(n));
    while (s.length < 4) s = "0" + s;
    return s;
  }

  function loadHigh() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return v ? parseInt(v, 10) || 0 : 0;
    } catch (e) {
      return 0;
    }
  }

  function saveHigh(n) {
    try {
      localStorage.setItem(STORAGE_KEY, String(n));
    } catch (e) {}
  }

  function randCell() {
    return {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  }

  function cellOccupied(x, y) {
    for (var i = 0; i < state.snake.length; i++) {
      if (state.snake[i].x === x && state.snake[i].y === y) return true;
    }
    return false;
  }

  function spawnFood() {
    var max = COLS * ROWS;
    var tries = 0;
    var p;
    do {
      p = randCell();
      tries++;
    } while (cellOccupied(p.x, p.y) && tries < max);
    state.food = p;
  }

  function resetGame() {
    var cx = Math.floor(COLS / 2);
    var cy = Math.floor(ROWS / 2);
    state.snake = [
      { x: cx, y: cy },
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy },
    ];
    state.dir = DIR.RIGHT;
    state.nextDir = DIR.RIGHT;
    state.score = 0;
    state.running = true;
    state.paused = false;
    state.gameOver = false;
    state.tick = 0;
    spawnFood();
    updateHud();
    setStatus("运行中");
    overlay.classList.add("is-hidden");
  }

  function updateHud() {
    scoreEl.textContent = pad4(state.score);
    highEl.textContent = pad4(state.high);
    lengthEl.textContent = String(state.snake.length);
  }

  function setStatus(t) {
    statusEl.textContent = t;
  }

  function showOverlay(kicker, title, hint) {
    overlay.classList.remove("is-hidden");
    var k = overlay.querySelector(".overlay__kicker");
    var ti = overlay.querySelector(".overlay__title");
    var h = overlay.querySelector(".overlay__hint");
    if (k) k.textContent = kicker;
    if (ti) ti.textContent = title;
    if (h) h.textContent = hint;
  }

  function opposite(a, b) {
    return a.x === -b.x && a.y === -b.y;
  }

  function setDir(d) {
    if (!state.running || state.gameOver) return;
    if (state.paused) return;
    if (!opposite(d, state.dir)) state.nextDir = d;
  }

  function keyMap(e) {
    var k = e.key;
    if (k === "ArrowUp" || k === "w" || k === "W") return DIR.UP;
    if (k === "ArrowDown" || k === "s" || k === "S") return DIR.DOWN;
    if (k === "ArrowLeft" || k === "a" || k === "A") return DIR.LEFT;
    if (k === "ArrowRight" || k === "d" || k === "D") return DIR.RIGHT;
    return null;
  }

  document.addEventListener("keydown", function (e) {
    var d = keyMap(e);
    if (d) {
      e.preventDefault();
      setDir(d);
      return;
    }
    if (e.code === "Space" || e.key === " ") {
      e.preventDefault();
      if (state.paused && state.running && !state.gameOver) {
        state.paused = false;
        setStatus("运行中");
        return;
      }
      if (!state.running || state.gameOver) {
        resetGame();
      }
      return;
    }
    if (e.key === "p" || e.key === "P") {
      e.preventDefault();
      if (!state.running || state.gameOver) return;
      state.paused = !state.paused;
      setStatus(state.paused ? "已暂停" : "运行中");
    }
  });

  function step() {
    state.dir = state.nextDir;
    var head = state.snake[0];
    var nx = head.x + state.dir.x;
    var ny = head.y + state.dir.y;

    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
      endGame();
      return;
    }
    for (var i = 0; i < state.snake.length; i++) {
      if (state.snake[i].x === nx && state.snake[i].y === ny) {
        endGame();
        return;
      }
    }

    state.snake.unshift({ x: nx, y: ny });

    if (nx === state.food.x && ny === state.food.y) {
      state.score += 10;
      if (state.score > state.high) {
        state.high = state.score;
        saveHigh(state.high);
      }
      spawnFood();
    } else {
      state.snake.pop();
    }
    updateHud();
  }

  function endGame() {
    state.running = false;
    state.gameOver = true;
    setStatus("游戏结束");
    showOverlay(
      "SIGNAL LOST",
      "按空格重连",
      "撞墙或咬到自己 · 再试一次"
    );
  }

  function drawGrid() {
    ctx.strokeStyle = "rgba(0, 245, 255, 0.06)";
    ctx.lineWidth = 1;
    for (var x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL + 0.5, 0);
      ctx.lineTo(x * CELL + 0.5, H);
      ctx.stroke();
    }
    for (var y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL + 0.5);
      ctx.lineTo(W, y * CELL + 0.5);
      ctx.stroke();
    }
  }

  function drawCell(x, y, fill, glow) {
    var px = x * CELL;
    var py = y * CELL;
    var pad = 1;
    if (glow) {
      ctx.shadowColor = glow;
      ctx.shadowBlur = 12;
    } else {
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = fill;
    ctx.fillRect(px + pad, py + pad, CELL - pad * 2, CELL - pad * 2);
    ctx.shadowBlur = 0;
  }

  function draw() {
    ctx.fillStyle = "#020508";
    ctx.fillRect(0, 0, W, H);
    drawGrid();

    var fx = state.food.x * CELL + CELL / 2;
    var fy = state.food.y * CELL + CELL / 2;
    ctx.beginPath();
    ctx.arc(fx, fy, CELL * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = "#ff2ea6";
    ctx.shadowColor = "rgba(255, 46, 166, 0.8)";
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowBlur = 0;

    for (var i = state.snake.length - 1; i >= 0; i--) {
      var seg = state.snake[i];
      var isHead = i === 0;
      var green = isHead ? "#39ff14" : "#00a84a";
      var glow = isHead ? "rgba(57, 255, 20, 0.9)" : "rgba(0, 200, 83, 0.4)";
      drawCell(seg.x, seg.y, green, glow);
    }

    if (state.paused && state.running && !state.gameOver) {
      ctx.fillStyle = "rgba(2, 5, 8, 0.55)";
      ctx.fillRect(0, 0, W, H);
      ctx.font = '700 18px "Orbitron", sans-serif';
      ctx.fillStyle = "rgba(0, 245, 255, 0.95)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("PAUSED", W / 2, H / 2);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    }
  }

  function loop(ts) {
    if (!state.lastFrame) state.lastFrame = ts;

    if (state.running && !state.paused && !state.gameOver) {
      state.tick += ts - state.lastFrame;
      while (state.tick >= TICK_MS) {
        state.tick -= TICK_MS;
        step();
        if (!state.running) break;
      }
    }

    state.lastFrame = ts;
    draw();
    requestAnimationFrame(loop);
  }

  state.high = loadHigh();
  highEl.textContent = pad4(state.high);
  updateHud();
  setStatus("待机");
  showOverlay("SYSTEM READY", "按空格开始", "方向键 / WASD 移动 · P 暂停");

  requestAnimationFrame(loop);
})();
