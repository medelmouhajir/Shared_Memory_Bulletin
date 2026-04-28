import type { CreateMemoryInput, Memory, MemoryStatus } from "@openclaw/types";

export class OpenClawAgent {
  constructor(
    private readonly baseUrl: string,
    private readonly agentId: string,
    private readonly token: string,
  ) {}

  async heartbeat(): Promise<void> {
    await this.request(`/api/v1/agents/${this.agentId}/heartbeat`, { method: "PATCH" });
  }

  async getInbox(): Promise<Memory[]> {
    const response = await this.request<{ memories: Memory[] }>(
      `/api/v1/memories?assigned_to=${encodeURIComponent(this.agentId)}&status=triggered,seen`,
    );
    return response.memories;
  }

  async ack(memoryId: string): Promise<Memory> {
    return this.patchStatus(memoryId, "seen");
  }

  async startWork(memoryId: string): Promise<Memory> {
    return this.patchStatus(memoryId, "inprogress");
  }

  async finish(memoryId: string, result?: string): Promise<Memory> {
    return this.patchMemory(memoryId, result === undefined ? { status: "finished" } : { status: "finished", body: result });
  }

  async fail(memoryId: string, reason?: string): Promise<Memory> {
    return this.patchMemory(memoryId, reason === undefined ? { status: "fail" } : { status: "fail", body: reason });
  }

  async report(title: string, body: string, assignTo?: string): Promise<Memory> {
    const payload: CreateMemoryInput = {
      type: "update",
      title,
      body,
      priority: 2,
      max_retries: 3,
      created_by: this.agentId,
      ...(assignTo ? { assigned_to: assignTo } : {}),
    };
    const response = await this.request<{ memory: Memory }>("/api/v1/memories", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return response.memory;
  }

  private async patchStatus(memoryId: string, status: MemoryStatus): Promise<Memory> {
    return this.patchMemory(memoryId, { status });
  }

  private async patchMemory(memoryId: string, patch: { status: MemoryStatus; body?: string }): Promise<Memory> {
    const response = await this.request<{ memory: Memory }>(`/api/v1/memories/${memoryId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    return response.memory;
  }

  private async request<T = unknown>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(new URL(path, this.baseUrl), {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`OpenClaw request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }
}
