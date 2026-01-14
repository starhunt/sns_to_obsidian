// Threads to Obsidian - Background Service Worker
// Handles communication between content script and Obsidian REST API

// Default settings
const DEFAULT_SETTINGS = {
  // Trigger settings
  triggerOnLike: true,
  triggerOnSave: true,

  // REST API settings
  protocol: 'http',
  host: 'localhost',
  port: '27123',
  apiKey: '',

  // Path settings
  vaultName: '',
  notesFolder: 'Threads',
  imageFolder: 'Threads_img',

  // File naming
  fileNameType: 'postDate', // 'postDate' or 'saveDate'

  // Media settings
  downloadImages: true,

  // Notification
  showNotification: true
};

// Initialize settings on install
chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.sync.get('settings');
  if (!stored.settings) {
    await chrome.storage.sync.set({ settings: DEFAULT_SETTINGS });
  }
  console.log('Threads to Obsidian extension installed');
});

// Get current settings
async function getSettings() {
  const stored = await chrome.storage.sync.get('settings');
  return { ...DEFAULT_SETTINGS, ...stored.settings };
}

// Build REST API URL
function buildApiUrl(settings, endpoint) {
  const baseUrl = `${settings.protocol}://${settings.host}:${settings.port}`;
  return `${baseUrl}${endpoint}`;
}

// Save note to Obsidian via REST API
async function saveToObsidian(noteData) {
  const settings = await getSettings();

  const { filename, content, images } = noteData;
  const notePath = `${settings.notesFolder}/${filename}`;

  const headers = {
    'Content-Type': 'text/markdown',
  };

  if (settings.apiKey) {
    headers['Authorization'] = `Bearer ${settings.apiKey}`;
  }

  try {
    // Save the markdown note
    const noteUrl = buildApiUrl(settings, `/vault/${encodeURIComponent(notePath)}`);
    const noteResponse = await fetch(noteUrl, {
      method: 'PUT',
      headers,
      body: content
    });

    if (!noteResponse.ok) {
      throw new Error(`Failed to save note: ${noteResponse.status}`);
    }

    // Download and save images if enabled
    if (settings.downloadImages && images && images.length > 0) {
      for (const image of images) {
        try {
          await saveImageToObsidian(settings, image);
        } catch (imgError) {
          console.error('Failed to save image:', imgError);
        }
      }
    }

    // Update stats
    await updateStats();

    return { success: true, path: notePath, vaultName: settings.vaultName };
  } catch (error) {
    console.error('Failed to save to Obsidian:', error);
    return { success: false, error: error.message };
  }
}

// Save image to Obsidian
async function saveImageToObsidian(settings, imageData) {
  const { url, filename } = imageData;
  const imagePath = `${settings.imageFolder}/${filename}`;

  // Fetch the image
  const imageResponse = await fetch(url);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image: ${imageResponse.status}`);
  }

  const imageBlob = await imageResponse.blob();
  const arrayBuffer = await imageBlob.arrayBuffer();

  const headers = {
    'Content-Type': imageBlob.type || 'image/jpeg',
  };

  if (settings.apiKey) {
    headers['Authorization'] = `Bearer ${settings.apiKey}`;
  }

  const imageUrl = buildApiUrl(settings, `/vault/${encodeURIComponent(imagePath)}`);
  const response = await fetch(imageUrl, {
    method: 'PUT',
    headers,
    body: arrayBuffer
  });

  if (!response.ok) {
    throw new Error(`Failed to save image: ${response.status}`);
  }

  return { success: true, path: imagePath };
}

// Message listener for content script communication
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_TO_OBSIDIAN') {
    saveToObsidian(message.data)
      .then(result => {
        sendResponse(result);

        // Show notification if enabled
        if (result.success) {
          getSettings().then(settings => {
            if (settings.showNotification) {
              chrome.notifications?.create({
                type: 'basic',
                iconUrl: 'assets/icons/icon48.png',
                title: 'Threads to Obsidian',
                message: `Saved: ${message.data.filename}`
              });
            }
          });
        }
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep message channel open for async response
  }

  if (message.type === 'GET_SETTINGS') {
    getSettings().then(settings => sendResponse(settings));
    return true;
  }

  if (message.type === 'TEST_CONNECTION') {
    testConnection().then(result => sendResponse(result));
    return true;
  }
});

// Test connection to Obsidian REST API
async function testConnection() {
  const settings = await getSettings();
  const url = buildApiUrl(settings, '/');

  const headers = {};
  if (settings.apiKey) {
    headers['Authorization'] = `Bearer ${settings.apiKey}`;
  }

  try {
    const response = await fetch(url, { headers });
    if (response.ok) {
      return { success: true, message: 'Connected to Obsidian REST API' };
    } else {
      return { success: false, message: `Connection failed: ${response.status}` };
    }
  } catch (error) {
    return { success: false, message: `Connection error: ${error.message}` };
  }
}

// Update stats for saved posts
async function updateStats() {
  const stored = await chrome.storage.local.get(['savedPosts', 'todayPosts', 'lastDate']);
  const today = new Date().toDateString();

  let savedPosts = (stored.savedPosts || 0) + 1;
  let todayPosts = stored.todayPosts || 0;

  // Reset today count if it's a new day
  if (stored.lastDate !== today) {
    todayPosts = 1;
  } else {
    todayPosts += 1;
  }

  await chrome.storage.local.set({
    savedPosts,
    todayPosts,
    lastDate: today
  });
}
