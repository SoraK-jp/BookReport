require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('Public'));

// ===== 定数定義 =====
const CONFIG = {
    BOOK_REVIEW: {
        TITLE_MAX: 200,
        FOCUS_MAX: 500,
        TARGET_CHAR_COUNT: 400,
        MIN_CHAR_COUNT: 380,
        MAX_CHAR_COUNT: 420,
    },
    GEMINI: {
        MODEL: 'gemini-2.5-flash',
        TEMPERATURE: 0.9,
        TOP_P: 0.95,
        TOP_K: 40,
        MAX_TOKENS: 1024,
    }
};

// Gemini AI初期化
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error('❌ Error: GEMINI_API_KEY is not set in environment variables');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// ===== ユーティリティ関数 =====

/**
 * リクエスト入力値のバリデーション
 */
function validateBookReviewInput(title, author, focus) {
    const errors = [];

    if (!title || !focus) {
        errors.push('タイトルと焦点は必須です。');
    }

    if (title.length > CONFIG.BOOK_REVIEW.TITLE_MAX) {
        errors.push(`タイトルは${CONFIG.BOOK_REVIEW.TITLE_MAX}文字以内である必要があります。`);
    }

    if (focus.length > CONFIG.BOOK_REVIEW.FOCUS_MAX) {
        errors.push(`焦点は${CONFIG.BOOK_REVIEW.FOCUS_MAX}文字以内である必要があります。`);
    }

    return errors.length > 0 ? errors : null;
}

/**
 * Gemini APIレスポンスからテキストを抽出
 */
async function extractTextFromResponse(result) {
    try {
        // 方法1: response.text()を使用
        if (result.response && typeof result.response.text === 'function') {
            return await result.response.text();
        }
        // 方法2: candidatesから直接取得
        if (result.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
            return result.response.candidates[0].content.parts[0].text;
        }
        // 方法3: resultから直接取得
        if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
            return result.candidates[0].content.parts[0].text;
        }
    } catch (textError) {
        console.error('⚠️ Error extracting text:', textError);
        // エラー時は代替方法を試行
        if (result.response?.candidates?.[0]?.content?.parts) {
            const parts = result.response.candidates[0].content.parts;
            return parts.map(part => part.text || '').join('');
        }
    }
    return '';
}

/**
 * エラーレスポンスを構築して返す
 */
function handleApiError(error, res) {
    console.error('❌ Server Error:', error);
    console.error('Error stack:', error.stack);

    const isDevelopment = process.env.NODE_ENV === 'development';

    // APIキーエラー
    if (error.message?.includes('API key') || error.message?.includes('API_KEY')) {
        return res.status(401).json({ 
            error: 'APIキーが無効です。管理者に連絡してください。'
        });
    }

    // レート制限エラー
    if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
        return res.status(429).json({ 
            error: 'リクエスト制限に達しました。しばらく待ってから再試行してください。'
        });
    }

    // セーフティフィルターエラー
    if (error.message?.includes('SAFETY') || error.message?.includes('blocked')) {
        return res.status(400).json({ 
            error: 'コンテンツが安全性フィルターによってブロックされました。別の焦点や表現で再試行してください。'
        });
    }

    // その他のエラー
    return res.status(500).json({ 
        error: '感想文の生成中にエラーが発生しました。',
        details: isDevelopment ? error.message : undefined
    });
}

/**
 * プロンプト検証エラーをレスポンスで返す
 */
function handlePromptFeedback(result, res) {
    if (result.response?.promptFeedback) {
        console.error('Prompt Feedback:', result.response.promptFeedback);
        return res.status(400).json({
            error: 'リクエストが安全性フィルターによってブロックされました。',
            feedback: result.response.promptFeedback
        });
    }
    return null;
}

/**
 * プロンプト構築関数
 */
