// Threads to Obsidian - Options Page Script

// Default prompt template for AI transformation (includes title generation)
const DEFAULT_PROMPT_TEMPLATE = `다음은 Threads SNS 게시글입니다. 이 게시글을 분석하여 아래 형식으로 변환해주세요.
모든 내용은 한국어로 작성하세요.

---
게시자: {author}
원문:
{content}
---

**중요: 응답의 첫 줄에 파일 제목을 다음 형식으로 작성하세요:**
<<TITLE>>15-20자 이내의 핵심 요약 제목<</TITLE>>

(제목에는 특수문자 /, \\, :, *, ?, ", <, >, | 를 사용하지 마세요)

그 다음 줄부터 아래 형식으로 출력하세요:

## 1. 핵심 요약 (Executive Summary)

(1) 핵심 메시지 한 문장으로 요약
(2) 주요 포인트 3개를 번호 목록으로
(3) 대상 독자 설명

---

## 2. 주요 개념 (Key Concepts)

| 개념/용어 | 설명 | 맥락 |
|----------|------|------|
(게시글에서 추출한 주요 개념들을 테이블로 정리)

---

## 3. 상세 노트 (Detailed Notes)

(게시글의 내용을 단락별로 상세하게 풀어서 설명. 배경 맥락, 주요 논점, 근거 등 포함)

---

## 4. 실행 아이템 (Action Items)

- [ ] (게시글에서 도출한 실행 가능한 항목들을 체크박스 목록으로)

---

## 5. 쉬운 설명 (Feynman Explanation)

(Feynman 기법으로 게시글의 핵심 내용을 초등학생도 이해할 수 있게 쉽게 설명)

위 형식을 정확히 따라서 출력하세요. 섹션 헤더와 구분선을 유지하세요.`;

// Default settings
const DEFAULT_SETTINGS = {
    triggerOnLike: true,
    triggerOnSave: true,
    protocol: 'http',
    host: 'localhost',
    port: '27123',
    apiKey: '',
    vaultName: '',
    notesFolder: 'Threads',
    imageFolder: 'Threads_img',
    fileNameType: 'postDate',
    downloadImages: false,
    showNotification: true,
    // AI Settings
    aiEnabled: false,
    aiProvider: 'openai',
    aiApiKey: '',
    aiEndpoint: '',
    aiModel: 'gpt-4o-mini',
    aiMaxTokens: 64000,
    aiPromptTemplate: DEFAULT_PROMPT_TEMPLATE,
    // Provider-specific API keys (stored separately)
    aiApiKeys: {
        openai: '',
        gemini: '',
        anthropic: '',
        grok: '',
        zai: '',
        custom: ''
    }
};

// AI Provider configurations with latest models (2025)
const AI_PROVIDERS = {
    openai: {
        models: ['gpt-4.5-preview', 'gpt-4o', 'gpt-4o-mini', 'o1', 'o1-mini', 'o1-pro', 'gpt-4-turbo'],
        showEndpoint: false
    },
    gemini: {
        models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro', 'gemini-1.5-flash'],
        showEndpoint: false
    },
    anthropic: {
        models: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-latest', 'claude-3-5-opus-latest'],
        showEndpoint: false
    },
    grok: {
        models: ['grok-3', 'grok-3-mini', 'grok-2', 'grok-2-mini'],
        showEndpoint: false
    },
    zai: {
        models: ['GLM-4.5', 'GLM-4.7', 'GLM-4-Plus', 'GLM-4-Air'],
        showEndpoint: true,
        defaultEndpoint: 'https://api.z.ai/api/coding/paas/v4/chat/completions'
    },
    custom: {
        models: [],
        showEndpoint: true
    }
};

// DOM Elements
const elements = {
    triggerOnLike: document.getElementById('triggerOnLike'),
    triggerOnSave: document.getElementById('triggerOnSave'),
    protocol: document.getElementById('protocol'),
    host: document.getElementById('host'),
    port: document.getElementById('port'),
    apiKey: document.getElementById('apiKey'),
    vaultName: document.getElementById('vaultName'),
    notesFolder: document.getElementById('notesFolder'),
    imageFolder: document.getElementById('imageFolder'),
    fileNameType: document.getElementById('fileNameType'),
    downloadImages: document.getElementById('downloadImages'),
    showNotification: document.getElementById('showNotification'),
    testConnection: document.getElementById('testConnection'),
    connectionStatus: document.getElementById('connectionStatus'),
    saveSettings: document.getElementById('saveSettings'),
    resetSettings: document.getElementById('resetSettings'),
    saveStatus: document.getElementById('saveStatus'),
    // AI Elements
    aiEnabled: document.getElementById('aiEnabled'),
    aiProvider: document.getElementById('aiProvider'),
    aiApiKey: document.getElementById('aiApiKey'),
    aiEndpoint: document.getElementById('aiEndpoint'),
    aiEndpointContainer: document.getElementById('aiEndpointContainer'),
    aiModel: document.getElementById('aiModel'),
    aiMaxTokens: document.getElementById('aiMaxTokens'),
    testAiConnection: document.getElementById('testAiConnection'),
    aiConnectionStatus: document.getElementById('aiConnectionStatus'),
    aiPromptTemplate: document.getElementById('aiPromptTemplate'),
    resetPromptTemplate: document.getElementById('resetPromptTemplate')
};

