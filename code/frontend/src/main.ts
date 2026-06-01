import '@fortawesome/fontawesome-free/css/all.min.css';
import { getI18n } from './i18n';
import './style.css';

type DictionaryPayload = Record<string, number> | string[];

const DEFAULT_DICTIONARY_URL = 'base_dictionary.json';
const DICTIONARY_URL = import.meta.env.DICTIONARY_URL || DEFAULT_DICTIONARY_URL;
const DEFAULT_PATTERN = '^.....$';
const LANGUAGE_STORAGE_KEY = 'word-search-language';
const RESULT_PAGE_SIZE = 100;

const getInitialLocale = () =>
  window.localStorage.getItem(LANGUAGE_STORAGE_KEY) || navigator.language;

let { copy, numberFormatter } = getI18n(getInitialLocale());

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('App root element was not found.');
}

document.documentElement.lang = copy.lang;

app.innerHTML = `
  <main class="shell" aria-live="polite">
    <section class="hero" aria-labelledby="page-title">
      <div class="hero-header">
        <div>
          <p class="eyebrow" id="page-eyebrow">${copy.eyebrow}</p>
          <h1 id="page-title">${copy.appTitle}</h1>
          <p class="lead">
            <a
              id="lead-link"
              href="${copy.leadHref}"
              target="_blank"
              rel="noreferrer"
            ><code id="lead-prefix">${copy.leadPrefix}</code></a>
            <span id="lead-suffix">${copy.leadSuffix}</span>
          </p>
        </div>

        <label class="language-toggle" aria-label="${copy.languageToggleLabel}">
          <span>JA</span>
          <input
            id="language-toggle-input"
            type="checkbox"
            ${copy.lang === 'en' ? 'checked' : ''}
          />
          <span class="language-toggle-track" aria-hidden="true"></span>
          <span>EN</span>
        </label>
      </div>

      <form class="search-form" id="search-form">
        <label class="field">
          <span id="regex-label">${copy.regexLabel}</span>
          <textarea
            id="pattern-input"
            class="pattern-input"
            autocomplete="off"
            spellcheck="false"
            placeholder="${copy.regexPlaceholder}"
            rows="2"
          ></textarea>
        </label>

        <div class="options" aria-label="${copy.searchOptionsLabel}">
          <label>
            <input id="ignore-case-input" type="checkbox" checked />
            <span id="ignore-case-label">${copy.ignoreCase}</span>
          </label>
          <label>
            <input id="global-match-input" type="checkbox" checked />
            <span id="global-match-label">${copy.matchAnywhere}</span>
          </label>
          <button class="option-button" id="copy-url-button" type="button">
            <i class="fa-regular fa-copy" aria-hidden="true"></i>
            <span id="copy-url-label">${copy.copyUrl}</span>
          </button>
        </div>
      </form>

      <div class="tips" id="regex-examples" aria-label="${copy.regexExamplesLabel}">
        <button type="button" data-pattern="^a.*e$">^a.*e$</button>
        <button type="button" data-pattern="^[a-z]{5}$">^[a-z]{5}$</button>
        <button type="button" data-pattern="(ing|ed)$">(ing|ed)$</button>
        <button type="button" data-pattern="^[^aeiou]+$">^[^aeiou]+$</button>
      </div>
    </section>

    <section class="panel" aria-labelledby="results-title">
      <div class="panel-header">
        <div>
          <p class="eyebrow" id="results-eyebrow">${copy.resultsEyebrow}</p>
          <h2 id="results-title">${copy.loadingDictionary}</h2>
        </div>
        <p class="counter" id="counter">0 ${copy.wordsLabel}</p>
      </div>

      <p class="status" id="status">${copy.loadingDictionaryStatus}</p>
      <ol class="word-list" id="result-list"></ol>
      <div class="load-sentinel" id="load-sentinel" aria-hidden="true"></div>
    </section>
  </main>
`;

const patternInput =
  document.querySelector<HTMLTextAreaElement>('#pattern-input');
const languageToggleInput = document.querySelector<HTMLInputElement>(
  '#language-toggle-input',
);
const ignoreCaseInput =
  document.querySelector<HTMLInputElement>('#ignore-case-input');
const globalMatchInput =
  document.querySelector<HTMLInputElement>('#global-match-input');
const copyUrlButton =
  document.querySelector<HTMLButtonElement>('#copy-url-button');
