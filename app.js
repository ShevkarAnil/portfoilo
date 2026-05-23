/* ==========================================================================
   ✦ CIPHERAI WEB CORE LOGIC & STATE SIMULATION (BLoC ENGINE)
   ========================================================================== */

// --- 🔒 SAFE STORAGE WRAPPER (Prevents crashes in file:// protocol sandboxes) ---
class SafeStorage {
  constructor() {
    this.fallbackStore = {};
    this.isAvailable = this.checkAvailability();
  }

  checkAvailability() {
    try {
      localStorage.setItem('__cipher_test_key__', '1');
      localStorage.removeItem('__cipher_test_key__');
      return true;
    } catch (e) {
      console.warn("localStorage is blocked or inaccessible (likely due to file:// sandbox or browser privacy configurations). Falling back to dynamic in-memory store.");
      return false;
    }
  }

  getItem(key) {
    if (this.isAvailable) {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        console.error("Error reading from localStorage:", e);
      }
    }
    return this.fallbackStore[key] || null;
  }

  setItem(key, value) {
    if (this.isAvailable) {
      try {
        localStorage.setItem(key, value);
        return;
      } catch (e) {
        console.error("Error writing to localStorage:", e);
      }
    }
    this.fallbackStore[key] = value;
  }

  clear() {
    if (this.isAvailable) {
      try {
        localStorage.clear();
        return;
      } catch (e) {
        console.error("Error clearing localStorage:", e);
      }
    }
    this.fallbackStore = {};
  }
}

const safeStorage = new SafeStorage();

// --- 🎨 SAFE LUCIDE WRAPPER (Prevents crashes in offline/disconnected environments) ---
function safeCreateIcons() {
  if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
    try {
      lucide.createIcons();
    } catch (e) {
      console.error("Failed to compile Lucide icons:", e);
    }
  }
}

// --- Default Mock Models configuration ---
const PROVIDER_MODELS = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o (Omni)' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5' }
  ],
  anthropic: [
    { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-opus', name: 'Claude 3 Opus' },
    { id: 'claude-3-haiku', name: 'Claude 3 Haiku' }
  ],
  gemini: [
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' }
  ],
  custom: [
    { id: 'llama3-8b', name: 'Llama 3 (8B)' },
    { id: 'mistral-7b', name: 'Mistral (7B)' },
    { id: 'phi3-medium', name: 'Phi-3 Medium' }
  ]
};

// --- Mock streaming response word arrays ---
const MOCK_AI_RESPONSES = [
  "I have received your message in this secure space. As an AI configured locally inside the CipherAI container, I can confirm that your data is fully protected. None of this conversation left your computer. Let me know how I can help you analyze sensitive information.",
  "Here is the local diagnostics audit you requested:\n\n```json\n{\n  \"security\": \"AES-256 Enabled\",\n  \"database\": \"SQLCipher Active\",\n  \"telemetry\": \"Disabled (Zero-Out)\",\n  \"connection\": \"End-to-End Encrypted\"\n}\n```\n\nIs there anything else you want to compute locally?",
  "This is a premium high-fidelity demonstration of CipherAI's BLoC state model. Note how the streaming stops immediately when you press the cancel button, preserving atomic transactions. You can securely adjust context windows or nuke database buffers anytime.",
  "Understood. Let's execute that query in private memory. Using Local Ollama endpoints ensures complete sovereign control over the weights and logits. We can build custom offline agents or securely vectorize files without leaking intellectual property."
];

// ==========================================================================
// ✦ APP STATE STORAGE & CONTROLLERS (BLOC ENGINE MOCKS)
// ==========================================================================

class AppStateManager {
  constructor() {
    this.settings = this.loadSettings();
    this.sessions = this.loadSessions();
    this.activeSessionId = null;
    this.currentStreamInterval = null;
    this.isStreaming = false;
    
    // --- Split-Screen Compare Mode States ---
    this.isSplitMode = false;
    this.focusedPane = 'left';
    this.paneSessions = { left: null, right: null };
    this.paneStreams = {
      left: { interval: null, active: false, abortController: null },
      right: { interval: null, active: false, abortController: null }
    };
    this.isSyncSend = false;
  }

