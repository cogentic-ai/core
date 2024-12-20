export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  tool_call_id?: string;
}

export class Memory {
  private messages: Message[] = [];
  private maxMessages: number;
  private keepSystemPrompt: boolean;

  constructor(maxMessages: number = 10, keepSystemPrompt: boolean = true) {
    this.maxMessages = maxMessages;
    this.keepSystemPrompt = keepSystemPrompt;
  }

  private validateMessage(message: Message): Message {
    if (
      !message.role ||
      !["user", "assistant", "system"].includes(message.role)
    ) {
      throw new Error(`Invalid message role: ${message.role}`);
    }
    if (typeof message.content !== "string") {
      throw new Error("Message content must be a string");
    }
    return message;
  }

  private truncate(): void {
    if (this.messages.length > this.maxMessages) {
      const systemMessages = this.keepSystemPrompt
        ? this.messages.filter((m) => m.role === "system")
        : [];
      const nonSystemMessages = this.messages
        .filter((m) => m.role !== "system")
        .slice(-this.maxMessages);
      this.messages = [...systemMessages, ...nonSystemMessages];
    }
  }

  add(...messages: Message[]): void {
    messages.forEach((msg) => {
      this.messages.push(this.validateMessage(msg));
    });
    this.truncate();
  }

  clear(keepSystemPrompt = this.keepSystemPrompt): void {
    if (keepSystemPrompt) {
      this.messages = this.messages.filter(
        (m) => m.role === "system"
      );
    } else {
      this.messages = [];
    }
  }

  getAll(): Message[] {
    return [...this.messages];
  }

  getSystemMessages(): Message[] {
    return this.messages.filter(m => m.role === "system");
  }

  getNonSystemMessages(): Message[] {
    return this.messages.filter(m => m.role !== "system");
  }
}
