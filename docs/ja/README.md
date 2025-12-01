# CryptoCast Desktop - プロフェッショナル一括エアドロップツール

> 🚀 マルチチェーン暗号通貨報奨配布プラットフォーム - 安全で効率的、使いやすいデスクトップアプリケーション

[![ライセンス](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![プラットフォーム](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-lightgrey.svg)](../../.github/workflows/build.yml)
[![バージョン](https://img.shields.io/badge/version-1.4.2-blue.svg)](https://github.com/viaweb3/cryptocast-desktop/releases)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-blue.svg)](../../.github/workflows/build.yml)

---

## 📖 プロジェクト概要

CryptoCast Desktopは、マーケティングキャンペーン、エアドロップ配布、コミュニティ報奨のために設計されたElectronベースのプロフェッショナルなクロスプラットフォームデスクトップアプリケーションです。EVM互換チェーンとSolanaでの一括トークン配布をサポートしています。

### ✨ 主要機能

#### 🔗 **マルチチェーンサポート**
- **EVMチェーン**: Ethereum、Polygon、BSC、Arbitrum、Optimism、Base、Avalancheなど
- **Solana**: メインネットと開発ネットワークをサポート
- **スマートコントラクト**: ガス料金最適化の事前デプロイ済み一括転送コントラクト

#### 📦 **一括操作**
- **大規模処理**: CSVファイルからのアドレスと金額のインポート
- **一括転送**: ERC-20およびSolana（SPL）トークンの一括送信
- **リアルタイム進捗**: 可視化された配布進捗とステータス監視

#### 🔒 **セキュリティとプライバシー**
- **ローカルファースト**: すべての機密データ（秘密鍵など）はローカルで暗号化・保存され、サーバーを通過しません
- **分離ウォレット**: 各キャンペーンは独立した派生ウォレットを使用し、資金リスクを分離
- **完全オフライン**: コア機能はオフラインモードで動作可能（トランザクション署名など）

#### 💡 **ユーザーエクスペリエンス**
- **クロスプラットフォーム**: WindowsとmacOS（IntelおよびApple Silicon）をサポート
- **直感的なインターフェース**: シンプルで明確な操作のモダンデザイン
- **コスト見積もり**: リアルタイムのガス料金と総コスト見積もり
- **トランザクション履歴**: 完全なトランザクション履歴とステータス追跡
- **構造化ロギング**: デバッグと問題追跡のためのWinstonロギングシステム

---

## 📚 ドキュメント

- **[アーキテクチャ設計](../../ARCHITECTURE.md)** - システムアーキテクチャと技術的決定
- **[開発ガイド](../../DEVELOPMENT.md)** - 開発環境セットアップとワークフロー
- **[APIドキュメント](../../API_DOCS.md)** - 内部APIドキュメント
- **[テストガイド](../../TESTING.md)** - テスト戦略と実行
- **[貢献ガイド](./CONTRIBUTING.md)** - プロジェクトへの貢献方法
- **[変更履歴](../../CHANGELOG.md)** - バージョン更新履歴
- **[開発ロードマップ](../../ROADMAP.md)** - 機能計画と開発

---

## 💾 ダウンロードとインストール

**最新バージョン: v1.4.2**

| プラットフォーム | ダウンロードリンク | 説明 |
|-------------|----------------|------|
| **Windows (x64)** | [📥 インストーラーをダウンロード](https://github.com/viaweb3/cryptocast-desktop/releases/latest) | Windows 10以上をサポート |
| **macOS (Intel)** | [📥 DMGをダウンロード](https://github.com/viaweb3/cryptocast-desktop/releases/latest) | x64アーキテクチャMac |
| **macOS (Apple Silicon)** | [📥 DMGをダウンロード](https://github.com/viaweb3/cryptocast-desktop/releases/latest) | M1/M2/M3チップMac |

👉 [すべてのバージョンを表示するにはリリースページにアクセス](https://github.com/viaweb3/cryptocast-desktop/releases)

### 📋 インストール手順

**Windows:**
1. [リリースページ](https://github.com/viaweb3/cryptocast-desktop/releases)から`CryptoCast Setup *.exe`をダウンロード
2. インストーラーを実行し、指示に従ってインストールを完了

**macOS:**
1. [リリースページ](https://github.com/viaweb3/cryptocast-desktop/releases)から対応するアーキテクチャの`.dmg`ファイルをダウンロード
   - Intel Mac: `*-x64.dmg`または`*-mac.dmg`をダウンロード
   - Apple Silicon Mac: `*-arm64.dmg`をダウンロード
2. DMGファイルをダブルクリックして開き、`CryptoCast`を`Applications`フォルダにドラッグ
3. 初回実行時、システム環境設定で許可する必要があります（システム環境設定 → セキュリティとプライバシー）

> **注意**: 現在のバージョンは未署名ビルドで、開発およびテスト目的のみを対象としています。

### 未署名アプリケーションの起動問題の解決

アプリケーションがコード署名されていないため、オペレーティングシステムが実行をブロックする可能性があります。オペレーティングシステムに応じて以下の手順に従ってください：

**Windows:**
1. インストーラーの実行時に"Windows protected your PC"プロンプトが表示されたら、ポップアップで"More info"をクリックします。
2. 次に"Run anyway"をクリックします。

**macOS:**

*方法1: ショートカット（推奨）*
1. FinderでCryptoCastアプリケーションを見つけます。
2. アプリケーションアイコンを**右クリック**（またはControlキーを押しながらクリック）します。
3. メニューから**"開く"**を選択します。
4. 警告ダイアログで**"開く"**をクリックします。

*方法2: システム設定*
1. ダブルクリック時に"開けません..."の警告が表示されたら、"キャンセル"をクリックします。
2. "システム設定" > "プライバシーとセキュリティ"を開きます。
3. ページ下部でブロックされているプロンプトを見つけ、**"とにかく開く"**をクリックします。

> ❓ **"App is damaged"と表示された場合**:
> これはmacOSの未署名アプリケーションに対する一般的なブロックメカニズムです。解決策が2つあります：
>
> *方法1: ルート権限なしでのローカルインストール（推奨）*
> 1. CryptoCast.appをユーザーホームディレクトリのApplicationsフォルダ（`~/Applications`）にドラッグします
> 2. Terminalを開き、以下のコマンドを実行します（sudo不要）：
>    ```bash
>    xattr -cr ~/Applications/CryptoCast.app
>    ```
> 3. `~/Applications`フォルダからアプリケーションを通常起動できます
> 4. アプリケーションのDockアイコン作成を推奨：アプリケーションをDockバーにドラッグします
>
> *方法2: システムレベルのインストール（管理者権限が必要）*
> 1. アプリケーションを`/Applications`フォルダにドラッグします
> 2. Terminalを開き、以下のコマンドを実行します：
>    ```bash
>    sudo xattr -cr /Applications/CryptoCast.app
>    ```
> 3. 管理者パスワードを入力して通常通り開きます

---

## 🛠️ 開発環境セットアップ

### 前提条件

- Node.js 24+
- npm（またはyarn/pnpm）
- Git

### 1. プロジェクトをクローン

```bash
git clone https://github.com/viaweb3/cryptocast-desktop.git
cd cryptocast-desktop
```

### 2. 依存関係をインストール

```bash
npm install
```

### 3. 開発モードで実行

```bash
npm run dev
```

### 4. アプリケーションをビルド

```bash
# 現在のプラットフォーム用にアプリケーションをビルド
npm run build

# 特定のプラットフォーム用にビルド
npm run build:win              # Windows x64
npm run build:mac-intel        # macOS Intel (x64)
npm run build:mac-arm          # macOS Apple Silicon (arm64)
```

ビルドアーティファクトは`release/`ディレクトリにあります。

### 5. テストツールスクリプト

```bash
# EVMテストエアドロップリストを生成（333アドレス）
node scripts/generate-evm-airdrop.js

# Solanaテストエアドロップリストを生成（333アドレス）
node scripts/generate-solana-airdrop.js
```

---

## 📁 プロジェクト構造

```
cryptocast-desktop/
├── 📂 src/
│   ├── 📂 main/                     # Electronメインプロセス（Node.jsバックエンド）
│   │   ├── 📄 index.ts              # アプリケーションエントリーポイント
│   │   ├── 📄 preload.ts            # プリロードスクリプト（IPCセキュリティブリッジ）
│   │   ├── 📂 database/             # SQLiteデータベース
│   │   │   ├── 📄 db-adapter.ts     # データベースアダプター
│   │   │   └── 📄 sqlite-schema.ts  # データベース構造とマイグレーション
│   │   ├── 📂 ipc/                  # IPC通信ハンドラー
│   │   │   └── 📄 handlers.ts       # すべてのIPCチャネルの実装
│   │   ├── 📂 services/             # コアビジネスロジック
│   │   │   ├── 📄 CampaignService.ts   # キャンペーン管理
│   │   │   ├── 📄 WalletService.ts     # ウォレット管理
│   │   │   ├── 📄 BlockchainService.ts # 汎用ブロックチェーンサービス
│   │   │   ├── 📄 SolanaService.ts     # Solana固有サービス
│   │   │   ├── 📄 GasService.ts        # ガス見積もりサービス
│   │   │   └── 📄 ...                # その他のサービス
│   │   └── 📂 utils/                # ユーティリティ関数
│   │
│   └── 📂 renderer/                 # Electronレンダラープロセス（Reactフロントエンド）
│       └── 📂 src/
│           ├── 📄 App.tsx           # アプリケーションルートコンポーネント
│           ├── 📄 main.tsx          # Reactエントリーポイント
│           ├── 📂 components/       # UIコンポーネント
│           ├── 📂 pages/            # ページレベルコンポーネント
│           ├── 📂 hooks/            # カスタムReactフック
│           ├── 📂 contexts/         # Reactコンテキスト
│           └── 📂 utils/            # フロントエンドユーティリティ関数
│
├── 📂 contracts/                    # スマートコントラクト（Solidity）
│   ├── 📂 src/
│   │   └── 📄 BatchAirdropContract.sol # EVM一括エアドロップコントラクト
│   └── 📄 foundry.toml              # Foundry設定
│
├── 📄 package.json                  # プロジェクト設定と依存関係
├── 📄 vite.config.ts                # Vite設定
├── 📄 electron-builder.json         # Electron Builderパッケージ設定
├── 📄 jest.config.mjs               # Jestテスト設定
```

---

## 🛠️ テクノロジースタック

### 🎨 フロントエンド
- **React**: UIフレームワーク
- **TypeScript**: 型システム
- **Vite**: ビルドツール
- **TailwindCSS**: CSSフレームワーク
- **DaisyUI**: TailwindCSSコンポーネントライブラリ
- **React Router**: ルーティング

### ⚙️ バックエンドとアプリケーションコア
- **Node.js 24+**: ランタイム環境
- **Electron 39.2.2**: クロスプラットフォームデスクトップアプリケーションフレームワーク
- **SQLite**: ローカルデータベース
- **TypeScript 5.7.3**: 型システム
- **Winston 3.18.3**: 構造化ロギングシステム

### 🔗 ブロックチェーン
- **ethers.js**: EVMチェーン対話ライブラリ
- **@solana/web3.js**: Solanaチェーン対話ライブラリ
- **Foundry**: Solidity開発とテストフレームワーク

### 🧪 テスト
- **Jest**: 単体/結合テスト
- **@testing-library/react**: Reactコンポーネントテスト

---

## 🏗️ アーキテクチャ設計

### コアサービス
アプリケーションバックエンドロジックは、`src/main/services/`にある複数のサービスに分割されています：

- **CampaignService**: エアドロップキャンペーンの作成、管理、実行を担当
- **WalletManagementService / WalletService**: ユーザーウォレットの管理、作成、インポート、安全な保存を担当
- **ChainManagementService / ChainService**: 異なるブロックチェーンネットワーク（EVMおよびSolana）の管理と接続
- **ContractService**: スマートコントラクトのデプロイと対話を担当
- **GasService / PriceService**: トランザクション手数料の見積もりとトークン価格の取得
- **SolanaService**: すべてのSolana固有のロジックを処理
- **CampaignEstimator / CampaignExecutor**: キャンペーンコスト見積もりと実行をそれぞれ担当

### データストレージ
アプリケーションは**SQLite**をローカルデータベースとして使用し、テーブル構造は`src/main/database/sqlite-schema.ts`で定義されています。

#### 主要データテーブル
```sql
-- キャンペーンテーブル
CREATE TABLE campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  chain_type TEXT NOT NULL CHECK (chain_type IN ('evm', 'solana')),
  chain_id INTEGER,
  token_address TEXT NOT NULL,
  status TEXT NOT NULL,
  total_recipients INTEGER NOT NULL,
  wallet_address TEXT,
  contract_address TEXT,
  ...
);

-- 受信者テーブル
CREATE TABLE recipients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT NOT NULL,
  address TEXT NOT NULL,
  amount TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED')),
  tx_hash TEXT,
  FOREIGN KEY (campaign_id) REFERENCES campaigns (id) ON DELETE CASCADE
);

-- トランザクションテーブル
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT NOT NULL,
  tx_hash TEXT NOT NULL UNIQUE,
  tx_type TEXT NOT NULL,
  status TEXT NOT NULL,
  ...
  FOREIGN KEY (campaign_id) REFERENCES campaigns (id) ON DELETE CASCADE
);

-- ブロックチェーンネットワークテーブル
CREATE TABLE chains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('evm', 'solana')),
  name TEXT NOT NULL UNIQUE,
  rpc_url TEXT NOT NULL,
  ...
);
```

### データストレージ場所
- **Windows**: `%APPDATA%\\cryptocast\\`
- **macOS**: `~/Library/Application Support/cryptocast/`
- **Linux**: `~/.config/cryptocast/`

---

## 🧪 テスト

### テストの実行

```bash
# すべての単体・結合テストを実行
npm test

# カバレッジレポートを生成
npm run test:coverage
```

---

## 🤝 貢献

すべての形式の貢献を歓迎します！詳細については**[CONTRIBUTING.md](./CONTRIBUTING.md)**ファイルをお読みください。

---

## 📄 ライセンス

このプロジェクトは[MITライセンス](../../LICENSE)の下でライセンスされています。