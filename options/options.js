// Threads to Obsidian - Options Page Script

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
    downloadImages: true,
    showNotification: true,
    // AI Settings
    aiEnabled: false,
    aiProvider: 'openai',
    aiApiKey: '',
    aiEndpoint: '',
    aiModel: 'gpt-4o-mini'
};

// AI Provider configurations
const AI_PROVIDERS = {
    openai: {
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        showEndpoint: false
    },
    gemini: {
        models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'],
        showEndpoint: false
    },
    anthropic: {
        models: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-latest'],
        showEndpoint: false
    },
    grok: {
        models: ['grok-2', 'grok-2-mini'],
        showEndpoint: false
    },
    zai: {
        models: ['GLM-4.7', 'GLM-4-Plus'],
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
    testAiConnection: document.getElementById('testAiConnection'),
    aiConnectionStatus: document.getElementById('aiConnectionStatus')
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
    elements.aiApiKey.value = settings.aiApiKey;
    elements.aiEndpoint.value = settings.aiEndpoint;

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
        aiModel: elements.aiModel.value
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

// AI Provider change handler
elements.aiProvider.addEventListener('change', (e) => {
    const provider = e.target.value;
    updateAiModelOptions(provider);
    updateEndpointVisibility(provider);
});

// Initialize
loadSettings();

