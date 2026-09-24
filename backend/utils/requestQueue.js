/**
 * Simple in-memory concurrency queue for rate-limiting incoming evaluation requests.
 * Ensures evaluation requests do not overload Gemini API rate limits.
 */
export class RequestQueue {
  constructor(concurrency = 1) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  enqueue(taskFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ taskFn, resolve, reject });
      this.process();
    });
  }

  process() {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const { taskFn, resolve, reject } = this.queue.shift();
    this.running++;

    (async () => {
      try {
        const result = await taskFn();
        resolve(result);
      } catch (err) {
        reject(err);
      } finally {
        this.running--;
        this.process();
      }
    })();
  }
}

// Global evaluation queue (processes 1 evaluation at a time)
export const evaluationQueue = new RequestQueue(1);
