'use strict';

// Session-local conversation history (cleared on page reload)
var _aiHistory = [];
var _aiTyping = false;

var _aiSuggestions = [
  'Tóm tắt các task đang bị Blocked hiện tại',
  'Task nào có RAG đỏ và chưa hoàn thành?',
  'Tiến độ các Initiative đang như thế nào?',
  'Tuần này có bao nhiêu task hoàn thành?',
];

function renderAiChat() {
  var root = document.getElementById('aiChatRoot');
  if (!root) return;

  root.innerHTML =
    '<div class="ai-chat-header">' +
      '<div class="ai-chat-header-icon"><i class="fa-solid fa-robot"></i></div>' +
      '<div class="ai-chat-header-info">' +
        '<div class="ai-chat-header-title">SHTD AI Assistant</div>' +
        '<div class="ai-chat-header-sub">Hỏi về task, KPI, initiative của dự án · Powered by Gemini</div>' +
      '</div>' +
      '<button class="ai-chat-clear-btn" onclick="clearAiChat()" title="Xóa cuộc trò chuyện">' +
        '<i class="fa-solid fa-trash-can"></i> Xóa</button>' +
    '</div>' +
    '<div class="ai-chat-messages" id="aiMessages"></div>' +
    '<div class="ai-chat-input-bar">' +
      '<textarea class="ai-chat-input" id="aiInput" rows="1" ' +
        'placeholder="Hỏi về task, KPI, initiative..." ' +
        'onkeydown="handleAiKey(event)" oninput="autoResizeAiInput(this)"></textarea>' +
      '<button class="ai-chat-send-btn" id="aiSendBtn" onclick="sendAiMessage()" title="Gửi (Enter)">' +
        '<i class="fa-solid fa-paper-plane"></i></button>' +
    '</div>' +
    '<div class="ai-chat-hint">Enter để gửi · Shift+Enter xuống dòng</div>';

  _renderAiMessages();
}

function _renderAiMessages() {
  var container = document.getElementById('aiMessages');
  if (!container) return;

  if (_aiHistory.length === 0) {
    container.innerHTML =
      '<div class="ai-chat-empty">' +
        '<div class="ai-chat-empty-icon"><i class="fa-solid fa-robot"></i></div>' +
        '<div class="ai-chat-empty-text">Hỏi tôi bất cứ điều gì về dữ liệu dự án SHTD</div>' +
        '<div class="ai-chat-suggestions">' +
          _aiSuggestions.map(function(s) {
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
  var historyPayload = _aiHistory.slice(0, -1).map(function(t) {
    return { role: t.role, text: t.text };
  });

  try {
    var res = await gasPost({ action: 'ai-chat', message: text, history: historyPayload });
    if (res.status !== 'ok') throw new Error(res.error || 'Lỗi không xác định');
    _aiHistory.push({ role: 'model', text: res.reply, time: _fmtAiTime() });
  } catch (err) {
    _aiHistory.push({ role: 'model', text: 'Xin lỗi, có lỗi xảy ra: ' + err.message, time: _fmtAiTime() });
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