const copyUrlLabel = document.querySelector<HTMLSpanElement>('#copy-url-label');
const resultList = document.querySelector<HTMLOListElement>('#result-list');
const loadSentinel = document.querySelector<HTMLDivElement>('#load-sentinel');
const resultsTitle = document.querySelector<HTMLHeadingElement>('#results-title');
const counter = document.querySelector<HTMLParagraphElement>('#counter');
const status = document.querySelector<HTMLParagraphElement>('#status');
const pageEyebrow = document.querySelector<HTMLParagraphElement>('#page-eyebrow');
const pageTitle = document.querySelector<HTMLHeadingElement>('#page-title');
const languageToggle =
  document.querySelector<HTMLLabelElement>('.language-toggle');
const leadLink = document.querySelector<HTMLAnchorElement>('#lead-link');
const leadPrefix = document.querySelector<HTMLElement>('#lead-prefix');
const leadSuffix = document.querySelector<HTMLSpanElement>('#lead-suffix');
const regexLabel = document.querySelector<HTMLSpanElement>('#regex-label');
const options = document.querySelector<HTMLDivElement>('.options');
const ignoreCaseLabel =
  document.querySelector<HTMLSpanElement>('#ignore-case-label');
const globalMatchLabel =
  document.querySelector<HTMLSpanElement>('#global-match-label');
const regexExamples = document.querySelector<HTMLDivElement>('#regex-examples');
const resultsEyebrow =
  document.querySelector<HTMLParagraphElement>('#results-eyebrow');

if (
  !patternInput ||
  !languageToggleInput ||
  !ignoreCaseInput ||
  !globalMatchInput ||
  !copyUrlButton ||
  !copyUrlLabel ||
  !resultList ||
  !loadSentinel ||
  !resultsTitle ||
  !counter ||
  !status ||
  !pageEyebrow ||
  !pageTitle ||
  !languageToggle ||
  !leadLink ||
  !leadPrefix ||
  !leadSuffix ||
  !regexLabel ||
  !options ||
  !ignoreCaseLabel ||
  !globalMatchLabel ||
  !regexExamples ||
  !resultsEyebrow
) {
  throw new Error('Required UI element was not found.');
}

const queryPattern = new URLSearchParams(window.location.search).get('q');
patternInput.value = queryPattern ?? DEFAULT_PATTERN;

let words: string[] = [];
let currentMatches: string[] = [];
let renderedResultCount = 0;
let pendingRender = 0;

const setStatus = (message: string, isError = false) => {
  status.textContent = message;
  status.classList.toggle('status-error', isError);
};

const updateLocalizedText = () => {
  document.documentElement.lang = copy.lang;
  pageEyebrow.textContent = copy.eyebrow;
  pageTitle.textContent = copy.appTitle;
  languageToggle.setAttribute('aria-label', copy.languageToggleLabel);
  leadLink.href = copy.leadHref;
  leadPrefix.textContent = copy.leadPrefix;
  leadSuffix.textContent = copy.leadSuffix;
  regexLabel.textContent = copy.regexLabel;
  patternInput.placeholder = copy.regexPlaceholder;
  options.setAttribute('aria-label', copy.searchOptionsLabel);
  ignoreCaseLabel.textContent = copy.ignoreCase;
  globalMatchLabel.textContent = copy.matchAnywhere;
  copyUrlLabel.textContent = copy.copyUrl;
  regexExamples.setAttribute('aria-label', copy.regexExamplesLabel);
  resultsEyebrow.textContent = copy.resultsEyebrow;
  counter.textContent = `${numberFormatter.format(words.length)} ${copy.wordsLabel}`;
};

const setLocale = (locale: string) => {
  const nextI18n = getI18n(locale);
  copy = nextI18n.copy;
  numberFormatter = nextI18n.numberFormatter;
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, copy.lang);
  updateLocalizedText();
};

const buildShareUrl = () => {
  const url = new URL(window.location.href);
  const pattern = patternInput.value;

  if (pattern) {
    url.searchParams.set('q', pattern);
  } else {
    url.searchParams.delete('q');
  }

  return url.toString();
};

const copyText = async (text: string) => {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const helper = document.createElement('textarea');
  helper.value = text;
  helper.setAttribute('readonly', '');
  helper.style.position = 'fixed';
  helper.style.opacity = '0';
  document.body.append(helper);
  helper.select();
  document.execCommand('copy');
  helper.remove();
};

const normalizeDictionary = (dictionary: DictionaryPayload) => {
  if (Array.isArray(dictionary)) {
    return dictionary.filter((word): word is string => typeof word === 'string');
  }

  return Object.keys(dictionary);
};

const isGzipResource = (resourceUrl: string) => {
  const url = new URL(resourceUrl, window.location.href);

  return url.pathname.endsWith('.gz');
};

const hasDecodedContentEncoding = (response: Response) => {
  const contentEncoding = response.headers.get('content-encoding');

  return Boolean(
    contentEncoding &&
      contentEncoding.trim() !== '' &&
      contentEncoding.toLowerCase() !== 'identity',
  );
};

