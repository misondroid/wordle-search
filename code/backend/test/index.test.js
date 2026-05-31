import assert from "node:assert/strict";
import test from "node:test";

import {
  appendAnswer,
  getDateStringForTimeZone,
  handleRequest,
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
    "answers.json": JSON.stringify({ answers: ["smile"] }),
  });

  await assert.rejects(() => readAnswers(bucket), /must contain a JSON array/);
});

test("appendAnswer avoids duplicate answers", () => {
  assert.deepEqual(appendAnswer(["smile"], "smile"), ["smile"]);
  assert.deepEqual(appendAnswer(["smile"], "clang"), ["smile", "clang"]);
});

test("handleRequest returns JSON 404 while no API endpoints are defined", async () => {
  const response = await handleRequest(new Request("http://localhost/answers"));

  assert.equal(response.status, 404);
  assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
  assert.deepEqual(await response.json(), {
    error: "Not Found",
    path: "/answers",
  });
});

test("writeAnswers stores JSON with application/json metadata", async () => {
  const bucket = makeBucket();

  await writeAnswers(bucket, "answers.json", ["smile"]);

  assert.equal(bucket.store.get("answers.json"), "[\n  \"smile\"\n]\n");
  assert.equal(
    bucket.metadata.get("answers.json").httpMetadata.contentType,
    "application/json; charset=utf-8",
  );
});

test("updateAnswers reads R2, fetches the NYT solution, and writes the new list", async () => {
  const bucket = makeBucket({
    "answers.json": JSON.stringify(["smile"]),
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

    assert.deepEqual(JSON.parse(bucket.store.get("answers.json")), ["smile", "clang"]);
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
        async json() {
          return JSON.parse(store.get(key));
        },
      };
    },
    async put(key, value, options) {
      store.set(key, value);
      metadata.set(key, options);
    },
  };
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
