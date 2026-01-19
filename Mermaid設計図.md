# 読書感想文生成アプリ - Mermaid設計図

## 1. クラス図 (Class Diagram)

システムの主要クラスとその関係性を示します。

```mermaid
classDiagram
    %% フロントエンドクラス
    class BookReviewApp {
        -formElement: HTMLFormElement
        -resultElement: HTMLElement
        -loadingElement: HTMLElement
        +initialize()
        +handleSubmit(event)
        +generateReview(data)
        +displayResult(text)
        +showError(message)
        +showLoading()
        +hideLoading()
    }

    %% サーバークラス
    class ExpressServer {
        -app: Express
        -port: number
        -genAI: GoogleGenerativeAI
        +constructor()
        +initializeRoutes()
        +listen()
        +serveStaticFiles()
    }

    class APIController {
        +generateReview(req, res)
        +healthCheck(req, res)
        +handleNotFound(req, res)
        +handleError(err, req, res, next)
    }

    class ValidationService {
        +validateBookReviewInput(title, author, focus)
        -checkRequired(value)
        -checkMaxLength(value, max)
        +getErrors()
    }

    class PromptBuilder {
        -config: Config
        +buildPrompt(title, author, focus)
        +buildSystemInstruction()
        -formatBookInfo(title, author)
        -formatFocus(focus)
    }

    class GeminiService {
        -apiKey: string
        -model: GenerativeModel
        -config: GeminiConfig
        +generateContent(prompt)
        +extractText(result)
        -handleSafetyFilter(result)
        -handleApiError(error)
    }

    class ResponseHandler {
        +handleSuccess(res, text, metadata)
        +handleValidationError(res, errors)
        +handleApiKeyError(res)
        +handleRateLimitError(res)
        +handleSafetyError(res)
        +handleServerError(res, error)
    }

    %% 設定・定数クラス
    class Config {
        +BOOK_REVIEW: BookReviewConfig
        +GEMINI: GeminiConfig
    }

    class BookReviewConfig {
        +TITLE_MAX: 200
        +FOCUS_MAX: 500
        +TARGET_CHAR_COUNT: 400
        +MIN_CHAR_COUNT: 380
        +MAX_CHAR_COUNT: 420
    }

    class GeminiConfig {
        +MODEL: string
        +TEMPERATURE: number
        +TOP_P: number
        +TOP_K: number
        +MAX_TOKENS: number
    }

    %% データモデル
    class BookReviewRequest {
        +title: string
        +author: string
        +focus: string
    }

    class BookReviewResponse {
        +text: string
        +metadata: Metadata
    }

    class Metadata {
        +characterCount: number
        +model: string
        +searchUsed: boolean
    }

    class ErrorResponse {
        +error: string
        +details: string[]
        +required: string[]
    }

    %% 関係性
    BookReviewApp --> APIController : HTTP Request
    
    ExpressServer --> APIController : uses
    ExpressServer --> Config : uses
    
    APIController --> ValidationService : validates
    APIController --> PromptBuilder : builds prompt
    APIController --> GeminiService : generates
    APIController --> ResponseHandler : sends response
    
    PromptBuilder --> Config : uses
    GeminiService --> Config : uses
    
    ValidationService ..> BookReviewRequest : validates
    ResponseHandler ..> BookReviewResponse : creates
    ResponseHandler ..> ErrorResponse : creates
    
    BookReviewResponse --> Metadata : contains
    
    Config --> BookReviewConfig : contains
    Config --> GeminiConfig : contains
```

---

## 2. ユースケース図 (Use Case Diagram)

システムの機能とアクターの関係を示します。

