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
    showNotification: true
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
    saveStatus: document.getElementById('saveStatus')
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
        showNotification: elements.showNotification.checked
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
        notesFolder: elements.notesFolder.value.trim() || 'Threads',
        imageFolder: elements.imageFolder.value.trim() || 'Threads_img',
        fileNameType: elements.fileNameType.value,
        downloadImages: elements.downloadImages.checked,
        showNotification: elements.showNotification.checked
    };

    await chrome.storage.sync.set({ settings });
}

// Show status message
function showStatus(element, message, type) {
    element.textContent = message;
    element.className = `${element.id === 'connectionStatus' ? 'connection-status' : 'save-status'} show ${type}`;

    setTimeout(() => {
        element.classList.remove('show');
    }, 3000);
}

// Event listeners
elements.saveSettings.addEventListener('click', saveSettings);
elements.resetSettings.addEventListener('click', resetSettings);
elements.testConnection.addEventListener('click', testConnection);

// Initialize
loadSettings();