function buildPrompt(title, author, focus) {
    const authorInfo = author ? `著者: ${author}` : '';
    
    return `以下の書籍について、読書感想文を作成してください。

【書籍情報】
タイトル: ${title}
${authorInfo}

【感想文の焦点】
${focus}

【指示】
1. まず、この書籍「${title}${author ? '（' + author + '）' : ''}」について、あらすじ、主なテーマ、評価などの基本情報を調査してください
2. 上記の「感想文の焦点」を中心に、${CONFIG.BOOK_REVIEW.TARGET_CHAR_COUNT}文字前後の読書感想文を作成してください
3. 単なるあらすじ紹介ではなく、焦点に沿った深い考察と個人的な感想を含めてください
4. 導入（50字）→ 本文（280字）→ 結論（70字）の構成で書いてください
5. です・ます調で統一してください

それでは、読書感想文を作成してください:`;
}

// ===== APIエンドポイント =====

/**
 * 読書感想文生成APIエンドポイント
 */
app.post('/api/generate-review', async (req, res) => {
    const { title, author, focus } = req.body;

    // バリデーション
    const validationErrors = validateBookReviewInput(title, author, focus);
    if (validationErrors) {
        return res.status(400).json({ 
            error: validationErrors[0],
            details: validationErrors,
            required: ['title', 'focus']
        });
    }

    try {
        console.log('📝 Generating review for:', title);

        // Gemini AI初期化
        const model = genAI.getGenerativeModel({
            model: CONFIG.GEMINI.MODEL,
            systemInstruction: `あなたは経験豊富な書評家です。以下のガイドラインに従って読書感想文を作成してください:

【作成ガイドライン】
1. 構成: 導入（50字）→ 本文（280字）→ 結論（70字）の3部構成
2. 文字数: 合計${CONFIG.BOOK_REVIEW.TARGET_CHAR_COUNT}文字前後（${CONFIG.BOOK_REVIEW.MIN_CHAR_COUNT}〜${CONFIG.BOOK_REVIEW.MAX_CHAR_COUNT}文字）
3. 文体: です・ます調で統一
4. 内容:
   - 導入: 本との出会いや第一印象
   - 本文: ユーザーが指定した焦点に沿った具体的な考察
   - 結論: 本から得た学びや今後の展望
5. 注意事項:
   - あらすじの要約ではなく、個人的な感想と考察を中心に
   - 具体的なエピソードや場面に言及
   - 自分の経験や価値観との関連付け`
        });

        // プロンプト構築
        const prompt = buildPrompt(title, author, focus);
        
        // Gemini APIリクエスト
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            tools: [{ googleSearch: {} }],
            generationConfig: {
                temperature: CONFIG.GEMINI.TEMPERATURE,
                topP: CONFIG.GEMINI.TOP_P,
                topK: CONFIG.GEMINI.TOP_K,
                maxOutputTokens: CONFIG.GEMINI.MAX_TOKENS,
            }
        });

        // デバッグ: レスポンス全体をログ出力
        if (process.env.NODE_ENV === 'development') {
            console.log('🔍 Full response:', JSON.stringify(result, null, 2));
        }

        // プロンプトフィードバック確認
        const feedbackError = handlePromptFeedback(result, res);
        if (feedbackError) return feedbackError;

        // テキスト抽出
        const text = await extractTextFromResponse(result);

        // テキストの存在確認
        if (!text || text.trim().length === 0) {
            console.error('❌ Empty response from Gemini API');
            console.error('Response structure:', JSON.stringify(result, null, 2));
            throw new Error('Gemini APIから有効なテキストが返されませんでした');
        }

        // 文字数カウント
        const charCount = text.replace(/\s/g, '').length;
        
        console.log(`✅ Generated ${charCount} characters`);

        res.json({ 
            text: text.trim(),
            metadata: {
                characterCount: charCount,
                model: CONFIG.GEMINI.MODEL,
                searchUsed: true
            }
        });

    } catch (error) {
        handleApiError(error, res);
    }
});

/**
 * ヘルスチェックエンドポイント
 */
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        geminiConfigured: !!GEMINI_API_KEY,
        nodeEnv: process.env.NODE_ENV || 'production'
    });
});


// 404ハンドラー
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});

// エラーハンドラー
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running at http://localhost:${PORT}`);
    console.log(`📚 Book Review Generator API is ready`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'production'}`);
});