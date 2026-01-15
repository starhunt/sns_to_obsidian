// AI Service Module - Handles AI API calls for content transformation

// AI Provider endpoint configurations
const AI_ENDPOINTS = {
    openai: 'https://api.openai.com/v1/chat/completions',
    gemini: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
    anthropic: 'https://api.anthropic.com/v1/messages',
    grok: 'https://api.x.ai/v1/chat/completions',
    zai: 'https://api.z.ai/api/coding/paas/v4/chat/completions'
};

// Call AI API based on provider
async function callAI(prompt, settings) {
    const { aiProvider, aiApiKey, aiEndpoint, aiModel, aiMaxTokens = 64000 } = settings;

    if (!aiApiKey) {
        throw new Error('API 키가 설정되지 않았습니다.');
    }

    switch (aiProvider) {
        case 'openai':
        case 'grok':
            return await callOpenAICompatible(prompt, aiApiKey, AI_ENDPOINTS[aiProvider], aiModel, aiMaxTokens);
        case 'gemini':
            return await callGemini(prompt, aiApiKey, aiModel, aiMaxTokens);
        case 'anthropic':
            return await callAnthropic(prompt, aiApiKey, aiModel, aiMaxTokens);
        case 'zai':
            const endpoint = aiEndpoint || AI_ENDPOINTS.zai;
            return await callOpenAICompatible(prompt, aiApiKey, endpoint, aiModel, aiMaxTokens);
        case 'custom':
            if (!aiEndpoint) throw new Error('커스텀 엔드포인트가 설정되지 않았습니다.');
            return await callOpenAICompatible(prompt, aiApiKey, aiEndpoint, aiModel, aiMaxTokens);
        default:
            throw new Error(`지원하지 않는 프로바이더: ${aiProvider}`);
    }
}

// OpenAI-compatible API call (OpenAI, Grok, zai, Custom)
async function callOpenAICompatible(prompt, apiKey, endpoint, model, maxTokens) {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: maxTokens
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`API 오류 (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// Google Gemini API call
async function callGemini(prompt, apiKey, model, maxTokens) {
    const endpoint = AI_ENDPOINTS.gemini.replace('{model}', model) + `?key=${apiKey}`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: maxTokens
            }
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API 오류 (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

// Anthropic Claude API call
async function callAnthropic(prompt, apiKey, model, maxTokens) {
    const response = await fetch(AI_ENDPOINTS.anthropic, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: model,
            max_tokens: maxTokens,
            messages: [{ role: 'user', content: prompt }]
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Anthropic API 오류 (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.content[0].text;
}

// Transform post content AND generate title in single API call
async function transformWithTitle(postData, settings) {
    const prompt = buildTransformPrompt(postData, settings);

    try {
        const response = await callAI(prompt, settings);

        // Parse title and content from response
        let title = null;
        let content = response;

        // Strategy 1: Look for <<TITLE>> tags (flexible regex, multiline support)
        const titleMatch = response.match(/<<TITLE>>\s*([\s\S]+?)\s*<<\/?TITLE>>/i);

        if (titleMatch) {
            title = titleMatch[1];
            // Remove the title tag block from content
            content = response.replace(/<<TITLE>>[\s\S]+?<<\/?TITLE>>\n?/i, '').trim();
        } else {
            // Strategy 2: Look for "Title:" or "제목:" at the start
            const lines = response.split('\n');
            const firstLine = lines[0].trim();

            if (firstLine.match(/^(Title|제목)\s*[:]\s*(.+)$/i)) {
                title = firstLine.match(/^(Title|제목)\s*[:]\s*(.+)$/i)[2];
                content = lines.slice(1).join('\n').trim();
            }
            // Strategy 3: Heuristic - if first line is short (< 50 chars) and not a markdown header/separator
            else if (firstLine.length > 0 && firstLine.length < 50 && !firstLine.startsWith('#') && !firstLine.startsWith('---')) {
                title = firstLine;
                content = lines.slice(1).join('\n').trim();
            }
        }

        // Clean title if found
        if (title) {
            title = title.trim()
                .replace(/[\/\\:*?"<>|]/g, '') // Remove invalid filename chars
                .replace(/\.$/, '')            // Remove trailing dot
                .substring(0, 50);             // Limit length
        }

        return { title, content };
    } catch (error) {
        console.error('[AI Service] Transform failed:', error);
        return { title: null, content: null, error: error.message };
    }
}

// Default prompt template (fallback) - includes title generation
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

// Build transformation prompt using custom template from settings
function buildTransformPrompt(postData, settings) {
    const content = postData.content.text;
    const author = postData.author.displayName || postData.author.username;
    const chainedContent = postData.chainedPosts?.map((p, i) =>
        `[${i + 2}/${postData.chainedPosts.length + 1}] ${p.text}`
    ).join('\n\n') || '';

    const fullContent = chainedContent
        ? `${content}\n\n--- 연결된 게시물 ---\n${chainedContent}`
        : content;

    // Use custom template from settings or default
    const template = settings.aiPromptTemplate || DEFAULT_PROMPT_TEMPLATE;

    // Replace placeholders
    return template
        .replace(/\{author\}/g, author)
        .replace(/\{content\}/g, fullContent);
}

// Test AI connection
async function testAIConnection(settings) {
    const testPrompt = '안녕하세요. 연결 테스트입니다. "연결 성공"이라고만 응답해주세요.';

    try {
        const response = await callAI(testPrompt, settings);
        return {
            success: true,
            message: `연결 성공! 응답: ${response.substring(0, 50)}...`
        };
    } catch (error) {
        return {
            success: false,
            message: error.message
        };
    }
}

// Export functions for use in service worker
if (typeof self !== 'undefined') {
    self.aiService = {
        callAI,
        transformWithTitle,
        testAIConnection
    };
}
