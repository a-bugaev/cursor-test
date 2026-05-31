/** @type {import('telegram-web-app').WebApp | undefined} */
const tg = window.Telegram?.WebApp;

function applyTelegramTheme() {
  if (!tg) return;

  const p = tg.themeParams;
  const root = document.documentElement;

  if (p.bg_color) root.style.setProperty("--tg-bg", p.bg_color);
  if (p.secondary_bg_color) root.style.setProperty("--tg-panel", p.secondary_bg_color);
  if (p.text_color) root.style.setProperty("--tg-text", p.text_color);
  if (p.hint_color) root.style.setProperty("--tg-muted", p.hint_color);
  if (p.button_color) root.style.setProperty("--tg-button", p.button_color);
  if (p.button_text_color) root.style.setProperty("--tg-button-text", p.button_text_color);
  if (p.link_color) root.style.setProperty("--tg-accent", p.link_color);

  root.dataset.telegram = "true";
}

export function initTelegram() {
  if (!tg) {
    document.documentElement.dataset.telegram = "false";
    return { tg: null, isTelegram: false };
  }

  tg.ready();
  tg.expand();
  tg.enableClosingConfirmation();
  applyTelegramTheme();

  tg.onEvent("themeChanged", applyTelegramTheme);

  return { tg, isTelegram: true };
}

export function haptic(type = "light") {
  tg?.HapticFeedback?.impactOccurred(type);
}

export function shareScore(score, lines, level) {
  const text = `Classic Tetris — Score: ${score}, Lines: ${lines}, Level: ${level}`;

  if (tg) {
    tg.openTelegramLink(`https://t.me/share/url?text=${encodeURIComponent(text)}`);
    return;
  }

  if (navigator.share) {
    navigator.share({ title: "Classic Tetris", text }).catch(() => {});
    return;
  }

  window.alert(`Score: ${score} · Lines: ${lines} · Level: ${level}`);
}
