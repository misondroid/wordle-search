import assert from "node:assert/strict";
import test from "node:test";

import {
  getDateStringForTimeZone,
  readAnswers,
  removeAnswer,
  updateAnswers,
  writeAnswers,
} from "../src/index.js";
import worker from "../src/index.js";

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

test("removeAnswer removes the solved word from candidate answers", () => {
  assert.deepEqual(removeAnswer(["smile", "clang"], "smile"), ["clang"]);
  assert.deepEqual(removeAnswer(["smile"], "clang"), ["smile"]);
});

test("writeAnswers stores GZip JSON with application/json metadata", async () => {
  const bucket = makeBucket();

  await writeAnswers(bucket, "answers.json", ["smile"]);

  assert.equal(bucket.store.get("answers.json") instanceof ArrayBuffer, true);
  assert.deepEqual(await gunzipJson(bucket.store.get("answers.json")), ["smile"]);
  assert.equal(
    bucket.metadata.get("answers.json").httpMetadata.contentType,
    "application/json; charset=utf-8",
  );
  assert.equal(bucket.metadata.get("answers.json").httpMetadata.contentEncoding, "gzip");
});

test("updateAnswers reads R2, fetches the NYT solution, and writes the new list", async () => {
  const bucket = makeBucket({
    "answers.json": await gzipJson(["smile", "clang"]),
  });
  const fetchStub = stubFetch([
    {
      payload: {
        solution: "CLANG",
      },
    },
    {
      payload: {},
    },
  ]);

  try {
    const result = await updateAnswers(
      {
        ANSWERS_BUCKET: bucket,
        ANSWERS_KEY: "answers.json",
        LINE_MESSAGING_API_TOKEN: "line-token",
        WORDLE_TIME_ZONE: "UTC",
      },
      Date.parse("2026-05-29T10:00:00.000Z"),
    );

    assert.deepEqual(await gunzipJson(bucket.store.get("answers.json")), ["smile"]);
    assert.deepEqual(result, {
      key: "answers.json",
      date: "2026-05-29",
      solution: "clang",
      removed: true,
      total: 1,
    });
    assert.equal(fetchStub.calls[1].input, "https://api.line.me/v2/bot/message/broadcast");
    assert.equal(fetchStub.calls[1].init.method, "POST");
    assert.equal(fetchStub.calls[1].init.headers.authorization, "Bearer line-token");
    assert.deepEqual(JSON.parse(fetchStub.calls[1].init.body), {
      messages: [
        {
          type: "text",
          text: [
            "Wordle answers update completed.",
            "date: 2026-05-29",
            "solution: clang",
            "removed: true",
            "total: 1",
            "key: answers.json",
          ].join("\n"),
        },
      ],
    });
  } finally {
    fetchStub.restore();
  }
});

test("manual scheduled endpoint runs the update handler", async () => {
  const bucket = makeBucket({
    "answers.json": await gzipJson(["smile", "clang"]),
  });
  const fetchStub = stubFetch([
    {
      payload: {
        solution: "CLANG",
      },
    },
    {
      payload: {},
    },
  ]);

  try {
    const response = await worker.fetch(
      new Request("https://example.test/debug/scheduled", {
        method: "POST",
      }),
      {
        ANSWERS_BUCKET: bucket,
        ANSWERS_KEY: "answers.json",
        LINE_MESSAGING_API_TOKEN: "line-token",
        WORDLE_TIME_ZONE: "UTC",
      },
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await gunzipJson(bucket.store.get("answers.json")), ["smile"]);
    assert.equal((await response.json()).result.removed, true);
  } finally {
    fetchStub.restore();
  }
});

test("manual scheduled endpoint rejects non-POST requests", async () => {
  const response = await worker.fetch(new Request("https://example.test/debug/scheduled"), {});

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "POST");
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

function stubFetch(responses, ok = true, status = 200) {
  const originalFetch = globalThis.fetch;
  const calls = [];
  const pendingResponses = Array.isArray(responses)
    ? [...responses]
    : [
        {
          payload: responses,
          ok,
          status,
        },
      ];

  globalThis.fetch = async (input, init = {}) => {
    calls.push({
      input,
      init,
    });

    const response = pendingResponses.shift();
    if (!response) {
      throw new Error("Unexpected fetch call");
    }

    return {
      ok: response.ok ?? true,
      status: response.status ?? 200,
      async json() {
        return response.payload ?? {};
      },
    };
  };

  return {
    calls,
    restore() {
      globalThis.fetch = originalFetch;
    },
  };
}
