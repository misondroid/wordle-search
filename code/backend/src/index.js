const DEFAULT_ANSWERS_KEY = "answers.json";
const DEFAULT_TIME_ZONE = "America/New_York";
const WORDLE_API_BASE_URL = "https://www.nytimes.com/svc/wordle/v2";

export default {
  async fetch(request) {
    return handleRequest(request);
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(updateAnswers(env, controller.scheduledTime));
  },
};

export async function handleRequest(request) {
  const url = new URL(request.url);

  return jsonResponse(
    {
      error: "Not Found",
      path: url.pathname,
    },
    { status: 404 },
  );
}

export async function updateAnswers(env, scheduledTime = Date.now()) {
  const bucket = getAnswersBucket(env);
  const key = env.ANSWERS_KEY || DEFAULT_ANSWERS_KEY;
  const timeZone = env.WORDLE_TIME_ZONE || DEFAULT_TIME_ZONE;
  const date = getDateStringForTimeZone(new Date(scheduledTime), timeZone);

  const answers = await readAnswers(bucket, key);
  const solution = await fetchSolution(date);
  const nextAnswers = appendAnswer(answers, solution);

  await writeAnswers(bucket, key, nextAnswers);

  return {
    key,
    date,
    solution,
    added: nextAnswers.length !== answers.length,
    total: nextAnswers.length,
  };
}

export function getDateStringForTimeZone(date, timeZone = DEFAULT_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error(`Failed to format date for time zone: ${timeZone}`);
  }

  return `${year}-${month}-${day}`;
}

export async function readAnswers(bucket, key = DEFAULT_ANSWERS_KEY) {
  const object = await bucket.get(key);

  if (!object) {
    return [];
  }

  const payload = await object.json();

  if (!Array.isArray(payload)) {
    throw new Error(`${key} must contain a JSON array`);
  }

  const invalidAnswer = payload.find((answer) => typeof answer !== "string");
  if (invalidAnswer !== undefined) {
    throw new Error(`${key} must contain only strings`);
  }

  return payload;
}

export async function fetchSolution(date) {
  const response = await fetch(`${WORDLE_API_BASE_URL}/${date}.json`, {
    headers: {
      accept: "application/json",
      "user-agent": "wordle-search-backend/0.0.1",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Wordle answer for ${date}: ${response.status}`);
  }

  const payload = await response.json();

  if (typeof payload.solution !== "string" || payload.solution.length === 0) {
    throw new Error(`Wordle answer for ${date} does not include a solution`);
  }

  return payload.solution.toLowerCase();
}

export function appendAnswer(answers, answer) {
  if (answers.includes(answer)) {
    return answers;
  }

  return [...answers, answer];
}

export async function writeAnswers(bucket, key = DEFAULT_ANSWERS_KEY, answers) {
  await bucket.put(key, `${JSON.stringify(answers, null, 2)}\n`, {
    httpMetadata: {
      contentType: "application/json; charset=utf-8",
    },
  });
}

function getAnswersBucket(env) {
  if (!env.ANSWERS_BUCKET) {
    throw new Error("ANSWERS_BUCKET binding is required");
  }

  return env.ANSWERS_BUCKET;
}

function jsonResponse(body, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");

  return new Response(`${JSON.stringify(body)}\n`, {
    ...init,
    headers,
  });
}
