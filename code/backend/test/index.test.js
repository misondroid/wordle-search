import assert from "node:assert/strict";
import test from "node:test";

import {
  appendAnswer,
  getDateStringForTimeZone,
  readAnswers,
  updateAnswers,
  writeAnswers,
} from "../src/index.js";

test("getDateStringForTimeZone formats the date in the configured time zone", () => {
  const date = new Date("2026-05-30T03:00:00.000Z");

  assert.equal(getDateStringForTimeZone(date, "America/New_York"), "2026-05-29");
  assert.equal(getDateStringForTimeZone(date, "UTC"), "2026-05-30");
});

test("readAnswers returns an empty array when the object does not exist", async () => {
  const bucket = makeBucket();

  await assert.doesNotReject(async () => {
    const answers = await readAnswers(bucket);
    assert.deepEqual(answers, []);
  });
});

test("readAnswers rejects invalid JSON shapes", async () => {
  const bucket = makeBucket({
    "answers.json": await gzipJson({ answers: ["smile"] }),
  });

  await assert.rejects(() => readAnswers(bucket), /must contain a JSON array/);
});

test("appendAnswer avoids duplicate answers", () => {
  assert.deepEqual(appendAnswer(["smile"], "smile"), ["smile"]);
  assert.deepEqual(appendAnswer(["smile"], "clang"), ["smile", "clang"]);
});

test("writeAnswers stores GZip JSON with application/json metadata", async () => {
  const bucket = makeBucket();

  await writeAnswers(bucket, "answers.json", ["smile"]);

  assert.deepEqual(await gunzipJson(bucket.store.get("answers.json")), ["smile"]);
  assert.equal(
    bucket.metadata.get("answers.json").httpMetadata.contentType,
    "application/json; charset=utf-8",
  );
  assert.equal(bucket.metadata.get("answers.json").httpMetadata.contentEncoding, "gzip");
});

test("updateAnswers reads R2, fetches the NYT solution, and writes the new list", async () => {
  const bucket = makeBucket({
    "answers.json": await gzipJson(["smile"]),
  });
  const restoreFetch = stubFetch({
    solution: "CLANG",
  });

  try {
    const result = await updateAnswers(
      {
        ANSWERS_BUCKET: bucket,
        ANSWERS_KEY: "answers.json",
        WORDLE_TIME_ZONE: "UTC",
      },
      Date.parse("2026-05-29T10:00:00.000Z"),
    );

    assert.deepEqual(await gunzipJson(bucket.store.get("answers.json")), ["smile", "clang"]);
    assert.deepEqual(result, {
      key: "answers.json",
      date: "2026-05-29",
      solution: "clang",
      added: true,
      total: 2,
    });
  } finally {
    restoreFetch();
  }
});

function makeBucket(initialObjects = {}) {
  const store = new Map(Object.entries(initialObjects));
  const metadata = new Map();

  return {
    store,
    metadata,
    async get(key) {
      if (!store.has(key)) {
        return null;
      }

      return {
        body: new Response(store.get(key)).body,
      };
    },
    async put(key, value, options) {
      store.set(key, await normalizeStoredValue(value));
      metadata.set(key, options);
    },
  };
}

async function normalizeStoredValue(value) {
  if (value instanceof ReadableStream) {
    return new Response(value).arrayBuffer();
  }

  return value;
}

async function gzipJson(value) {
  const stream = new Response(`${JSON.stringify(value)}\n`).body.pipeThrough(
    new CompressionStream("gzip"),
  );

  return new Response(stream).arrayBuffer();
}

async function gunzipJson(value) {
  const stream = new Response(value).body.pipeThrough(new DecompressionStream("gzip"));

  return new Response(stream).json();
}

function stubFetch(payload, ok = true, status = 200) {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => ({
    ok,
    status,
    async json() {
      return payload;
    },
  });

  return () => {
    globalThis.fetch = originalFetch;
  };
}
