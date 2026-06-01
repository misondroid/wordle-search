# Gzip圧縮辞書対応
## 改修内容
### `DICTIONARY_URL`のハンドリング
- デフォルト値: `base_dictionary.json`,
- `DICTIONARY_URL`がセットされている場合: 環境変数`DICTIONARY_URL`から取得

### ダウンロードしてきたペイロードのハンドリング
- `DICTIONARY_URL`からfetch
  - `base_dictionary.json`でない場合 



  - `DICTIONARY_URL`の拡張子が`.gz`であれば取得したリソースをGzip圧縮されたJSONリソースなので、展開して`dictionary`にセット