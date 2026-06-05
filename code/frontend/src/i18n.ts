export type AppCopy = {
  lang: string;
  appTitle: string;
  eyebrow: string;
  leadPrefix: string;
  leadHref: string;
  leadSuffix: string;
  languageToggleLabel: string;
  regexLabel: string;
  regexPlaceholder: string;
  searchOptionsLabel: string;
  ignoreCase: string;
  matchAnywhere: string;
  copyUrl: string;
  copiedUrl: string;
  copyUrlFailed: string;
  regexExamplesLabel: string;
  resultsEyebrow: string;
  loadingDictionary: string;
  loadingDictionaryStatus: string;
  wordsLabel: string;
  invalidRegexTitle: string;
  invalidRegex: string;
  emptyRegexTitle: string;
  emptyRegexStatus: string;
  dictionaryLoadFailedTitle: string;
  dictionaryLoadFailedStatus: (status: number) => string;
  matchesTitle: (count: number) => string;
  visibleResultsStatus: (visibleCount: number, totalCount: number) => string;
  allResultsStatus: string;
};

export const getI18n = (locale = 'en-US') => {
  const normalizedLocale = locale || 'en-US';
  const numberFormatter = new Intl.NumberFormat(normalizedLocale);
  const isJapaneseLocale = normalizedLocale.toLowerCase().startsWith('ja');

  const copy: AppCopy = isJapaneseLocale
    ? {
        lang: 'ja-JP',
        appTitle: 'Wordle用正規表現辞書検索',
        eyebrow: '正規表現辞書検索',
        leadPrefix: 'english-words',
        leadHref: 'https://github.com/dwyl/english-words',
        leadSuffix:
          'を辞書として、正規表現に一致する５文字の英単語をインクリメンタルに検索します。',
        languageToggleLabel: '表示言語を切り替える',
        regexLabel: '正規表現',
        regexPlaceholder: '例: ^a.*e$',
        searchOptionsLabel: '検索オプション',
        ignoreCase: '大文字小文字を区別しない',
        matchAnywhere: '部分一致で検索',
        copyUrl: 'Copy',
        copiedUrl: 'URLをコピーしました。',
        copyUrlFailed: 'URLのコピーに失敗しました。',
        regexExamplesLabel: '正規表現の例',
        resultsEyebrow: '候補',
        loadingDictionary: '辞書を読み込んでいます...',
        loadingDictionaryStatus: '辞書を読み込んでいます。',
        wordsLabel: '語',
        invalidRegexTitle: '正規表現が不正です',
        invalidRegex: '正規表現が不正です。',
        emptyRegexTitle: '正規表現を入力してください',
        emptyRegexStatus: '検索したい正規表現を入力してください。',
        dictionaryLoadFailedTitle: '辞書の読み込みに失敗しました',
        dictionaryLoadFailedStatus: (status: number) =>
          `辞書の読み込みに失敗しました: ${status}`,
        matchesTitle: (count: number) =>
          `${numberFormatter.format(count)} 件一致`,
        visibleResultsStatus: (visibleCount: number, totalCount: number) =>
          `${numberFormatter.format(totalCount)} 件中 ${numberFormatter.format(
            visibleCount,
          )} 件を表示しています。下へスクロールすると追加で読み込みます。`,
        allResultsStatus: 'すべての一致結果を表示しています。',
      }
    : {
        lang: 'en',
        appTitle: 'Regex Dictionary Search for Wordle',
        eyebrow: 'Regex Dictionary Search',
        leadPrefix: 'english-words',
        leadHref: 'https://github.com/dwyl/english-words',
        leadSuffix:
          'is used as the dictionary for incremental regular expression search for 5-letter English words to play Wordle.',
        languageToggleLabel: 'Switch display language',
        regexLabel: 'Regular expression',
        regexPlaceholder: 'Example: ^a.*e$',
        searchOptionsLabel: 'Search options',
        ignoreCase: 'Ignore case',
        matchAnywhere: 'Match anywhere',
        copyUrl: 'Copy',
        copiedUrl: 'Copied URL.',
        copyUrlFailed: 'Failed to copy URL.',
        regexExamplesLabel: 'Regex examples',
        resultsEyebrow: 'Results',
        loadingDictionary: 'Loading dictionary...',
        loadingDictionaryStatus: 'Loading dictionary.',
        wordsLabel: 'words',
        invalidRegexTitle: 'Invalid regular expression',
        invalidRegex: 'Invalid regular expression.',
        emptyRegexTitle: 'Enter a regular expression',
        emptyRegexStatus: 'Enter a regular expression to search.',
        dictionaryLoadFailedTitle: 'Dictionary load failed',
        dictionaryLoadFailedStatus: (status: number) =>
          `Failed to load dictionary: ${status}`,
        matchesTitle: (count: number) =>
          `${numberFormatter.format(count)} matches`,
        visibleResultsStatus: (visibleCount: number, totalCount: number) =>
          `Showing ${numberFormatter.format(
            visibleCount,
          )} of ${numberFormatter.format(
            totalCount,
          )} results. Scroll down to load more.`,
        allResultsStatus: 'Showing all matching results.',
      };

  return { copy, numberFormatter };
};
