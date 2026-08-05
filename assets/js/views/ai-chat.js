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

// Render tối thiểu Markdown AN TOÀN cho tin nhắn bot: escape HTML TRƯỚC (chống XSS),
// rồi format bảng GFM + **đậm** + `code` + bullet + xuống dòng. Không dùng thư viện ngoài.
function _aiSplitMdRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); });
}

function _aiMdInline(s) {
  s = esc(s);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  return s;
}

function _aiRenderMarkdown(src) {
  var lines = String(src == null ? '' : src).replace(/\r\n/g, '\n').split('\n');
  var html = [];
  var i = 0;
  while (i < lines.length) {
    var line = lines[i];
    // Bảng GFM: dòng có '|' + dòng kế là separator (---, :---)
    if (/\|/.test(line) && i + 1 < lines.length &&
        /-/.test(lines[i + 1]) && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
      var header = _aiSplitMdRow(line);
      i += 2;
      var body = '';
      while (i < lines.length && lines[i].trim() !== '' && /\|/.test(lines[i])) {
        var cells = _aiSplitMdRow(lines[i]);
        body += '<tr>' + cells.map(function (c) { return '<td>' + _aiMdInline(c) + '</td>'; }).join('') + '</tr>';
        i++;
      }
      html.push('<div class="ai-table-wrap"><table class="ai-md-table"><thead><tr>' +
        header.map(function (c) { return '<th>' + _aiMdInline(c) + '</th>'; }).join('') +
        '</tr></thead><tbody>' + body + '</tbody></table></div>');
      continue;
    }
    // Bullet list (- hoặc *)
    if (/^\s*[-*]\s+/.test(line)) {
      var items = '';
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items += '<li>' + _aiMdInline(lines[i].replace(/^\s*[-*]\s+/, '')) + '</li>';
        i++;
      }
      html.push('<ul class="ai-md-list">' + items + '</ul>');
      continue;
    }
    if (line.trim() === '') { html.push('<br>'); i++; continue; }
    html.push('<div>' + _aiMdInline(line) + '</div>');
    i++;
  }
  return html.join('');
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
          '<div class="ai-msg-bubble">' + (isUser ? esc(turn.text) : _aiRenderMarkdown(turn.text)) + '</div>' +
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

// Retry riêng cho AI (S59): 404/5xx của Web App GAS là lỗi transient tầng vận chuyển
// (redirect googleusercontent). ai-chat là read-only nên retry an toàn (không như write → double-write).
async function _aiPostWithRetry(payload) {
  var attempts = 3, lastErr;
  for (var a = 0; a < attempts; a++) {
    try {
      return await gasPost(payload);
    } catch (err) {
      lastErr = err;
      if (!/HTTP: [45]\d\d|Failed to fetch|NetworkError/i.test(err.message)) break; // lỗi không phải transient → không retry
      if (a < attempts - 1) await new Promise(function (r) { setTimeout(r, 800 * (a + 1)); });
    }
  }
  throw lastErr;
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
    var res = await _aiPostWithRetry({ action: 'ai-chat', message: text, history: historyPayload });
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
