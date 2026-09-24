/**
 * Utility for calling Google Gemini API with timeout, exponential backoff retries,
 * detailed error logging, and status parsing.
 */

/**
 * Extracts numeric HTTP status code from a Gemini API error object, if available.
 */
export function getGeminiErrorStatus(error) {
  if (!error) return null;
  if (typeof error.status === 'number') return error.status;
  if (typeof error.statusCode === 'number') return error.statusCode;
  if (error.response && typeof error.response.status === 'number') return error.response.status;
  if (Array.isArray(error.errorDetails) && error.errorDetails[0]?.code) return error.errorDetails[0].code;
  return null;
}

/**
 * Checks if an error is transient (e.g. 503 Overloaded, 429 Rate Limited, 500/502/504, Network Error)
 * and should be retried.
 */
export function isTransientGeminiError(error) {
  if (!error) return false;

  const status = getGeminiErrorStatus(error);
  if (status === 503 || status === 429 || status === 500 || status === 502 || status === 504) {
    return true;
  }

  const msg = String(error.message || error || '').toLowerCase();
  const retryableKeywords = [
    '503',
    '429',
    'overloaded',
    'resource_exhausted',
    'rate limit',
    'quota',
    'unavailable',
    'high load',
    'temporarily',
    'try again',
    'etimeout',
    'econnreset',
    'econnrefused',
    'fetch failed',
    'timed out'
  ];

  return retryableKeywords.some((keyword) => msg.includes(keyword));
}

/**
 * Calls ai.models.generateContent with timeout and exponential backoff retry logic.
 *
 * @param {object} ai - GoogleGenAI instance
 * @param {object} params - Parameters for generateContent ({ model, contents, config })
 * @param {object} options - Retry configuration options
 * @returns {Promise<object>} Gemini response object
 */
export async function callGeminiWithRetry(ai, params, options = {}) {
  const maxRetries = options.maxRetries ?? 3;
  const backoffDelays = options.backoffDelays ?? [2000, 5000, 10000]; // ms
  const timeoutMs = options.timeoutMs ?? 120000; // 120s per API call attempt

  let attempt = 0;
  let lastError = null;

  while (attempt <= maxRetries) {
    attempt++;
    let timer;

    try {
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => {
          const timeoutErr = new Error(`Gemini API call timed out after ${timeoutMs / 1000} seconds (Attempt ${attempt}/${maxRetries + 1})`);
          timeoutErr.status = 504;
          reject(timeoutErr);
        }, timeoutMs);
      });

      const apiPromise = ai.models.generateContent(params);
      const response = await Promise.race([apiPromise, timeoutPromise]);
      clearTimeout(timer);

      if (attempt > 1) {
        console.log(`[Gemini API] Call succeeded on attempt ${attempt}/${maxRetries + 1}.`);
      }

      return response;
    } catch (error) {
      if (timer) clearTimeout(timer);
      lastError = error;

      const status = getGeminiErrorStatus(error);
      const errorMsg = error.message || String(error);

      // Log exact Gemini error details for debugging (Render logs)
      console.error(`[Gemini API Error] Attempt ${attempt}/${maxRetries + 1} failed.`, {
        model: params.model,
        status: status || 'N/A',
        message: errorMsg,
        code: error.code || null,
        details: error.errorDetails || error.response || null
      });

      // Check if we should retry
      const canRetry = attempt <= maxRetries && isTransientGeminiError(error);

      if (canRetry) {
        const delayMs = backoffDelays[attempt - 1] || backoffDelays[backoffDelays.length - 1] || 5000;
        console.warn(`[Gemini API Retry] Retrying in ${delayMs / 1000}s (Attempt ${attempt + 1}/${maxRetries + 1})...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        if (attempt <= maxRetries) {
          console.error(`[Gemini API Error] Non-retryable error encountered on attempt ${attempt}. Halting retries.`);
        } else {
          console.error(`[Gemini API Error] Exhausted all ${maxRetries + 1} attempts.`);
        }
        throw error;
      }
    }
  }

  throw lastError;
}
