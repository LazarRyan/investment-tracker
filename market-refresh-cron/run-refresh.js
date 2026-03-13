const DEFAULT_TIMEOUT_MS = 30000;

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function triggerRefresh() {
  const marketServiceUrl = requiredEnv("MARKET_SERVICE_URL").replace(/\/$/, "");
  const apiKey = requiredEnv("ANALYSIS_SERVICE_API_KEY");
  const endpoint = `${marketServiceUrl}/api/refresh`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    console.log(`Triggering market refresh at ${endpoint}`);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "x-api-key": apiKey
      },
      signal: controller.signal
    });

    const body = await response.text();
    if (!response.ok) {
      throw new Error(`Refresh failed (${response.status}): ${body}`);
    }

    console.log(`Refresh succeeded: ${body}`);
  } finally {
    clearTimeout(timeout);
  }
}

triggerRefresh()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