const readDictionaryResponse = async (response: Response) => {
  if (!isGzipResource(DICTIONARY_URL) || hasDecodedContentEncoding(response)) {
    return (await response.json()) as DictionaryPayload;
  }

  if (!response.body) {
    throw new Error(copy.dictionaryLoadFailedTitle);
  }

  const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
  return (await new Response(stream).json()) as DictionaryPayload;
};

const appendResults = () => {
  if (renderedResultCount >= currentMatches.length) {
    loadSentinel.hidden = true;
    return;
  }

  const nextResultCount = Math.min(
    renderedResultCount + RESULT_PAGE_SIZE,
    currentMatches.length,
  );
  const fragment = document.createDocumentFragment();
  for (const word of currentMatches.slice(renderedResultCount, nextResultCount)) {
    const item = document.createElement('li');
    item.textContent = word;
    fragment.append(item);
  }

  resultList.append(fragment);
  renderedResultCount = nextResultCount;
  loadSentinel.hidden = renderedResultCount >= currentMatches.length;

  setStatus(
    renderedResultCount < currentMatches.length
      ? copy.visibleResultsStatus(renderedResultCount, currentMatches.length)
      : copy.allResultsStatus,
  );
};

const renderResults = (matches: string[]) => {
  currentMatches = matches;
  renderedResultCount = 0;
  resultList.replaceChildren();
  loadSentinel.hidden = matches.length === 0;

  if (matches.length === 0) {
    setStatus(copy.allResultsStatus);
    return;
  }

  appendResults();
};

const buildRegex = () => {
  const pattern = patternInput.value.trim();
  if (!pattern) {
    return null;
  }

  const source = globalMatchInput.checked ? pattern : `^(?:${pattern})$`;
  return new RegExp(source, ignoreCaseInput.checked ? 'i' : undefined);
};

const runSearch = () => {
  window.cancelAnimationFrame(pendingRender);

  pendingRender = window.requestAnimationFrame(() => {
    if (words.length === 0) {
      return;
    }

    let regex: RegExp | null;
    try {
      regex = buildRegex();
    } catch (error) {
      renderResults([]);
      resultsTitle.textContent = copy.invalidRegexTitle;
      counter.textContent = `${numberFormatter.format(words.length)} ${copy.wordsLabel}`;
      setStatus(error instanceof Error ? error.message : copy.invalidRegex, true);
      return;
    }

    if (!regex) {
      renderResults([]);
      resultsTitle.textContent = copy.emptyRegexTitle;
      counter.textContent = `${numberFormatter.format(words.length)} ${copy.wordsLabel}`;
      setStatus(copy.emptyRegexStatus);
      return;
    }

    const matches = words.filter((word) => regex.test(word));
    renderResults(matches);

    resultsTitle.textContent = copy.matchesTitle(matches.length);
    counter.textContent = `${numberFormatter.format(words.length)} ${copy.wordsLabel}`;
  });
};

const loadObserver = new IntersectionObserver(
  (entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      appendResults();
    }
  },
  { rootMargin: '240px' },
);

loadObserver.observe(loadSentinel);

const loadDictionary = async () => {
  try {
    const response = await fetch(DICTIONARY_URL);
    if (!response.ok) {
      throw new Error(copy.dictionaryLoadFailedStatus(response.status));
    }

    const dictionary = await readDictionaryResponse(response);
    words = normalizeDictionary(dictionary);
    runSearch();
  } catch (error) {
    resultsTitle.textContent = copy.dictionaryLoadFailedTitle;
    counter.textContent = `0 ${copy.wordsLabel}`;
    setStatus(
      error instanceof Error ? error.message : copy.dictionaryLoadFailedTitle,
      true,
    );
  }
};

patternInput.addEventListener('input', runSearch);
languageToggleInput.addEventListener('change', () => {
  setLocale(languageToggleInput.checked ? 'en' : 'ja-JP');

  if (words.length === 0) {
    resultsTitle.textContent = copy.loadingDictionary;
    setStatus(copy.loadingDictionaryStatus);
    return;
  }

  runSearch();
});
ignoreCaseInput.addEventListener('change', runSearch);
globalMatchInput.addEventListener('change', runSearch);
copyUrlButton.addEventListener('click', async () => {
  try {
    await copyText(buildShareUrl());
    setStatus(copy.copiedUrl);
  } catch {
    setStatus(copy.copyUrlFailed, true);
  }
});

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-pattern]')) {
  button.addEventListener('click', () => {
    patternInput.value = button.dataset.pattern ?? '';
    runSearch();
    patternInput.focus();
  });
}

void loadDictionary();
