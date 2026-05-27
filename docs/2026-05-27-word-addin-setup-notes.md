# Word Add-in セットアップ作業メモ

## 概要

このメモは、`fesji-linter` プロジェクトに対してこのセッションで実施した作業をまとめたものです。主な対象は次のとおりです。

- React ベースの Word タスクペインアプリ実装
- Office Add-in 用 `manifest.xml` の追加
- ローカル HTTPS 開発環境の整備
- macOS 上での Word サイドロード確認
- Word 側で証明書エラーが解消しなかった件

作業日: 2026-05-27

## 実装したアプリ構成

もともとの最小構成の Vite / React アプリを、`AGENTS.md` の方針に沿って Word 文書リンターの試作版へ拡張した。

### `src/word/document-loader.ts`

Office.js の利用箇所を `src/word/` に閉じ込めるために追加。

対応内容:

- `Office.onReady` を待つ
- 現在の Word 文書から段落一覧を取得する
- 各段落から以下を抽出する
  - 段落テキスト
  - スタイル
  - フォント名
  - フォントサイズ
  - 太字状態
- Word 側のスタイル名を `DocumentModel` 用のスタイルへ変換する

### `src/lint/default-rules.ts`

デフォルトの lint ルール設定を追加。

対象スタイル:

- `title`
- `heading1`
- `body`

### `src/app/inspect-document.ts`

Word 文書の読み込みと lint 実行をつなぐ処理を追加。

役割:

- Word から `DocumentModel` を読み込む
- lint を実行する
- UI で扱いやすい形式に結果をまとめる

### `src/App.tsx`

仮のプレースホルダー画面を、Word タスクペイン UI に差し替えた。

追加した要素:

- Word 接続状態バッジ
- 検査ボタン
- 段落数 / 指摘数 / 最終検査時刻
- 検出結果一覧
- 期待する書式ルール一覧

### テスト

- 既存の lint テストはそのまま通過
- `src/word/document-loader.test.ts` を追加して、スタイル変換の確認を実装

## アプリ実装に対する確認結果

このセッション中に以下が通過した。

- `npm run build`
- `npm run test:run`
- `npm run lint`
- ローカルブラウザでの非 Word 環境表示確認

## 追加した Office Add-in 関連ファイル

### `manifest.xml`

Word 用の task pane manifest を追加。

設定内容:

- host: `Document`
- permission: `ReadDocument`
- requirement set: `WordApi 1.3`
- タスクペインの URL は HTTPS

当初は以下を向けていた:

- `https://localhost:5173/`

その後、証明書まわりとの相性を疑って以下に変更した:

- `https://127.0.0.1:5173/`

### `index.html`

Office.js 読み込みを追加。

```html
<script src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"></script>
```

## ローカル HTTPS 開発環境まわりの対応

### `vite.config.ts`

Vite 設定を変更し、証明書ファイルが存在する場合は HTTPS で起動するようにした。

設定内容:

- dev server を固定ホスト / ポートで起動
- preview でも同様に HTTPS 設定を適用
- セッション終盤では host を `127.0.0.1` に変更

### `package.json`

以下の script を追加。

- `npm run cert:dev`
- `npm run cert:trust:mac`
- `npm run dev:https`

### `scripts/ensure-dev-cert.mjs`

ローカル証明書生成用スクリプトを追加。

動作:

- `mkcert` があればそれを使う
- なければ OpenSSL で以下を生成する
  - ローカル root CA
  - その root CA で署名した localhost 用サーバー証明書

生成先:

- `.certs/fesji-local-root-ca.pem`
- `.certs/fesji-local-root-ca-key.pem`
- `.certs/localhost-cert.pem`
- `.certs/localhost-key.pem`

### `scripts/trust-dev-cert-mac.mjs`

macOS で証明書を信頼登録するための補助スクリプトを追加。

登録先:

- `~/Library/Keychains/login.keychain-db`

このコマンド自体はセッション中に成功した。

## README の更新

`README.md` に以下の手順を追記した。

- ローカル証明書の生成
- macOS での信頼登録
- HTTPS サーバー起動
- Word for Mac への manifest 配置手順

## Word サイドロード確認の経緯

### 試した流れ

以下の順で確認した。

1. 開発用証明書を生成
2. macOS に証明書を信頼登録
3. `npm run dev:https` を起動
4. Word に manifest をアップロード
5. タスクペインを開く

### 発生した結果

Word 側で証明書警告ページが表示された。

表示されたエラー相当:

- `NET::ERR_CERT_AUTHORITY_INVALID`

つまり、Word のタスクペインがローカル HTTPS の証明書を信頼できていない状態だった。

## 証明書まわりで試したこと

### 通った確認

以下は問題なかった。

- HTTPS サーバー自体は応答した
  - `curl -k -I https://localhost:5173/`
- manifest XML の文法確認
  - `xmllint --noout manifest.xml`
- 証明書チェーンの構造は大きく壊れていなかった
- `security verify-cert -c .certs/localhost-cert.pem -p ssl -s localhost`
  - no error で終了

### 追加で試したこと

- manifest の URL を `localhost` から `127.0.0.1` に変更
- Vite の host も `localhost` から `127.0.0.1` に変更
- root CA を `System.keychain` に入れようとした
  - ただし自動実行では macOS の権限エラーで失敗

### ブラウザ確認について

Codex の in-app browser 側でも証明書エラーが続いたため、ここは Word 側の最終判定としては信用しきれなかった。

## 現在の詰まりどころ

未解決の主な問題は次のとおり。

- root CA を login keychain に信頼登録した後も、Word タスクペインがローカル HTTPS を信頼しない

可能性として残っているもの:

- Word / 組み込み Chromium が `login keychain` ではなく `System.keychain` 側の信頼を必要としている
- Word 側に古い sideload 情報や古い証明書状態がキャッシュされている
- 古い manifest が残っていて、以前の origin を参照している

## 次に調べる候補

1. キーチェーンアクセスで `FESJI Local Development Root CA` が次の両方に存在するか確認する
   - login
   - system

2. `System` に無ければ、`.certs/fesji-local-root-ca.pem` を手動で System keychain に入れて `常に信頼` にする

3. Word から一度アドインを完全に削除し、最新の `manifest.xml` を再アップロードする

4. Word を `Cmd+Q` で完全終了してから再起動する

5. それでも直らなければ、Word / Office のキャッシュを消して再度 sideload を試す

6. ローカル証明書運用が難しい場合は、以下も検討候補
   - `mkcert` の利用
   - 信頼済み HTTPS トンネルや一時的なステージング URL を利用する

## このセッションで変更したファイル

- `README.md`
- `index.html`
- `manifest.xml`
- `package.json`
- `vite.config.ts`
- `scripts/ensure-dev-cert.mjs`
- `scripts/trust-dev-cert-mac.mjs`
- `src/App.tsx`
- `src/app/inspect-document.ts`
- `src/lint/default-rules.ts`
- `src/word/document-loader.ts`
- `src/word/document-loader.test.ts`

## 現在の状態

アプリ本体の MVP 実装はかなり整っている。

いま残っている最大の問題は次の一点。

- macOS 上の Word タスクペインでローカル HTTPS 証明書が信頼されない
