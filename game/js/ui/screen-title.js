// screen-title.js — Title / new game / load game screen

'use strict';

GameBus.on('screen:title:enter', function () {
  const el = document.getElementById('screen-title');

  const hasSaveGame = hasSave();

  el.innerHTML = `
    <div class="title-screen">
      <div class="title-logo">
        <div class="title-bugs">🪲 🦋 🦗 🐛 ✨</div>
        <h1 class="game-title">BugJar</h1>
        <p class="game-subtitle">Catch • Breed • Battle</p>
      </div>
      <div class="title-buttons">
        ${hasSaveGame
          ? `<button id="btn-continue" class="btn btn-primary">Continue</button>`
          : ''}
        <button id="btn-new-game" class="btn ${hasSaveGame ? 'btn-secondary' : 'btn-primary'}">New Game</button>
      </div>
      ${hasSaveGame
        ? `<button id="btn-delete-save" class="btn btn-danger btn-sm">Delete Save</button>`
        : ''}
    </div>
  `;

  if (hasSaveGame) {
    document.getElementById('btn-continue').addEventListener('click', () => {
      if (loadState()) {
        navigateTo('hub');
      }
    });

    document.getElementById('btn-delete-save').addEventListener('click', () => {
      if (confirm('Delete your save? This cannot be undone.')) {
        deleteSave();
        GameBus.emit('screen:title:enter');
      }
    });
  }

  document.getElementById('btn-new-game').addEventListener('click', () => {
    if (hasSaveGame && !confirm('Start a new game? Your current save will be overwritten.')) return;
    _showNameInput();
  });

  function _showNameInput() {
    el.innerHTML = `
      <div class="title-screen">
        <div class="title-logo">
          <h1 class="game-title">BugJar</h1>
        </div>
        <div class="name-form">
          <label for="player-name-input">What's your name, Collector?</label>
          <input id="player-name-input" type="text" maxlength="16" placeholder="Enter name…" autocomplete="off" />
          <button id="btn-start" class="btn btn-primary">Start Adventure</button>
        </div>
      </div>
    `;

    const input = document.getElementById('player-name-input');
    input.focus();

    document.getElementById('btn-start').addEventListener('click', () => {
      const name = input.value.trim() || 'Collector';
      newGame(name);
      navigateTo('hub');
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('btn-start').click();
    });
  }
});
