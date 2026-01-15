// Threads to Obsidian - Background Service Worker
// Handles communication between content script and Obsidian REST API

// Import AI service
importScripts('ai-service.js');

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
  downloadImages: false,

  // Notification
  showNotification: true,

  // AI Settings
  aiEnabled: false,
  aiProvider: 'openai',
  aiApiKey: '',
  aiEndpoint: '',
  aiModel: 'gpt-4o-mini',
  aiMaxTokens: 64000,
  aiApiKeys: {
    openai: '',
    gemini: '',
    anthropic: '',
    grok: '',
    zai: '',
    custom: ''
  }
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

// Save with AI transformation
async function saveWithAI(data, sender) {
  const settings = await getSettings();
  const { postData, images } = data;

  let title = null;
  let transformedContent = null;
  let aiUsed = false;
  let failureReason = null;

  // Helper to send progress to content script
  const sendProgress = (stage, detail = '') => {
    if (sender?.tab?.id) {
      chrome.tabs.sendMessage(sender.tab.id, {
        type: 'AI_PROGRESS',
        stage,
        detail,
        model: settings.aiModel,
        provider: settings.aiProvider
      }).catch(() => { }); // Ignore if tab closed
    }
  };

  // Try AI transformation if enabled
  if (settings.aiEnabled && settings.aiApiKey && self.aiService) {
    console.log('[Threads to Obsidian] AI transformation starting...', {
      provider: settings.aiProvider,
      model: settings.aiModel,
      hasApiKey: !!settings.aiApiKey
    });

    try {
      // Single API call for both title and content
      sendProgress('content', 'AI 변환 중...');
      console.log('[Threads to Obsidian] Calling AI for transformation...');

      const result = await self.aiService.transformWithTitle(postData, settings);

      if (result.error) {
        failureReason = result.error;
        console.error('[Threads to Obsidian] AI transformation error:', result.error);
      } else if (result.content) {
        title = result.title;
        transformedContent = result.content;
        console.log('[Threads to Obsidian] AI transformation successful:', {
          titleGenerated: !!title,
          title: title,
          contentLength: transformedContent.length
        });
        aiUsed = true;
      } else {
        failureReason = 'AI가 빈 응답을 반환했습니다.';
        console.warn('[Threads to Obsidian] AI returned empty content');
      }
    } catch (error) {
      failureReason = error.message;
      console.error('[Threads to Obsidian] AI transformation failed:', {
        error: error.message,
        provider: settings.aiProvider,
        model: settings.aiModel
      });
    }
  } else {
    // Log why AI was not used
    if (!settings.aiEnabled) {
      failureReason = 'AI 변환이 비활성화되어 있습니다.';
    } else if (!settings.aiApiKey) {
      failureReason = 'API 키가 설정되지 않았습니다.';
    } else if (!self.aiService) {
      failureReason = 'AI 서비스를 로드할 수 없습니다.';
    }
    console.log('[Threads to Obsidian] AI not used:', failureReason);
  }

  // Step 2: Save to Obsidian
  sendProgress('saving', 'Obsidian에 저장 중...');

  // Build filename
  const username = postData.author.username.replace('@', '');
  const titlePart = title ? `_${title}` : '';
  const date = new Date(postData.timestamp || Date.now());
  const dateStr = formatDateForFilename(date);
  const filename = `@${username}${titlePart}_${dateStr}.md`;

  // Build final content
  let finalContent;
  if (transformedContent) {
    // Use AI transformed content with frontmatter
    finalContent = buildAIMarkdown(postData, transformedContent, settings);
  } else {
    // Fallback to original markdown
    console.log('[Threads to Obsidian] Using original markdown (AI transformation failed or disabled)');
    finalContent = data.originalMarkdown;
  }

  // Save to Obsidian
  const result = await saveToObsidian({
    filename,
    content: finalContent,
    images: settings.downloadImages ? images : []
  });

  // Add AI usage info to result
  result.aiUsed = aiUsed;
  result.failureReason = failureReason;

  return result;
}

