/**
 * Utility to concurrently check the health of a list of ArcGIS service URLs.
 * Groups checking to avoid redundant requests for the same URL.
 * 
 * @param {Array<string>} urls - Array of URLs to check
 * @returns {Promise<Object>} A map of URL to health status { status: 'ok'|'degraded'|'down', responseTime, errorMessage }
 */
export async function checkLayerHealth(urls) {
  // Filter out invalid/null URLs and deduplicate
  const uniqueUrls = [...new Set(urls.filter((url) => !!url))];
  const healthMap = {};

  // Batch configuration
  const BATCH_SIZE = 10;
  const TIMEOUT_MS = 8000;
  const DEGRADED_THRESHOLD_MS = 4000;

  // Dynamically import esriRequest so it's not blocking if not needed
  const { default: esriRequest } = await import('@arcgis/core/request');

  for (let i = 0; i < uniqueUrls.length; i += BATCH_SIZE) {
    const batch = uniqueUrls.slice(i, i + BATCH_SIZE);
    
    await Promise.allSettled(
      batch.map(async (url) => {
        const startTime = performance.now();
        const checkUrl = url;

        try {
          const response = await esriRequest(checkUrl, {
            query: { f: 'json' },
            responseType: 'json',
            timeout: TIMEOUT_MS
          });

          const endTime = performance.now();
          const responseTime = Math.round(endTime - startTime);
          const data = response.data;

          if (data && data.error) {
            healthMap[url] = {
              status: 'down',
              errorMessage: data.error.message || 'Service returned an error',
            };
            return;
          }

          if (responseTime > DEGRADED_THRESHOLD_MS) {
            healthMap[url] = { status: 'degraded', responseTime };
          } else {
            healthMap[url] = { status: 'ok', responseTime };
          }
        } catch (error) {
          if (error.name === 'AbortError' || error.message?.includes('timeout') || error.details?.message === 'Timeout exceeded') {
            healthMap[url] = { status: 'down', errorMessage: 'Request timed out' };
          } else {
            // ArcGIS errors are usually in error.details.message or error.message
            const errorMsg = error.details?.messages?.[0] || error.details?.message || error.message || 'Network error';
            healthMap[url] = { status: 'down', errorMessage: errorMsg };
          }
        }
      })
    );
  }

  return healthMap;
}
