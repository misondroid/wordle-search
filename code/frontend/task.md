# Gzip圧縮対応
## 改修内容
- `DICTIONARY_URL`を環境変数`DICTIONARY_URL`から取得するように修正
  - 未設定なら`DICTIONARY_URL`は`base_dictionary.json`
  - `DICTIONARY_URL`の拡張子が`.gz`であれば取得したリソースをGzip圧縮されたJSONリソースなので、展開して`dictionary`にセット