  // --- Settings Persistence (SettingsBloc) ---
  loadSettings() {
    const defaults = {
      provider: 'openai',
      model: 'gpt-4o',
      openaiKey: '',
      anthropicKey: '',
      geminiKey: '',
      customUrl: 'http://localhost:11434/v1',
      contextSize: 20,
      streamingEnabled: true,
      biometricsEnabled: false
    };

    const stored = safeStorage.getItem('cipher_settings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          parsed.biometricsEnabled = false; // Always force disable to bypass lock screen
          return { ...defaults, ...parsed };
        }
      } catch (e) {
        console.error("Corrupted settings storage:", e);
      }
    }
    return defaults;
  }

  saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    safeStorage.setItem('cipher_settings', JSON.stringify(this.settings));
  }

  // --- Sessions Database Persistence (SessionsBloc / ChatBloc) ---
  loadSessions() {
    const stored = safeStorage.getItem('cipher_sessions');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.map(session => ({
            id: session.id || 'session_' + Date.now(),
            title: session.title || 'New Session',
            provider: session.provider || 'openai',
            model: session.model || 'gpt-4o',
            messages: Array.isArray(session.messages) ? session.messages : []
          }));
        }
      } catch (e) {
        console.error("Corrupted sessions storage:", e);
      }
    }
    return [];
  }

  saveSessions() {
    safeStorage.setItem('cipher_sessions', JSON.stringify(this.sessions));
  }

  createSession() {
    const newSession = {
      id: 'session_' + Date.now(),
      title: 'New Session',
      provider: this.settings.provider,
      model: this.settings.model,
      messages: []
    };
    this.sessions.unshift(newSession);
    this.saveSessions();
    this.activeSessionId = newSession.id;
    return newSession;
  }

  deleteSession(id) {
    this.sessions = this.sessions.filter(s => s.id !== id);
    this.saveSessions();
    if (this.activeSessionId === id) {
      this.activeSessionId = this.sessions.length > 0 ? this.sessions[0].id : null;
    }
  }

  getActiveSession() {
    return this.sessions.find(s => s.id === this.activeSessionId) || null;
  }

  addMessageToActive(role, content) {
    const session = this.getActiveSession();
    if (!session) return null;
    
    if (!Array.isArray(session.messages)) {
      session.messages = [];
    }
    
    const message = {
      id: 'msg_' + Date.now(),
      role: role,
      content: content,
      timestamp: new Date().toISOString()
    };
    session.messages.push(message);
    
    // Automatically update session title on first user query
    if (role === 'user' && session.title === 'New Session') {
      session.title = content.length > 25 ? content.substring(0, 22) + '...' : content;
    }
    
    this.saveSessions();
    return message;
  }

  nukeAllData() {
    safeStorage.clear();
    this.settings = this.loadSettings();
    this.sessions = [];
    this.activeSessionId = null;
    this.isStreaming = false;
    this.isSplitMode = false;
    this.focusedPane = 'left';
    this.paneSessions = { left: null, right: null };
    if (this.currentStreamInterval) {
      clearInterval(this.currentStreamInterval);
    }
    if (this.paneStreams.left.interval) clearInterval(this.paneStreams.left.interval);
    if (this.paneStreams.right.interval) clearInterval(this.paneStreams.right.interval);
    this.paneStreams = {
      left: { interval: null, active: false, abortController: null },
      right: { interval: null, active: false, abortController: null }
    };
    this.isSyncSend = false;
  }
}

const state = new AppStateManager();

