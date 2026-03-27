// utils.js — RNG, math helpers, event bus

'use strict';

// ── Random helpers ──────────────────────────────────────────────────────────

function randFloat(min, max) {
  return min + Math.random() * (max - min);
}

function randInt(min, max) { // inclusive
  return Math.floor(randFloat(min, max + 1));
}

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

// Weighted random: items = [{ value, weight }, ...]
function weightedRandom(items) {
  let total = 0;
  for (const item of items) total += item.weight;
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── UUID-lite ────────────────────────────────────────────────────────────────

function uid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ── Object helpers ───────────────────────────────────────────────────────────

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ── Minimal event bus ────────────────────────────────────────────────────────

const GameBus = (function () {
  const listeners = {};
  return {
    on(event, fn) {
      (listeners[event] = listeners[event] || []).push(fn);
    },
    off(event, fn) {
      listeners[event] = (listeners[event] || []).filter(f => f !== fn);
    },
    emit(event, data) {
      (listeners[event] || []).forEach(fn => fn(data));
    },
  };
})();
