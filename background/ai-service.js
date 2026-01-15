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
    const { aiProvider, aiApiKey, aiEndpoint, aiModel } = settings;

    if (!aiApiKey) {
        throw new Error('API 키가 설정되지 않았습니다.');
    }

    switch (aiProvider) {
        case 'openai':
        case 'grok':
            return await callOpenAICompatible(prompt, aiApiKey, AI_ENDPOINTS[aiProvider], aiModel);
        case 'gemini':
            return await callGemini(prompt, aiApiKey, aiModel);
        case 'anthropic':
            return await callAnthropic(prompt, aiApiKey, aiModel);
        case 'zai':
            const endpoint = aiEndpoint || AI_ENDPOINTS.zai;
            return await callOpenAICompatible(prompt, aiApiKey, endpoint, aiModel);
        case 'custom':
            if (!aiEndpoint) throw new Error('커스텀 엔드포인트가 설정되지 않았습니다.');
            return await callOpenAICompatible(prompt, aiApiKey, aiEndpoint, aiModel);
        default:
            throw new Error(`지원하지 않는 프로바이더: ${aiProvider}`);
    }
}

// OpenAI-compatible API call (OpenAI, Grok, zai, Custom)
async function callOpenAICompatible(prompt, apiKey, endpoint, model) {
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
            max_tokens: 4000
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
async function callGemini(prompt, apiKey, model) {
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
                maxOutputTokens: 4000
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
async function callAnthropic(prompt, apiKey, model) {
    const response = await fetch(AI_ENDPOINTS.anthropic, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: model,
            max_tokens: 4000,
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

// Generate summarized title from content
async function generateTitle(content, settings) {
    const prompt = `다음 SNS 게시글의 핵심 내용을 15-20자 이내의 한국어 제목으로 요약하세요.
특수문자나 파일명에 사용할 수 없는 문자(/, \\, :, *, ?, ", <, >, |)는 제외하세요.
제목만 출력하세요. 따옴표나 다른 텍스트 없이 제목만 출력합니다.

게시글:
${content.substring(0, 1000)}`;

    try {
        const title = await callAI(prompt, settings);
        // Clean title for filename safety
        return title.trim()
            .replace(/[\/\\:*?"<>|]/g, '')
            .substring(0, 30);
    } catch (error) {
        console.error('Title generation failed:', error);
        return null;
    }
}

// Transform post content using AI
async function transformContent(postData, settings) {
    const prompt = buildTransformPrompt(postData);

    try {
        return await callAI(prompt, settings);
    } catch (error) {
        console.error('Content transformation failed:', error);
        return null;
    }
}

// Build transformation prompt
function buildTransformPrompt(postData) {
    const content = postData.content.text;
    const author = postData.author.displayName || postData.author.username;
    const chainedContent = postData.chainedPosts?.map((p, i) =>
        `[${i + 2}/${postData.chainedPosts.length + 1}] ${p.text}`
    ).join('\n\n') || '';

    const fullContent = chainedContent
        ? `${content}\n\n--- 연결된 게시물 ---\n${chainedContent}`
        : content;

    return `다음은 Threads SNS 게시글입니다. 이 게시글을 분석하여 아래 형식으로 변환해주세요.
모든 내용은 한국어로 작성하세요.

---
게시자: ${author}
원문:
${fullContent}
---

다음 형식으로 출력하세요:

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
        generateTitle,
        transformContent,
        testAIConnection
    };
}