```mermaid
graph TB
    subgraph システム境界["読書感想文生成システム"]
        UC1[読書感想文を生成する]
        UC2[書籍情報を入力する]
        UC3[感想の焦点を指定する]
        UC4[生成結果を表示する]
        UC5[エラーを処理する]
        UC6[書籍情報を検索する]
        UC7[感想文を執筆する]
        UC8[入力値を検証する]
        UC9[システム状態を確認する]
    end
    
    %% アクター
    User([ユーザー])
    GeminiAPI([Gemini API])
    GoogleSearch([Google検索])
    
    %% ユーザーとユースケースの関係
    User -->|実行| UC1
    User -->|入力| UC2
    User -->|指定| UC3
    User -->|閲覧| UC4
    User -->|確認| UC9
    
    %% ユースケース間の関係
    UC1 ..>|include| UC2
    UC1 ..>|include| UC3
    UC1 ..>|include| UC8
    UC1 ..>|include| UC6
    UC1 ..>|include| UC7
    UC1 ..>|include| UC4
    
    UC8 ..>|extend 失敗時| UC5
    UC6 ..>|extend 失敗時| UC5
    UC7 ..>|extend 失敗時| UC5
    
    %% 外部システムとの関係
    UC6 -->|依頼| GoogleSearch
    UC7 -->|依頼| GeminiAPI
    GeminiAPI -->|利用| GoogleSearch
    
    %% スタイル
    classDef actorStyle fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef ucStyle fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef systemStyle fill:#f3e5f5,stroke:#4a148c,stroke-width:3px
    
    class User,GeminiAPI,GoogleSearch actorStyle
    class UC1,UC2,UC3,UC4,UC5,UC6,UC7,UC8,UC9 ucStyle
```

**ユースケース詳細:**

| ID | ユースケース名 | 説明 | 主アクター |
|----|--------------|------|-----------|
| UC1 | 読書感想文を生成する | メイン機能：書籍の感想文を生成 | ユーザー |
| UC2 | 書籍情報を入力する | タイトル・著者を入力 | ユーザー |
| UC3 | 感想の焦点を指定する | 感想文の視点・テーマを指定 | ユーザー |
| UC4 | 生成結果を表示する | 完成した感想文を画面表示 | ユーザー |
| UC5 | エラーを処理する | エラーメッセージを表示 | システム |
| UC6 | 書籍情報を検索する | Google検索で書籍データ取得 | Gemini API |
| UC7 | 感想文を執筆する | AIによる感想文生成 | Gemini API |
| UC8 | 入力値を検証する | バリデーション実行 | システム |
| UC9 | システム状態を確認する | ヘルスチェック実行 | ユーザー |

---

## 3. シーケンス図 (Sequence Diagram)

### 3-1. 正常系シナリオ：感想文生成成功