// Load settings from storage
async function loadSettings() {
    const stored = await chrome.storage.sync.get('settings');
    const settings = { ...DEFAULT_SETTINGS, ...stored.settings };

    elements.triggerOnLike.checked = settings.triggerOnLike;
    elements.triggerOnSave.checked = settings.triggerOnSave;
    elements.protocol.value = settings.protocol;
    elements.host.value = settings.host;
    elements.port.value = settings.port;
    elements.apiKey.value = settings.apiKey;
    elements.vaultName.value = settings.vaultName;
    elements.notesFolder.value = settings.notesFolder;
    elements.imageFolder.value = settings.imageFolder;
    elements.fileNameType.value = settings.fileNameType;
    elements.downloadImages.checked = settings.downloadImages;
    elements.showNotification.checked = settings.showNotification;

    // AI Settings
    elements.aiEnabled.checked = settings.aiEnabled;
    elements.aiProvider.value = settings.aiProvider;

    // Load provider-specific API key
    const aiApiKeys = settings.aiApiKeys || DEFAULT_SETTINGS.aiApiKeys;
    elements.aiApiKey.value = aiApiKeys[settings.aiProvider] || settings.aiApiKey || '';

    elements.aiEndpoint.value = settings.aiEndpoint;
    elements.aiMaxTokens.value = settings.aiMaxTokens || 64000;
    elements.aiPromptTemplate.value = settings.aiPromptTemplate || DEFAULT_PROMPT_TEMPLATE;

    // Store current aiApiKeys for provider switching
    elements.aiApiKey.dataset.aiApiKeys = JSON.stringify(aiApiKeys);

    // Update model dropdown and endpoint visibility
    updateAiModelOptions(settings.aiProvider, settings.aiModel);
    updateEndpointVisibility(settings.aiProvider);
}

// Save settings to storage
async function saveSettings() {
    const settings = {
        triggerOnLike: elements.triggerOnLike.checked,
        triggerOnSave: elements.triggerOnSave.checked,
        protocol: elements.protocol.value,
        host: elements.host.value.trim(),
        port: elements.port.value.trim(),
        apiKey: elements.apiKey.value.trim(),
        vaultName: elements.vaultName.value.trim(),
        notesFolder: elements.notesFolder.value.trim() || 'Threads',
        imageFolder: elements.imageFolder.value.trim() || 'Threads_img',
        fileNameType: elements.fileNameType.value,
        downloadImages: elements.downloadImages.checked,
        showNotification: elements.showNotification.checked,
        // AI Settings
        aiEnabled: elements.aiEnabled.checked,
        aiProvider: elements.aiProvider.value,
        aiApiKey: elements.aiApiKey.value.trim(),
        aiEndpoint: elements.aiEndpoint.value.trim(),
        aiModel: elements.aiModel.value,
        aiMaxTokens: parseInt(elements.aiMaxTokens.value) || 64000,
        aiPromptTemplate: elements.aiPromptTemplate.value || DEFAULT_PROMPT_TEMPLATE,
        // Update provider-specific API keys
        aiApiKeys: (() => {
            const currentKeys = JSON.parse(elements.aiApiKey.dataset.aiApiKeys || '{}');
            currentKeys[elements.aiProvider.value] = elements.aiApiKey.value.trim();
            return { ...DEFAULT_SETTINGS.aiApiKeys, ...currentKeys };
        })()
    };

    await chrome.storage.sync.set({ settings });
    showStatus(elements.saveStatus, '✅ 설정이 저장되었습니다.', 'success');
}

// Reset to default settings
async function resetSettings() {
    await chrome.storage.sync.set({ settings: DEFAULT_SETTINGS });
    await loadSettings();
    showStatus(elements.saveStatus, '🔄 기본 설정으로 복원되었습니다.', 'success');
}

// Test REST API connection
async function testConnection() {
    elements.testConnection.disabled = true;
    elements.testConnection.textContent = '🔄 연결 중...';

    try {
        // First, save current settings so the test uses them
        await saveSettingsQuietly();

        const result = await chrome.runtime.sendMessage({ type: 'TEST_CONNECTION' });

        if (result.success) {
            showStatus(elements.connectionStatus, '✅ ' + result.message, 'success');
        } else {
            showStatus(elements.connectionStatus, '❌ ' + result.message, 'error');
        }
    } catch (error) {
        showStatus(elements.connectionStatus, '❌ 연결 테스트 실패: ' + error.message, 'error');
    }

    elements.testConnection.disabled = false;
    elements.testConnection.textContent = '🔍 연결 테스트';
}