// Format date for filename
function formatDateForFilename(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}`;
}

// Build markdown with AI content
function buildAIMarkdown(postData, aiContent, settings) {
  const now = new Date();
  const formatSeoulDate = (d) => d.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
  });

  const savedDate = formatSeoulDate(now);
  const postDate = postData.timestamp ? formatSeoulDate(new Date(postData.timestamp)) : '알 수 없음';

  // Extract topic from post
  const topic = postData.content.topic || null;

  let md = '---\n';
  md += 'source: threads\n';
  md += `type: ${postData.type}\n`;
  md += `author: "${postData.author.username}"\n`;
  md += `author_name: "${postData.author.displayName}"\n`;
  if (topic) {
    md += `topic: "${topic}"\n`;
  }
  md += `post_url: "${postData.url}"\n`;
  md += `saved_at: "${savedDate}"\n`;
  md += `post_date: "${postDate}"\n`;

  if (postData.type === 'thread' && postData.chainedPosts?.length > 0) {
    md += `thread_count: ${postData.chainedPosts.length + 1}\n`;
  }

  md += 'tags:\n  - threads\n';
  if (topic) {
    md += `  - ${topic.replace(/^#/, '')}\n`;
  }
  if (postData.content.tag) {
    md += `  - ${postData.content.tag.replace(/^#/, '')}\n`;
  }
  md += '---\n\n';

  // Post info section
  md += '## 📋 게시글 정보\n\n';
  md += '| 항목 | 내용 |\n';
  md += '|------|------|\n';
  md += `| 게시자 | [${postData.author.displayName} (${postData.author.username})](https://www.threads.com/${postData.author.username}) |\n`;
  if (topic) {
    md += `| 주제 | ${topic} |\n`;
  }
  md += `| 게시URL | [Threads에서 보기](${postData.url}) |\n`;
  md += `| 게시일 | ${postDate} |\n`;
  md += `| 저장일 | ${savedDate} |\n\n`;
  md += '---\n\n';

  // AI transformed content
  md += aiContent;

  // Original content section
  md += '\n\n---\n\n## 6. 원문\n\n';
  md += `> ${postData.content.text.split('\n').join('\n> ')}\n`;

  // Chained posts
  if (postData.chainedPosts?.length > 0) {
    postData.chainedPosts.forEach((post, i) => {
      md += `\n> ---\n> [${i + 2}/${postData.chainedPosts.length + 1}]\n`;
      md += `> ${post.text.split('\n').join('\n> ')}\n`;
    });
  }

  // Media section - use iframe for CDN URLs when not downloading images
  if (postData.content.media?.length > 0) {
    md += '\n---\n\n## 7. 미디어\n\n';
    postData.content.media.forEach((m, i) => {
      if (m.type === 'image') {
        if (settings.downloadImages && m.localPath) {
          // Use local image path (downloaded)
          md += `![이미지 ${i + 1}](${m.localPath})\n\n`;
        } else {
          // Use iframe for CDN image (avoids expiration issues)
          md += `<iframe width="560" height="400" src="${m.url}" title="이미지 ${i + 1}" frameborder="0"></iframe>\n\n`;
        }
      } else if (m.type === 'video') {
        // Check for YouTube embed
        const ytMatch = m.url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (ytMatch) {
          md += `<iframe width="560" height="315" src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allowfullscreen></iframe>\n\n`;
        } else {
          // Use iframe for video CDN URL
          md += `<iframe width="560" height="315" src="${m.url}" title="동영상 ${i + 1}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>\n\n`;
        }
      }
    });
  }

  // My Notes section
  md += '\n---\n\n## 8. My Notes\n\n';
  md += '### 관련 지식\n- \n\n';
  md += '### 아이디어\n- \n\n';
  md += '### 메모\n- \n\n';
  md += '---\n\n';
  md += `*Clipped: ${savedDate}*\n`;

  return md;
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

  // Save with AI transformation
  if (message.type === 'SAVE_WITH_AI') {
    (async () => {
      try {
        const result = await saveWithAI(message.data, sender);
        sendResponse(result);
      } catch (error) {
        console.error('SAVE_WITH_AI error:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (message.type === 'GET_SETTINGS') {
    getSettings().then(settings => sendResponse(settings));
    return true;
  }

  if (message.type === 'TEST_CONNECTION') {
    testConnection().then(result => sendResponse(result));
    return true;
  }

  if (message.type === 'TEST_AI_CONNECTION') {
    getSettings().then(settings => {
      if (self.aiService) {
        self.aiService.testAIConnection(settings).then(result => sendResponse(result));
      } else {
        sendResponse({ success: false, message: 'AI 서비스를 로드할 수 없습니다.' });
      }
    });
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