```mermaid
sequenceDiagram
    autonumber
    actor User as ユーザー
    participant UI as フロントエンド<br/>(app.js)
    participant Server as サーバー<br/>(server.js)
    participant Validator as Validation<br/>Service
    participant Prompt as Prompt<br/>Builder
    participant Gemini as Gemini<br/>Service
    participant API as Gemini<br/>API
    participant Search as Google<br/>Search

    Note over User,Search: UC-01: 読書感想文生成 (正常系)
    
    User->>UI: 1. タイトル入力<br/>"人間失格"
    User->>UI: 2. 著者入力<br/>"太宰治"
    User->>UI: 3. 焦点入力<br/>"主人公の心の葛藤"
    User->>UI: 4. 生成ボタンクリック
    
    activate UI
    UI->>UI: 5. クライアント側検証<br/>(空欄チェック)
    UI->>UI: 6. ローディング表示
    
    UI->>+Server: 7. POST /api/generate-review<br/>{title, author, focus}
    
    activate Server
    Server->>+Validator: 8. validateBookReviewInput()
    
    Validator->>Validator: 9. 必須項目チェック
    Validator->>Validator: 10. 文字数制限チェック<br/>title≤200, focus≤500
    
    alt バリデーションエラー
        Validator-->>Server: エラー配列
        Server-->>UI: 400 Bad Request<br/>{error, details}
        UI->>UI: エラーメッセージ表示
        UI-->>User: アラート表示
    else バリデーション成功
        Validator-->>-Server: null (エラーなし)
        
        Server->>+Prompt: 11. buildPrompt(title, author, focus)
        Prompt->>Prompt: 12. システム命令構築
        Prompt->>Prompt: 13. ユーザープロンプト構築
        Prompt-->>-Server: 完成したプロンプト
        
        Server->>+Gemini: 14. generateContent(prompt)
        
        Gemini->>+API: 15. API呼び出し<br/>model: gemini-2.5-flash<br/>tools: [googleSearch]
        
        activate API
        API->>API: 16. 安全性チェック<br/>(promptFeedback)
        
        alt 安全性フィルターブロック
            API-->>Gemini: SAFETY blocked
            Gemini-->>Server: 安全性エラー
            Server-->>UI: 400 Bad Request<br/>安全性エラー
            UI-->>User: エラー表示
        else 安全性OK
            API->>+Search: 17. Google検索実行<br/>"人間失格 太宰治"
            Search-->>-API: 18. 書籍情報<br/>(あらすじ、評価、テーマ)
            
            API->>API: 19. コンテンツ生成<br/>(400字前後)
            API->>API: 20. 構造化<br/>導入→本文→結論
            
            API-->>-Gemini: 21. 生成結果<br/>{candidates, text}
        end
        
        Gemini->>Gemini: 22. テキスト抽出<br/>extractTextFromResponse()
        Gemini->>Gemini: 23. 文字数カウント<br/>(空白除去)
        
        Gemini-->>-Server: 24. 生成テキスト<br/>(395文字)
        
        Server->>Server: 25. メタデータ構築<br/>{characterCount, model, searchUsed}
        
        Server-->>-UI: 26. 200 OK<br/>{text, metadata}
        deactivate Server
        
        UI->>UI: 27. ローディング非表示
        UI->>UI: 28. 結果エリアに表示<br/>text内容を挿入
        UI->>UI: 29. メタデータ表示<br/>(文字数など)
        
        UI-->>User: 30. 感想文表示完了
    end
    deactivate UI
    
    Note over User,Search: 処理完了 (約10秒)
```

---

### 3-2. 異常系シナリオ：APIキーエラー

```mermaid
sequenceDiagram
    autonumber
    actor User as ユーザー
    participant UI as フロントエンド
    participant Server as サーバー
    participant Gemini as Gemini<br/>Service
    participant API as Gemini<br/>API

    Note over User,API: 異常系: APIキー無効エラー
    
    User->>UI: 入力 & 生成ボタン
    UI->>+Server: POST /api/generate-review
    
    Server->>Server: バリデーションOK
    Server->>+Gemini: generateContent()
    
    Gemini->>+API: API呼び出し<br/>(無効なAPIキー)
    API-->>-Gemini: ❌ 401 Unauthorized<br/>"API key not valid"
    
    Gemini->>Gemini: エラー判定<br/>(API key含む)
    Gemini-->>-Server: APIキーエラー
    
    Server->>Server: handleApiError()<br/>エラー分類
    Server-->>-UI: 401 Unauthorized<br/>{error: "APIキーが無効..."}
    
    UI->>UI: エラー表示
    UI-->>User: "APIキーが無効です。<br/>管理者に連絡してください。"
    
    Note over User,API: 即座に失敗 (1秒以内)
```

---

### 3-3. 異常系シナリオ：レート制限エラー