// Save settings without showing notification
async function saveSettingsQuietly() {
    const settings = {
        triggerOnLike: elements.triggerOnLike.checked,
        triggerOnSave: elements.triggerOnSave.checked,
        protocol: elements.protocol.value,
        host: elements.host.value.trim(),
        port: elements.port.value.trim(),
        apiKey: elements.apiKey.value.trim(),
        vaultName: elements.vaultName.value.trim(),
        notesFolder: elements.notesFolder.value.trim() || 'Threads',
        imageFolder: elements.imageFolder.value.trim() || 'Threads_img',
        fileNameType: elements.fileNameType.value,
        downloadImages: elements.downloadImages.checked,
        showNotification: elements.showNotification.checked,
        aiEnabled: elements.aiEnabled.checked,
        aiProvider: elements.aiProvider.value,
        aiApiKey: elements.aiApiKey.value.trim(),
        aiEndpoint: elements.aiEndpoint.value.trim(),
        aiModel: elements.aiModel.value
    };

    await chrome.storage.sync.set({ settings });
}

// Update AI model dropdown based on provider
function updateAiModelOptions(provider, selectedModel = null) {
    const providerConfig = AI_PROVIDERS[provider];
    elements.aiModel.innerHTML = '';

    if (providerConfig.models.length === 0) {
        // Custom provider - allow manual input
        const option = document.createElement('option');
        option.value = selectedModel || 'custom-model';
        option.textContent = selectedModel || '모델명을 입력하세요';
        elements.aiModel.appendChild(option);
    } else {
        providerConfig.models.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            if (model === selectedModel) {
                option.selected = true;
            }
            elements.aiModel.appendChild(option);
        });
    }
}

// Update endpoint field visibility based on provider
function updateEndpointVisibility(provider) {
    const providerConfig = AI_PROVIDERS[provider];
    elements.aiEndpointContainer.style.display = providerConfig.showEndpoint ? 'block' : 'none';

    // Set default endpoint for zai
    if (provider === 'zai' && !elements.aiEndpoint.value) {
        elements.aiEndpoint.value = providerConfig.defaultEndpoint;
    }
}

// Test AI connection
async function testAiConnection() {
    elements.testAiConnection.disabled = true;
    elements.testAiConnection.textContent = '🔄 테스트 중...';

    try {
        await saveSettingsQuietly();

        const result = await chrome.runtime.sendMessage({ type: 'TEST_AI_CONNECTION' });

        if (result.success) {
            showStatus(elements.aiConnectionStatus, '✅ ' + result.message, 'success');
        } else {
            showStatus(elements.aiConnectionStatus, '❌ ' + result.message, 'error');
        }
    } catch (error) {
        showStatus(elements.aiConnectionStatus, '❌ AI 연결 테스트 실패: ' + error.message, 'error');
    }

    elements.testAiConnection.disabled = false;
    elements.testAiConnection.textContent = '🔍 AI 연결 테스트';
}

// Show status message
function showStatus(element, message, type) {
    element.textContent = message;
    element.className = `connection-status show ${type}`;

    setTimeout(() => {
        element.classList.remove('show');
    }, 3000);
}

// Event listeners
elements.saveSettings.addEventListener('click', saveSettings);
elements.resetSettings.addEventListener('click', resetSettings);
elements.testConnection.addEventListener('click', testConnection);
elements.testAiConnection.addEventListener('click', testAiConnection);

// AI Provider change handler - swap API keys when switching
elements.aiProvider.addEventListener('change', (e) => {
    const newProvider = e.target.value;
    const previousProvider = e.target.dataset.previousProvider || 'openai';

    // Save current API key to the previous provider
    const currentKeys = JSON.parse(elements.aiApiKey.dataset.aiApiKeys || '{}');
    currentKeys[previousProvider] = elements.aiApiKey.value.trim();
    elements.aiApiKey.dataset.aiApiKeys = JSON.stringify(currentKeys);

    // Load API key for the new provider
    elements.aiApiKey.value = currentKeys[newProvider] || '';

    // Store current provider for next switch
    e.target.dataset.previousProvider = newProvider;

    updateAiModelOptions(newProvider);
    updateEndpointVisibility(newProvider);
});

// Reset prompt template handler
elements.resetPromptTemplate.addEventListener('click', () => {
    elements.aiPromptTemplate.value = DEFAULT_PROMPT_TEMPLATE;
    showStatus(elements.aiConnectionStatus, '🔄 기본 템플릿으로 복원되었습니다.', 'success');
});

// Initialize
loadSettings();

