import { NotificationPriority } from "@/types/notifications";
import { QUEUE_RETRY_DELAYS_MS } from "./constants";

export interface QueueJobData {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  priority: NotificationPriority;
  attempts: number;
  maxAttempts: number;
  status: "pending" | "processing" | "completed" | "failed" | "dead";
  error: string | null;
  scheduledAt: Date;
  createdAt: Date;
}

type QueueProcessor = (job: QueueJobData) => Promise<void>;

class InMemoryQueue {
  private jobs: Map<string, QueueJobData> = new Map();
  private processors: Map<string, QueueProcessor> = new Map();
  private processing = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  registerProcessor(jobType: string, processor: QueueProcessor) {
    this.processors.set(jobType, processor);
  }

  async enqueue(
    jobType: string,
    payload: Record<string, unknown>,
    priority: NotificationPriority = NotificationPriority.Normal,
    scheduledAt: Date = new Date()
  ): Promise<string> {
    const id = crypto.randomUUID();
    const job: QueueJobData = {
      id,
      type: jobType,
      payload,
      priority,
      attempts: 0,
      maxAttempts: 3,
      status: "pending",
      error: null,
      scheduledAt,
      createdAt: new Date(),
    };
    this.jobs.set(id, job);
    return id;
  }

  async dequeue(): Promise<QueueJobData | null> {
    const now = new Date();
    const pending = Array.from(this.jobs.values())
      .filter((j) => j.status === "pending" && j.scheduledAt <= now)
      .sort((a, b) => {
        const priorityOrder: Record<string, number> = {
          urgent: 0,
          high: 1,
          normal: 2,
          low: 3,
        };
        const pa = priorityOrder[a.priority] ?? 2;
        const pb = priorityOrder[b.priority] ?? 2;
        if (pa !== pb) return pa - pb;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
    return pending[0] || null;
  }

  async markProcessing(jobId: string) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = "processing";
      job.attempts++;
      job.error = null;
    }
  }

  async markCompleted(jobId: string) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = "completed";
    }
  }

  async markFailed(jobId: string, error: string) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.error = error;

    if (job.attempts >= job.maxAttempts) {
      job.status = "dead";
    } else {
      const delayIndex = Math.min(job.attempts, QUEUE_RETRY_DELAYS_MS.length - 1);
      const delay = QUEUE_RETRY_DELAYS_MS[delayIndex];
      job.scheduledAt = new Date(Date.now() + delay);
      job.status = "pending";
    }
  }

  async processNext(): Promise<boolean> {
    const job = await this.dequeue();
    if (!job) return false;

    const processor = this.processors.get(job.type);
    if (!processor) {
      await this.markFailed(job.id, `No processor registered for job type: ${job.type}`);
      return true;
    }

    await this.markProcessing(job.id);

    try {
      await processor(job);
      await this.markCompleted(job.id);
    } catch (err) {
      await this.markFailed(job.id, err instanceof Error ? err.message : "Unknown error");
    }

    return true;
  }

  startProcessing(intervalMs: number = 5000) {
    if (this.intervalId) return;
    this.intervalId = setInterval(async () => {
      if (this.processing) return;
      this.processing = true;
      try {
        let hasMore = true;
        while (hasMore) {
          hasMore = await this.processNext();
        }
      } finally {
        this.processing = false;
      }
    }, intervalMs);
  }

  stopProcessing() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getStats() {
    const jobs = Array.from(this.jobs.values());
    return {
      total: jobs.length,
      pending: jobs.filter((j) => j.status === "pending").length,
      processing: jobs.filter((j) => j.status === "processing").length,
      completed: jobs.filter((j) => j.status === "completed").length,
      failed: jobs.filter((j) => j.status === "failed").length,
      dead: jobs.filter((j) => j.status === "dead").length,
    };
  }

  cleanup(maxAgeMs: number = 3600000) {
    const cutoff = new Date(Date.now() - maxAgeMs);
    for (const [id, job] of this.jobs) {
      if (
        (job.status === "completed" || job.status === "dead") &&
        job.createdAt < cutoff
      ) {
        this.jobs.delete(id);
      }
    }
  }
}

let queueInstance: InMemoryQueue | null = null;

export function getQueue(): InMemoryQueue {
  if (!queueInstance) {
    queueInstance = new InMemoryQueue();
  }
  return queueInstance;
}