```mermaid
sequenceDiagram
    autonumber
    actor User as ユーザー
    participant UI as フロントエンド
    participant Server as サーバー
    participant Gemini as Gemini<br/>Service
    participant API as Gemini<br/>API

    Note over User,API: 異常系: レート制限超過
    
    User->>UI: 短時間に複数回実行
    UI->>+Server: POST /api/generate-review<br/>(5回目)
    
    Server->>Server: バリデーションOK
    Server->>+Gemini: generateContent()
    
    Gemini->>+API: API呼び出し
    API->>API: レート制限チェック
    API-->>-Gemini: ❌ 429 Rate Limit<br/>"quota exceeded"
    
    Gemini->>Gemini: エラー判定<br/>(quota/rate limit含む)
    Gemini-->>-Server: レート制限エラー
    
    Server->>Server: handleApiError()<br/>エラー分類
    Server-->>-UI: 429 Too Many Requests<br/>{error: "リクエスト制限..."}
    
    UI->>UI: エラー表示
    UI-->>User: "リクエスト制限に達しました。<br/>しばらく待ってから再試行..."
    
    Note over User,API: 待機時間: 1-2分推奨
```

---

### 3-4. 異常系シナリオ：安全性フィルターブロック

```mermaid
sequenceDiagram
    autonumber
    actor User as ユーザー
    participant UI as フロントエンド
    participant Server as サーバー
    participant Gemini as Gemini<br/>Service
    participant API as Gemini<br/>API

    Note over User,API: 異常系: 不適切コンテンツ検出
    
    User->>UI: 不適切な焦点入力<br/>(暴力的表現など)
    UI->>+Server: POST /api/generate-review
    
    Server->>Server: バリデーションOK<br/>(形式的には問題なし)
    Server->>+Gemini: generateContent(prompt)
    
    Gemini->>+API: API呼び出し
    API->>API: promptFeedback評価<br/>安全性フィルター適用
    
    API-->>-Gemini: ❌ BLOCKED<br/>promptFeedback: {blockReason: "SAFETY"}
    
    Gemini->>Gemini: handlePromptFeedback()<br/>promptFeedback検出
    Gemini-->>-Server: 安全性エラー<br/>{promptFeedback}
    
    Server->>Server: handlePromptFeedback()<br/>エラーレスポンス構築
    Server-->>-UI: 400 Bad Request<br/>{error: "安全性フィルター...", feedback}
    
    UI->>UI: エラー表示
    UI-->>User: "コンテンツが安全性フィルターに<br/>よってブロックされました。<br/>別の焦点や表現で再試行..."
    
    Note over User,API: 対処: 表現を穏やかに修正
```

---

### 3-5. 管理シナリオ：ヘルスチェック

```mermaid
sequenceDiagram
    autonumber
    actor Admin as 管理者/監視
    participant UI as ブラウザ
    participant Server as サーバー

    Note over Admin,Server: 管理用: システム状態確認
    
    Admin->>UI: GET /api/health アクセス
    UI->>+Server: GET /api/health
    
    Server->>Server: 環境変数チェック<br/>GEMINI_API_KEY存在確認
    Server->>Server: 現在時刻取得
    Server->>Server: NODE_ENV取得
    
    Server-->>-UI: 200 OK<br/>{status, timestamp, geminiConfigured, nodeEnv}
    
    UI-->>Admin: JSON表示:<br/>{<br/>  "status": "ok",<br/>  "timestamp": "2026-01-19T12:00:00Z",<br/>  "geminiConfigured": true,<br/>  "nodeEnv": "development"<br/>}
    
    Note over Admin,Server: 正常動作確認完了
```

---

## 図の活用方法

### クラス図の活用
- **開発者向け**: コード構造の理解と実装の参考
- **保守担当**: 依存関係の把握と影響範囲の特定
- **新規メンバー**: システム全体像の把握

### ユースケース図の活用
- **企画・PM**: 機能要件の整理
- **テスター**: テストケース設計の基盤
- **ユーザー**: システムでできることの理解

### シーケンス図の活用
- **開発者**: 処理フローの実装確認
- **デバッグ**: エラー発生箇所の特定
- **ドキュメント**: 動作仕様の説明

---

**作成日:** 2026年1月19日  
**図表形式:** Mermaid (Markdown埋め込み可能)