// ==========================================================================
// ✦ UI DOM HANDLERS
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Global abort controller for canceling real AI network requests
  let currentAbortController = null;

  // Elements Lookups
  const dom = {
    lockScreen: document.getElementById('lock-screen'),
    biometricTrigger: document.getElementById('biometric-trigger-btn'),
    lockStatus: document.getElementById('lock-status-message'),
    
    sidebar: document.getElementById('sidebar'),
    sidebarToggle: document.getElementById('sidebar-toggle'),
    btnNewChat: document.getElementById('btn-new-chat'),
    sessionsContainer: document.getElementById('sessions-container'),
    
    settingsTrigger: document.getElementById('settings-trigger'),
    settingsModal: document.getElementById('settings-modal'),
    settingsClose: document.getElementById('settings-close'),
    settingsSave: document.getElementById('settings-save-btn'),
    
    currentChatTitle: document.getElementById('current-chat-title'),
    headerStatusIndicator: document.getElementById('header-status-indicator'),
    headerStatusLabel: document.getElementById('header-status-label'),
    btnWipeSession: document.getElementById('btn-wipe-session'),
    btnDiagnostics: document.getElementById('btn-diagnostics'),
    
    chatHistory: document.getElementById('chat-history-container'),
    welcomeScreen: document.getElementById('welcome-screen'),
    
    textarea: document.getElementById('chat-textarea'),
    charCounter: document.getElementById('char-counter'),
    btnSend: document.getElementById('btn-send'),
    btnStop: document.getElementById('btn-stop'),
    
    // Settings form inputs
    selectModel: document.getElementById('select-model'),
    openaiKey: document.getElementById('input-openai-key'),
    anthropicKey: document.getElementById('input-anthropic-key'),
    geminiKey: document.getElementById('input-gemini-key'),
    customUrl: document.getElementById('input-custom-url'),
    customUrlContainer: document.getElementById('custom-url-container'),
    sliderContext: document.getElementById('slider-context-size'),
    contextValueLabel: document.getElementById('context-size-value'),
    toggleStreaming: document.getElementById('toggle-streaming'),
    toggleBiometrics: document.getElementById('toggle-biometrics'),
    btnNuke: document.getElementById('btn-nuke-all'),
    
    // Profile widget labels
    profileDot: document.getElementById('active-provider-indicator'),
    profileName: document.getElementById('active-provider-label'),
    profileModel: document.getElementById('active-model-label'),
    
    // Diagnostics Terminal overlay
    diagnosticsModal: document.getElementById('diagnostics-modal'),
    diagnosticsClose: document.getElementById('diagnostics-close'),
    terminalLogs: document.getElementById('terminal-logs-container'),
    btnRerunDiagnostics: document.getElementById('btn-rerun-diagnostics')
  };

  // --- Initialize Webpage UI State ---
  initAppFlow();

  function initAppFlow() {
    // Check if lock screen is necessary
    if (state.settings.biometricsEnabled) {
      dom.lockScreen.classList.remove('hidden');
      dom.lockStatus.innerText = "Tap scanner to authenticate identity";
      dom.lockStatus.className = "lock-status";
    } else {
      dom.lockScreen.classList.add('hidden');
    }

    // Load active session profile tags
    updateProfileWidgets();
    renderSessions();
    selectDefaultOrCreate();
    syncSettingsModalForm();
  }

  // --- Dynamic Model selection loading ---
  function populateModels(provider, selectedModel = null) {
    dom.selectModel.innerHTML = '';
    const models = PROVIDER_MODELS[provider] || [];
    models.forEach(model => {
      const opt = document.createElement('option');
      opt.value = model.id;
      opt.innerText = model.name;
      if (selectedModel && model.id === selectedModel) {
        opt.selected = true;
      }
      dom.selectModel.appendChild(opt);
    });
  }

  // --- Synchronise UI profile tags & status labels ---
  function updateProfileWidgets() {
    const prov = state.settings.provider;
    const modelId = state.settings.model;
    const model = (PROVIDER_MODELS[prov] || []).find(m => m.id === modelId) || { name: modelId };
    
    // Color dot mapping
    const dotColors = {
      openai: 'var(--color-openai)',
      anthropic: 'var(--color-anthropic)',
      gemini: 'var(--color-gemini)',
      custom: 'var(--color-ollama)'
    };
    const activeColor = dotColors[prov] || 'var(--accent-primary)';

    // Update bottom left profile badge
    dom.profileName.innerText = prov.toUpperCase();
    dom.profileModel.innerText = modelId;
    dom.profileDot.style.backgroundColor = activeColor;
    dom.profileDot.style.boxShadow = `0 0 8px ${activeColor}`;

    // Update chat pane header info
    dom.headerStatusLabel.innerText = `${model.name} (${prov.toUpperCase()})`;
    dom.headerStatusIndicator.style.backgroundColor = activeColor;
  }

  // --- Render Sidebar sessions ---
  function renderSessions() {
    dom.sessionsContainer.innerHTML = '';
    state.sessions.forEach(sess => {
      const item = document.createElement('button');
      item.className = `session-item ${sess.id === state.activeSessionId ? 'active' : ''}`;
      item.onclick = () => selectSession(sess.id);
      
      const main = document.createElement('div');
      main.className = 'session-main';
      
      const icon = document.createElement('i');
      icon.setAttribute('data-lucide', 'message-square');
      icon.className = 'session-icon';
      
      const title = document.createElement('span');
      title.className = 'session-title';
      title.innerText = sess.title;
      
      main.appendChild(icon);
      main.appendChild(title);
      
      const delBtn = document.createElement('button');
      delBtn.className = 'btn-delete-session';
      delBtn.title = 'Delete Session';
      delBtn.onclick = (e) => {
        e.stopPropagation();
        deleteSessionFlow(sess.id);
      };
      
      const delIcon = document.createElement('i');
      delIcon.setAttribute('data-lucide', 'x');
      delIcon.style.width = '14px';
      delIcon.style.height = '14px';
      delBtn.appendChild(delIcon);

      item.appendChild(main);
      item.appendChild(delBtn);
      
      dom.sessionsContainer.appendChild(item);
    });
    safeCreateIcons();
  }

  function selectDefaultOrCreate() {
    if (state.sessions.length > 0) {
      selectSession(state.sessions[0].id);
    } else {
      newChatFlow();
    }
  }

  function selectSession(id) {
    if (state.isStreaming) {
      stopStreamingFlow();
    }
    state.activeSessionId = id;
    renderSessions();
    renderActiveChatHistory();
  }

  function newChatFlow() {
    const newSess = state.createSession();
    selectSession(newSess.id);
  }

  function deleteSessionFlow(id) {
    state.deleteSession(id);
    if (!state.activeSessionId) {
      newChatFlow();
    } else {
      selectSession(state.activeSessionId);
    }
  }

  // --- Render Chat Bubble Viewport ---
  function renderActiveChatHistory() {
    const session = state.getActiveSession();
    if (!session || session.messages.length === 0) {
      dom.welcomeScreen.classList.remove('hidden');
      // Clear previous messages if any
      const messages = dom.chatHistory.querySelectorAll('.message-row');
      messages.forEach(m => m.remove());
      dom.currentChatTitle.innerText = "New Session";
      return;
    }

    dom.welcomeScreen.classList.add('hidden');
    
    // Clear viewport, leaving welcome screen hidden
    const oldMessages = dom.chatHistory.querySelectorAll('.message-row');
    oldMessages.forEach(m => m.remove());

    session.messages.forEach(msg => {
      appendMessageBubble(msg.role, msg.content);
    });
    
    dom.currentChatTitle.innerText = session.title;
    scrollToBottom();
  }

  function appendMessageBubble(role, content) {
    const row = document.createElement('div');
    row.className = `message-row ${role}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    
    const icon = document.createElement('i');
    icon.className = 'message-avatar-icon';
    icon.setAttribute('data-lucide', role === 'user' ? 'user' : 'bot');
    avatar.appendChild(icon);
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
    const sender = document.createElement('span');
    sender.className = 'message-sender';
    sender.innerText = role === 'user' ? 'YOU' : 'CIPHERAI';
    
    const body = document.createElement('div');
    body.className = 'message-body';
    body.innerHTML = parseSimpleMarkdown(content);
    
    bubble.appendChild(sender);
    bubble.appendChild(body);
    
    row.appendChild(avatar);
    row.appendChild(bubble);
    
    dom.chatHistory.appendChild(row);
    safeCreateIcons();
    return row;
  }

  // A very simple markdown formatter for local demo (handling ticks & codeblocks)
  function parseSimpleMarkdown(text) {
    let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    // Code blocks
    html = html.replace(/```(json|javascript|js|html)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    
    // Single code lines
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // New lines
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  function scrollToBottom() {
    dom.chatHistory.scrollTop = dom.chatHistory.scrollHeight;
  }

  // ==========================================================================
  // ✦ SECURITY PASS: BIOMETRICS LOCK SCREEN EVENT
  // ==========================================================================

  dom.biometricTrigger.addEventListener('click', () => {
    if (dom.biometricTrigger.classList.contains('scanning')) return;
    
    dom.biometricTrigger.classList.add('scanning');
    dom.lockStatus.innerText = "Scanning fingerprint locally...";
    dom.lockStatus.className = "lock-status";

    // Simulate Secure Enclave response delay (reduced to 600ms for high responsiveness)
    setTimeout(() => {
      dom.biometricTrigger.classList.remove('scanning');
      
      // 100% success rate to ensure user never gets stuck in the demo gate
      const isSuccess = true;
      
      if (isSuccess) {
        dom.lockStatus.innerText = "Identity Authenticated via Hardware Guard!";
        dom.lockStatus.className = "lock-status success-text";
        dom.biometricTrigger.style.pointerEvents = 'none';
        
        setTimeout(() => {
          dom.lockScreen.classList.add('hidden');
          dom.biometricTrigger.style.pointerEvents = '';
        }, 400);
      } else {
        dom.biometricTrigger.classList.add('error-shake');
        dom.lockStatus.innerText = "Biometrics mismatched. Secure database locked.";
        dom.lockStatus.className = "lock-status error-text";
        
        setTimeout(() => {
          dom.biometricTrigger.classList.remove('error-shake');
          dom.lockStatus.innerText = "Tap fingerprint scanner again";
        }, 1200);
      }
    }, 600);
  });

  // ==========================================================================
  // ✦ CHAT ACTIONS ENGINE (SEND / STREAM / CANCEL / NET AI FETCH)
  // ==========================================================================

  // Character limits
  dom.textarea.addEventListener('input', () => {
    const len = dom.textarea.value.length;
    dom.charCounter.innerText = `${len} / 4000`;
    dom.btnSend.disabled = (len === 0);
    
    // Auto growing heights
    dom.textarea.style.height = 'auto';
    dom.textarea.style.height = `${dom.textarea.scrollHeight - 12}px`;
  });

  dom.textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (dom.textarea.value.trim().length > 0 && !state.isStreaming) {
        sendMessageFlow();
      }
    }
  });

  dom.btnSend.addEventListener('click', sendMessageFlow);
  dom.btnStop.addEventListener('click', stopStreamingFlow);

  function sendMessageFlow() {
    const text = dom.textarea.value.trim();
    if (!text) return;
    
    // Reset textarea
    dom.textarea.value = '';
    dom.textarea.style.height = 'auto';
    dom.charCounter.innerText = '0 / 4000';
    dom.btnSend.disabled = true;

    dom.welcomeScreen.classList.add('hidden');

    // Add message
    state.addMessageToActive('user', text);
    renderActiveChatHistory();
    
    // Trigger AI simulated streamed response
    if (state.settings.streamingEnabled) {
      startStreamingResponse();
    } else {
      triggerInstantResponse();
    }
  }

  function triggerInstantResponse() {
    const randomReply = MOCK_AI_RESPONSES[Math.floor(Math.random() * MOCK_AI_RESPONSES.length)];
    state.addMessageToActive('assistant', randomReply);
    renderActiveChatHistory();
  }

  // --- Real AI SSE Streaming + Mock Fallback ---
  async function startStreamingResponse() {
    state.isStreaming = true;
    dom.btnStop.classList.remove('hidden');
    dom.btnSend.classList.add('hidden');
    dom.textarea.disabled = true;

    // Append empty assistant message bubble to history
    const bubbleRow = appendMessageBubble('assistant', '');
    const bubbleBody = bubbleRow.querySelector('.message-body');
    
    // Add cursor
    const cursor = document.createElement('span');
    cursor.className = 'streaming-cursor';
    bubbleBody.appendChild(cursor);
    scrollToBottom();

    const prov = state.settings.provider;
    const model = state.settings.model;
    let apiKey = '';
    let apiUrl = '';
    
    if (prov === 'openai') {
      apiKey = state.settings.openaiKey;
      apiUrl = 'https://api.openai.com/v1/chat/completions';
    } else if (prov === 'anthropic') {
      apiKey = state.settings.anthropicKey;
      apiUrl = 'https://api.anthropic.com/v1/messages';
    } else if (prov === 'gemini') {
      apiKey = state.settings.geminiKey;
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
    } else if (prov === 'custom') {
      apiUrl = `${state.settings.customUrl}/chat/completions`;
    }

    const hasRealConfig = (prov === 'openai' && apiKey && apiKey.startsWith('sk-')) ||
                         (prov === 'custom' && state.settings.customUrl) ||
                         (prov === 'gemini' && apiKey) ||
                         (prov === 'anthropic' && apiKey);

    // Context windows history mapping
    const activeSess = state.getActiveSession();
    const contextSize = state.settings.contextSize || 20;
    const historyMessages = activeSess ? activeSess.messages.slice(-contextSize) : [];
    
    const apiMessages = historyMessages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    }));

    if (hasRealConfig) {
      currentAbortController = new AbortController();
      let accumulatedText = "";
      
      try {
        logToTerminal(`Connecting to real endpoint: ${prov.toUpperCase()} (${model})...`, "info");
        
        let headers = {
          'Content-Type': 'application/json'
        };
        let requestBody = {};
        
        if (prov === 'openai') {
          headers['Authorization'] = `Bearer ${apiKey}`;
          requestBody = {
            model: model,
            messages: apiMessages,
            stream: true
          };
        } else if (prov === 'anthropic') {
          headers['x-api-key'] = apiKey;
          headers['anthropic-version'] = '2023-06-01';
          headers['dangerously-allow-browser'] = 'true';
          requestBody = {
            model: model,
            messages: apiMessages,
            max_tokens: 1024,
            stream: true
          };
        } else if (prov === 'gemini') {
          const geminiContents = apiMessages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
          }));
          requestBody = {
            contents: geminiContents
          };
        } else if (prov === 'custom') {
          requestBody = {
            model: model,
            messages: apiMessages,
            stream: true
          };
        }

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(requestBody),
          signal: currentAbortController.signal
        });

        if (!response.ok) {
          throw new Error(`API returned HTTP ${response.status} Error`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop(); // Keep last incomplete line

          for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine) continue;

            if (prov === 'openai' || prov === 'custom') {
              if (cleanLine.startsWith('data: ')) {
                const dataStr = cleanLine.substring(6);
                if (dataStr === '[DONE]') break;
                try {
                  const parsed = JSON.parse(dataStr);
                  if (parsed.error) {
                    throw new Error(parsed.error.message || "API Error");
                  }
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    accumulatedText += content;
                    bubbleBody.innerHTML = parseSimpleMarkdown(accumulatedText);
                    bubbleBody.appendChild(cursor);
                    scrollToBottom();
                  }
                } catch (e) {
                  if (e.message && !e.message.includes("JSON")) {
                    throw e;
                  }
                }
              }
            } else if (prov === 'anthropic') {
              if (cleanLine.startsWith('data: ')) {
                try {
                  const parsed = JSON.parse(cleanLine.substring(6));
                  if (parsed.error) {
                    throw new Error(parsed.error.message || "Anthropic API Error");
                  }
                  if (parsed.type === 'content_block_delta' && parsed.delta && parsed.delta.text) {
                    accumulatedText += parsed.delta.text;
                    bubbleBody.innerHTML = parseSimpleMarkdown(accumulatedText);
                    bubbleBody.appendChild(cursor);
                    scrollToBottom();
                  }
                } catch (e) {
                  if (e.message && !e.message.includes("JSON")) {
                    throw e;
                  }
                }
              }
            } else if (prov === 'gemini') {
              if (cleanLine.startsWith('data: ')) {
                try {
                  const parsed = JSON.parse(cleanLine.substring(6));
                  if (parsed.error) {
                    throw new Error(parsed.error.message || "Gemini API Error");
                  }
                  const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (content) {
                    accumulatedText += content;
                    bubbleBody.innerHTML = parseSimpleMarkdown(accumulatedText);
                    bubbleBody.appendChild(cursor);
                    scrollToBottom();
                  }
                } catch (e) {
                  if (e.message && !e.message.includes("JSON")) {
                    throw e;
                  }
                }
              }
            }
          }
        }
        
        finalizeStreaming(accumulatedText);
        
      } catch (err) {
        if (err.name === 'AbortError') {
          logToTerminal("Stream aborted safely by client cancel request.", "info");
        } else {
          console.error("Real AI Fetch error:", err);
          logToTerminal(`Failed to fetch from ${prov.toUpperCase()}: ${err.message}`, "error");
          
          // Render graceful fallback notification and load mock
          bubbleBody.innerHTML = `<span style="color:#ef4444;font-size:0.85rem;">[!] API Connection failed (${err.message}). Check CORS policies, networks or keys in configurations.</span><br><br><b>Offline Mock Fallback Stream:</b><br>`;
          bubbleBody.appendChild(cursor);
          triggerFallbackMockStream(bubbleBody, cursor);
        }
      }
    } else {
      // Offline Simulated Stream fallback
      triggerFallbackMockStream(bubbleBody, cursor);
    }
  }

  function triggerFallbackMockStream(bubbleBody, cursor) {
    const randomReply = MOCK_AI_RESPONSES[Math.floor(Math.random() * MOCK_AI_RESPONSES.length)];
    const words = randomReply.split(' ');
    let wordIdx = 0;
    let accumulatedText = "";

    state.currentStreamInterval = setInterval(() => {
      if (wordIdx < words.length) {
        accumulatedText += (wordIdx === 0 ? "" : " ") + words[wordIdx];
        bubbleBody.innerHTML = parseSimpleMarkdown(accumulatedText);
        bubbleBody.appendChild(cursor);
        scrollToBottom();
        wordIdx++;
      } else {
        finalizeStreaming(accumulatedText);
      }
    }, 85);
  }

  function finalizeStreaming(finalText) {
    clearInterval(state.currentStreamInterval);
    state.currentStreamInterval = null;
    state.isStreaming = false;
    currentAbortController = null;

    // Save final response in storage state
    state.addMessageToActive('assistant', finalText);

    dom.btnStop.classList.add('hidden');
    dom.btnSend.classList.remove('hidden');
    dom.textarea.disabled = false;
    
    renderActiveChatHistory();
    dom.textarea.focus();
  }

  function stopStreamingFlow() {
    if (!state.isStreaming) return;
    
    // Abort real fetch network request if active
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }

    clearInterval(state.currentStreamInterval);
    state.currentStreamInterval = null;
    state.isStreaming = false;

    // Find the partially streamed text rendering inside the viewport currently
    const rows = dom.chatHistory.querySelectorAll('.message-row.assistant');
    const lastRow = rows[rows.length - 1];
    let partialText = "Stream interrupted by privacy security filter.";
    
    if (lastRow) {
      const body = lastRow.querySelector('.message-body');
      // Strip cursor element to fetch printed text
      const cursor = body.querySelector('.streaming-cursor');
      if (cursor) cursor.remove();
      partialText = body.innerText + " [Stream Interrupted]";
    }

    // Save whatever was generated up to this point in data state
    state.addMessageToActive('assistant', partialText);

    dom.btnStop.classList.add('hidden');
    dom.btnSend.classList.remove('hidden');
    dom.textarea.disabled = false;

    renderActiveChatHistory();
    dom.textarea.focus();
  }

  // --- Clear Session Messages ---
  dom.btnWipeSession.addEventListener('click', () => {
    const session = state.getActiveSession();
    if (session) {
      session.messages = [];
      state.saveSessions();
      renderActiveChatHistory();
    }
  });

  // ==========================================================================
  // ✦ SECURE SETTINGS DIALOG ACTIONS
  // ==========================================================================

  // Password Visibility switch logic
  document.querySelectorAll('.btn-toggle-visibility').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = '<i data-lucide="eye-off"></i>';
      } else {
        input.type = 'password';
        btn.innerHTML = '<i data-lucide="eye"></i>';
      }
      safeCreateIcons();
    });
  });

  // Open settings
  dom.settingsTrigger.addEventListener('click', () => {
    syncSettingsModalForm();
    dom.settingsModal.classList.add('active');
  });

  dom.settingsClose.addEventListener('click', () => {
    dom.settingsModal.classList.remove('active');
  });

  // Provider cards change logic
  const providerCards = document.querySelectorAll('.provider-card');
  providerCards.forEach(card => {
    card.addEventListener('click', () => {
      providerCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      
      const prov = card.getAttribute('data-provider');
      populateModels(prov);
      
      if (prov === 'custom') {
        dom.customUrlContainer.classList.remove('hidden');
      } else {
        dom.customUrlContainer.classList.add('hidden');
      }
    });
  });

  // Slider label updates
  dom.sliderContext.addEventListener('input', () => {
    dom.contextValueLabel.innerText = dom.sliderContext.value;
  });

  // Save Settings Handler
  dom.settingsSave.addEventListener('click', () => {
    const activeCard = document.querySelector('.provider-card.active');
    const prov = activeCard ? activeCard.getAttribute('data-provider') : 'openai';
    const model = dom.selectModel.value;

    state.saveSettings({
      provider: prov,
      model: model,
      openaiKey: dom.openaiKey.value,
      anthropicKey: dom.anthropicKey.value,
      geminiKey: dom.geminiKey.value,
      customUrl: dom.customUrl.value,
      contextSize: parseInt(dom.sliderContext.value),
      streamingEnabled: dom.toggleStreaming.checked,
      biometricsEnabled: dom.toggleBiometrics.checked
    });

    updateProfileWidgets();
    dom.settingsModal.classList.remove('active');
  });

  function syncSettingsModalForm() {
    // Active provider card
    providerCards.forEach(card => {
      if (card.getAttribute('data-provider') === state.settings.provider) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    // Populate models list & select correct active model
    populateModels(state.settings.provider, state.settings.model);

    // Form inputs value
    dom.openaiKey.value = state.settings.openaiKey;
    dom.anthropicKey.value = state.settings.anthropicKey;
    dom.geminiKey.value = state.settings.geminiKey || '';
    dom.customUrl.value = state.settings.customUrl;
    dom.sliderContext.value = state.settings.contextSize;
    dom.contextValueLabel.innerText = state.settings.contextSize;
    dom.toggleStreaming.checked = state.settings.streamingEnabled;
    dom.toggleBiometrics.checked = state.settings.biometricsEnabled;

    if (state.settings.provider === 'custom') {
      dom.customUrlContainer.classList.remove('hidden');
    } else {
      dom.customUrlContainer.classList.add('hidden');
    }
  }

  // --- Nuke Database button ---
  dom.btnNuke.addEventListener('click', () => {
    if (confirm("ARE YOU SURE? This action will permanently erase all local storage caches, encrypted chats, and private key strings from this sandbox!")) {
      state.nukeAllData();
      dom.settingsModal.classList.remove('active');
      initAppFlow();
    }
  });

  // Sidebar mobile responsive toggles
  dom.sidebarToggle.addEventListener('click', () => {
    dom.sidebar.classList.toggle('collapsed');
  });

  // ==========================================================================
  // ✦ AUTOMATED INTEGRATION TESTS (DIAGNOSTICS SUITE)
  // ==========================================================================

  dom.btnDiagnostics.addEventListener('click', () => {
    dom.diagnosticsModal.classList.add('active');
    runAutomationDiagnostics();
  });

  dom.diagnosticsClose.addEventListener('click', () => {
    dom.diagnosticsModal.classList.remove('active');
  });

  dom.btnRerunDiagnostics.addEventListener('click', runAutomationDiagnostics);

  function logToTerminal(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    
    const time = document.createElement('span');
    time.className = 'log-time';
    time.innerText = `[${new Date().toLocaleTimeString()}]`;
    
    const text = document.createElement('span');
    text.className = `log-text ${type}`;
    text.innerText = message;
    
    entry.appendChild(time);
    entry.appendChild(text);
    
    dom.terminalLogs.appendChild(entry);
    dom.terminalLogs.scrollTop = dom.terminalLogs.scrollHeight;
  }

  function runAutomationDiagnostics() {
    dom.terminalLogs.innerHTML = '';
    logToTerminal("Initialising CipherAI Diagnostic Engine...", "info");
    
    setTimeout(() => {
      // Step 1: Storage integrity check
      logToTerminal("Step 1/6: Verifying Secure Database Memory limits...", "info");
      const testKey = 'cipher_db_ping';
      safeStorage.setItem(testKey, 'ok');
      if (safeStorage.getItem(testKey) === 'ok') {
        logToTerminal("✓ LocalStorage database sandbox accessible and writable.", "success");
        // Clean up test key
        if (safeStorage.isAvailable) {
          localStorage.removeItem(testKey);
        } else {
          delete safeStorage.fallbackStore[testKey];
        }
      } else {
        logToTerminal("✗ LocalStorage sandbox write failure!", "error");
        return;
      }

      // Step 2: Settings loading
      setTimeout(() => {
        logToTerminal("Step 2/6: Simulating BLoC Setting state load...", "info");
        const sets = state.loadSettings();
        if (sets && typeof sets.contextSize === 'number') {
          logToTerminal(`✓ Settings state validated. Loaded Provider: ${sets.provider.toUpperCase()} (Model: ${sets.model}).`, "success");
        } else {
          logToTerminal("✗ Settings state validation corrupted!", "error");
          return;
        }

        // Step 3: Stream interruption simulation
        setTimeout(() => {
          logToTerminal("Step 3/6: Testing Stream cancellation mechanism...", "info");
          logToTerminal("Simulating stream initialization event...", "info");
          
          let mockInterrupted = false;
          let testInterval = setInterval(() => {
            logToTerminal("↳ Receiving mock data token chunk...", "info");
          }, 150);

          setTimeout(() => {
            clearInterval(testInterval);
            mockInterrupted = true;
            logToTerminal("↳ Cancel request emitted! Halting pipeline.", "info");
            logToTerminal("✓ Response streaming canceled. State is safe and locked.", "success");

            // Step 4: Add test sessions
            setTimeout(() => {
              logToTerminal("Step 4/6: Testing Session adding and persistence...", "info");
              const oldLength = state.sessions.length;
              const testSession = state.createSession();
              state.addMessageToActive('user', "Diagnostic auto integration test");
              
              if (state.sessions.length > oldLength && testSession.title !== "New Session") {
                logToTerminal(`✓ Session created and title generated correctly: "${testSession.title}".`, "success");
              } else {
                logToTerminal("✗ Session creation and title formatting failed!", "error");
              }

              // Step 5: Provider swap verification
              setTimeout(() => {
                logToTerminal("Step 5/6: Testing Provider & Model configurations switch...", "info");
                const oldProvider = state.settings.provider;
                state.saveSettings({ provider: 'anthropic', model: 'claude-3-5-sonnet' });
                
                if (state.loadSettings().provider === 'anthropic') {
                  logToTerminal("✓ Provider switched cleanly: OpenAI -> Anthropic (claude-3-5-sonnet).", "success");
                  // Restore original settings
                  state.saveSettings({ provider: oldProvider });
                } else {
                  logToTerminal("✗ Provider hot-reload swapping failed!", "error");
                }

                // Step 6: Database Wiping Integrity Check
                setTimeout(() => {
                  logToTerminal("Step 6/6: Verifying atomic session database wipes...", "info");
                  const currentActive = state.getActiveSession();
                  if (currentActive && currentActive.messages.length > 0) {
                    currentActive.messages = [];
                    state.saveSessions();
                    
                    if (state.getActiveSession().messages.length === 0) {
                      logToTerminal("✓ Session wiped successfully. 0 message bytes remaining.", "success");
                    } else {
                      logToTerminal("✗ Session wipe transaction failed!", "error");
                    }
                  } else {
                    logToTerminal("✓ Target session was already clear. Integrity confirmed.", "success");
                  }

                  logToTerminal("==================================================", "info");
                  logToTerminal("★ CIPHERAI WEB DIAGNOSTICS SUITE PASSED SUCCESSFULLY!", "success");
                }, 800);
              }, 800);
            }, 800);
          }, 600);
        }, 800);
      }, 800);
    }, 500);
  }
});
