import { haptic, initTelegram, shareScore } from "./telegram.js";

const { isTelegram } = initTelegram();

const canvas = document.getElementById("tetris");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const linesEl = document.getElementById("lines");
const levelEl = document.getElementById("level");
const restartBtn = document.getElementById("restart");
const pauseBtn = document.getElementById("pause");
const shareBtn = document.getElementById("share");
const touchControls = document.querySelector(".touch-controls");

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const BASE_DROP_MS = 800;
const MIN_DROP_MS = 80;

ctx.scale(BLOCK, BLOCK);

const SHAPES = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [2, 0, 0],
    [2, 2, 2],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 3],
    [3, 3, 3],
    [0, 0, 0],
  ],
  O: [
    [4, 4],
    [4, 4],
  ],
  S: [
    [0, 5, 5],
    [5, 5, 0],
    [0, 0, 0],
  ],
  T: [
    [0, 6, 0],
    [6, 6, 6],
    [0, 0, 0],
  ],
  Z: [
    [7, 7, 0],
    [0, 7, 7],
    [0, 0, 0],
  ],
};

const COLORS = [
  "#000000",
  "#00d8ff",
  "#2f6fff",
  "#ff8b2c",
  "#ffd93d",
  "#50e85d",
  "#ad62ff",
  "#ff4f7b",
];

let board = createBoard(COLS, ROWS);
let player = createPlayer();
let score = 0;
let totalLines = 0;
let level = 1;
let dropInterval = BASE_DROP_MS;
let dropCounter = 0;
let lastTime = 0;
let paused = false;
let gameOver = false;
let animationId = 0;

function createBoard(width, height) {
  return Array.from({ length: height }, () => Array(width).fill(0));
}

function createPlayer() {
  return {
    pos: { x: 0, y: 0 },
    matrix: null,
  };
}

function drawCell(x, y, value, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = COLORS[value];
  ctx.fillRect(x, y, 1, 1);

  ctx.strokeStyle = "rgba(8, 10, 18, 0.35)";
  ctx.lineWidth = 0.04;
  ctx.strokeRect(x + 0.02, y + 0.02, 0.96, 0.96);
  ctx.globalAlpha = 1;
}

function drawBoard() {
  ctx.fillStyle = "#060812";
  ctx.fillRect(0, 0, COLS, ROWS);

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const value = board[y][x];
      if (value !== 0) {
        drawCell(x, y, value);
      }
    }
  }
}

function drawGhost() {
  if (!player.matrix || gameOver) {
    return;
  }

  const ghostPos = { ...player.pos };
  while (!collides(board, player.matrix, { x: ghostPos.x, y: ghostPos.y + 1 })) {
    ghostPos.y += 1;
  }

  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        drawCell(ghostPos.x + x, ghostPos.y + y, value, 0.2);
      }
    });
  });
}

function drawPiece() {
  if (!player.matrix || gameOver) {
    return;
  }

  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        drawCell(player.pos.x + x, player.pos.y + y, value);
      }
    });
  });
}

function drawOverlay(text, subtext = "") {
  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = "#05070f";
  ctx.fillRect(0, 0, COLS, ROWS);
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#eef3ff";
  ctx.font = "0.9px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, COLS / 2, ROWS / 2);

  if (subtext) {
    ctx.fillStyle = "#b4bfdc";
    ctx.font = "0.45px sans-serif";
    ctx.fillText(subtext, COLS / 2, ROWS / 2 + 0.9);
  }
  ctx.restore();
}

function draw() {
  drawBoard();
  drawGhost();
  drawPiece();

  if (paused && !gameOver) {
    drawOverlay("Paused", isTelegram ? "Tap Pause to continue" : "Press P to continue");
  }

  if (gameOver) {
    drawOverlay("Game Over", isTelegram ? "Tap Restart" : "Press R to restart");
  }
}

function merge(boardRef, piece, pos) {
  piece.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        boardRef[y + pos.y][x + pos.x] = value;
      }
    });
  });
}

function collides(boardRef, piece, pos) {
  for (let y = 0; y < piece.length; y += 1) {
    for (let x = 0; x < piece[y].length; x += 1) {
      if (piece[y][x] === 0) {
        continue;
      }

      const boardY = y + pos.y;
      const boardX = x + pos.x;

      if (
        boardY < 0 ||
        boardY >= ROWS ||
        boardX < 0 ||
        boardX >= COLS ||
        boardRef[boardY][boardX] !== 0
      ) {
        return true;
      }
    }
  }
  return false;
}

function rotate(matrix, direction) {
  const transposed = matrix[0].map((_, index) => matrix.map((row) => row[index]));
  if (direction > 0) {
    return transposed.map((row) => row.reverse());
  }
  return transposed.reverse();
}

function rotatePlayer(direction) {
  if (!player.matrix || paused || gameOver) {
    return;
  }

  const rotated = rotate(player.matrix, direction);
  const originalX = player.pos.x;
  let offset = 1;
  player.matrix = rotated;

  while (collides(board, player.matrix, player.pos)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));

    if (Math.abs(offset) > player.matrix[0].length) {
      player.matrix = rotate(player.matrix, -direction);
      player.pos.x = originalX;
      return;
    }
  }
}

