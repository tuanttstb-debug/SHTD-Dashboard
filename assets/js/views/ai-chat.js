'use strict';

// Session-local conversation history (cleared on page reload)
var _aiHistory = [];
var _aiTyping = false;

function _getAiSuggestions() {
  return [
    t('ai.suggest.1'),
    t('ai.suggest.2'),
    t('ai.suggest.3'),
    t('ai.suggest.4'),
  ];
}

function renderAiChat() {
  var root = document.getElementById('aiChatRoot');
  if (!root) return;

  root.innerHTML =
    '<div class="ai-chat-header">' +
      '<div class="ai-chat-header-icon"><i class="fa-solid fa-robot"></i></div>' +
      '<div class="ai-chat-header-info">' +
        '<div class="ai-chat-header-title">AI Assistant</div>' +
        '<div class="ai-chat-header-sub">' + t('ai.header.sub') + '</div>' +
      '</div>' +
      '<button class="ai-chat-clear-btn" onclick="clearAiChat()" title="' + t('ai.clear-btn') + '">' +
        '<i class="fa-solid fa-trash-can"></i> ' + t('ai.clear-btn') + '</button>' +
    '</div>' +
    '<div class="ai-chat-messages" id="aiMessages"></div>' +
    '<div class="ai-chat-input-bar">' +
      '<textarea class="ai-chat-input" id="aiInput" rows="1" ' +
        'placeholder="' + t('ai.input.ph') + '" ' +
        'onkeydown="handleAiKey(event)" oninput="autoResizeAiInput(this)"></textarea>' +
      '<button class="ai-chat-send-btn" id="aiSendBtn" onclick="sendAiMessage()" title="Gửi (Enter)">' +
        '<i class="fa-solid fa-paper-plane"></i></button>' +
    '</div>' +
    '<div class="ai-chat-hint">' + t('ai.hint') + '</div>';

  _renderAiMessages();
}

function _renderAiMessages() {
  var container = document.getElementById('aiMessages');
  if (!container) return;

  if (_aiHistory.length === 0) {
    var suggestions = _getAiSuggestions();
    container.innerHTML =
      '<div class="ai-chat-empty">' +
        '<div class="ai-chat-empty-icon"><i class="fa-solid fa-robot"></i></div>' +
        '<div class="ai-chat-empty-text">' + t('ai.empty.text') + '</div>' +
        '<div class="ai-chat-suggestions">' +
          suggestions.map(function(s) {
            return '<button class="ai-chat-suggestion" onclick="sendAiSuggestion(' + "'" + s + "'" + ')">' + esc(s) + '</button>';
          }).join('') +
        '</div>' +
      '</div>';
    return;
  }

  var html = '';
  for (var i = 0; i < _aiHistory.length; i++) {
    var turn = _aiHistory[i];
    var isUser = turn.role === 'user';
    var avatarContent = isUser ? esc(_getAiUserInitials()) : '<i class="fa-solid fa-robot"></i>';
    html +=
      '<div class="ai-msg-row ' + (isUser ? 'user' : 'bot') + '">' +
        '<div class="ai-msg-avatar">' + avatarContent + '</div>' +
        '<div>' +
          '<div class="ai-msg-bubble">' + esc(turn.text) + '</div>' +
          (turn.time ? '<div class="ai-msg-time">' + turn.time + '</div>' : '') +
        '</div>' +
      '</div>';
  }

  if (_aiTyping) {
    html +=
      '<div class="ai-typing-row" id="aiTypingRow">' +
        '<div class="ai-msg-avatar" style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--primary),#6366f1);display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;">' +
          '<i class="fa-solid fa-robot"></i></div>' +
        '<div class="ai-typing-bubble">' +
          '<div class="ai-typing-dot"></div>' +
          '<div class="ai-typing-dot"></div>' +
          '<div class="ai-typing-dot"></div>' +
        '</div>' +
      '</div>';
  }

  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;
}

function _getAiUserInitials() {
  var user = getCurrentUser();
  if (!user || !user.displayName) return 'U';
  var parts = user.displayName.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return user.displayName.substring(0, 2).toUpperCase();
}

function _fmtAiTime() {
  var now = new Date();
  return now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
}

async function sendAiMessage() {
  var input = document.getElementById('aiInput');
  if (!input) return;
  var text = input.value.trim();
  if (!text || _aiTyping) return;

  input.value = '';
  input.style.height = '';

  // Push user turn to history
  _aiHistory.push({ role: 'user', text: text, time: _fmtAiTime() });
  _aiTyping = true;
  _renderAiMessages();
  document.getElementById('aiSendBtn').disabled = true;

  // Build history payload (role + text only, no time field)
  var historyPayload = _aiHistory.slice(0, -1).map(function(turn) {
    return { role: turn.role, text: turn.text };
  });

  try {
    var res = await gasPost({ action: 'ai-chat', message: text, history: historyPayload });
    if (res.status !== 'ok') throw new Error(res.error || 'Lỗi không xác định');
    _aiHistory.push({ role: 'model', text: res.reply, time: _fmtAiTime() });
  } catch (err) {
    _aiHistory.push({ role: 'model', text: t('ai.err.prefix') + err.message, time: _fmtAiTime() });
  } finally {
    _aiTyping = false;
    var btn = document.getElementById('aiSendBtn');
    if (btn) btn.disabled = false;
    _renderAiMessages();
    var inp = document.getElementById('aiInput');
    if (inp) inp.focus();
  }
}

function sendAiSuggestion(text) {
  var input = document.getElementById('aiInput');
  if (!input) return;
  input.value = text;
  sendAiMessage();
}

function clearAiChat() {
  _aiHistory = [];
  _aiTyping = false;
  _renderAiMessages();
}

function handleAiKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendAiMessage();
  }
}

function autoResizeAiInput(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}