function clearLines() {
  let linesCleared = 0;

  outer: for (let y = ROWS - 1; y >= 0; y -= 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (board[y][x] === 0) {
        continue outer;
      }
    }

    const removedRow = board.splice(y, 1)[0].fill(0);
    board.unshift(removedRow);
    linesCleared += 1;
    y += 1;
  }

  if (linesCleared > 0) {
    const pointsByLines = [0, 100, 300, 500, 800];
    score += pointsByLines[linesCleared] * level;
    totalLines += linesCleared;
    level = Math.floor(totalLines / 10) + 1;
    dropInterval = Math.max(MIN_DROP_MS, BASE_DROP_MS - (level - 1) * 60);
    updateHud();
  }
}

function randomPiece() {
  const keys = Object.keys(SHAPES);
  const pick = keys[Math.floor(Math.random() * keys.length)];
  return SHAPES[pick].map((row) => [...row]);
}

function spawnPiece() {
  player.matrix = randomPiece();
  player.pos.y = 0;
  player.pos.x = Math.floor((COLS - player.matrix[0].length) / 2);

  if (collides(board, player.matrix, player.pos)) {
    gameOver = true;
  }
}

function lockPiece() {
  merge(board, player.matrix, player.pos);
  clearLines();
  spawnPiece();
}

function dropPlayer(soft = false) {
  if (!player.matrix || paused || gameOver) {
    return;
  }

  player.pos.y += 1;
  if (collides(board, player.matrix, player.pos)) {
    player.pos.y -= 1;
    lockPiece();
    return;
  }

  if (soft) {
    score += 1;
    updateHud();
  }
}

function hardDrop() {
  if (!player.matrix || paused || gameOver) {
    return;
  }

  let distance = 0;
  while (!collides(board, player.matrix, { x: player.pos.x, y: player.pos.y + 1 })) {
    player.pos.y += 1;
    distance += 1;
  }

  score += distance * 2;
  updateHud();
  lockPiece();
}

function movePlayer(direction) {
  if (!player.matrix || paused || gameOver) {
    return;
  }

  player.pos.x += direction;
  if (collides(board, player.matrix, player.pos)) {
    player.pos.x -= direction;
  }
}

function updateHud() {
  scoreEl.textContent = String(score);
  linesEl.textContent = String(totalLines);
  levelEl.textContent = String(level);
}

function resetGame() {
  board = createBoard(COLS, ROWS);
  player = createPlayer();
  score = 0;
  totalLines = 0;
  level = 1;
  dropInterval = BASE_DROP_MS;
  dropCounter = 0;
  paused = false;
  gameOver = false;
  lastTime = 0;
  updateHud();
  spawnPiece();
}

function togglePause() {
  if (gameOver) {
    return;
  }
  paused = !paused;
  pauseBtn.textContent = paused ? "Resume" : "Pause";
  haptic("light");
}

function update(time = 0) {
  const delta = time - lastTime;
  lastTime = time;

  if (!paused && !gameOver) {
    dropCounter += delta;
    if (dropCounter >= dropInterval) {
      dropPlayer(false);
      dropCounter = 0;
    }
  }

  draw();
  animationId = requestAnimationFrame(update);
}

document.addEventListener("keydown", (event) => {
  if (event.repeat) {
    return;
  }

  switch (event.code) {
    case "ArrowLeft":
      movePlayer(-1);
      break;
    case "ArrowRight":
      movePlayer(1);
      break;
    case "ArrowDown":
      dropPlayer(true);
      break;
    case "ArrowUp":
      rotatePlayer(1);
      break;
    case "Space":
      event.preventDefault();
      hardDrop();
      break;
    case "KeyP":
      togglePause();
      break;
    case "KeyR":
      resetGame();
      break;
    default:
      break;
  }
});

function handleTouchAction(action) {
  switch (action) {
    case "left":
      movePlayer(-1);
      haptic("light");
      break;
    case "right":
      movePlayer(1);
      haptic("light");
      break;
    case "rotate":
      rotatePlayer(1);
      haptic("medium");
      break;
    case "soft":
      dropPlayer(true);
      haptic("light");
      break;
    case "hard":
      hardDrop();
      haptic("heavy");
      break;
    default:
      break;
  }
}

touchControls.addEventListener("pointerdown", (event) => {
  const btn = event.target.closest("[data-action]");
  if (!btn) return;
  event.preventDefault();
  handleTouchAction(btn.dataset.action);
});

restartBtn.addEventListener("click", () => {
  resetGame();
  pauseBtn.textContent = "Pause";
  haptic("medium");
});

pauseBtn.addEventListener("click", togglePause);

shareBtn.addEventListener("click", () => {
  shareScore(score, totalLines, level);
  haptic("light");
});

resetGame();
cancelAnimationFrame(animationId);
animationId = requestAnimationFrame(update);
