import OpenAI from "openai";

export class AgentError extends Error {
    constructor(message: string, public readonly cause?: Error) {
        super(message);
        this.name = "AgentError";
    }
}

export interface Message {
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    name?: string;
}

export interface RunResult<T = string> {
    messages: Message[];
    data: T;
    cost?: number;
}

export interface AgentConfig<T = string> {
    model: string;
    temperature: number;
    apiKey?: string;
    name?: string;
    systemPrompt?: string | string[];
    resultType?: new () => T;
    retries?: number;
}

export class Agent<T = string> {
    readonly model: string;
    private temperature: number;
    private client: OpenAI;
    private name?: string;
    private systemPrompts: string[];
    private lastRunMessages: Message[] | null = null;
    private defaultRetries: number;
    private currentRetry: number = 0;

    constructor(config: AgentConfig<T>) {
        this.model = config.model;
        this.temperature = config.temperature;
        this.name = config.name;
        this.defaultRetries = config.retries ?? 1;
        this.systemPrompts = Array.isArray(config.systemPrompt) 
            ? config.systemPrompt 
            : config.systemPrompt 
                ? [config.systemPrompt]
                : [];

        const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new AgentError(
                "OpenAI API key is required. Provide it via constructor or OPENAI_API_KEY environment variable."
            );
        }

        this.client = new OpenAI({ apiKey });
    }

    async run(
        userPrompt: string,
        options: {
            messageHistory?: Message[];
            model?: string;
        } = {}
    ): Promise<RunResult<T>> {
        try {
            const messages = this.prepareMessages(userPrompt, options.messageHistory);
            this.lastRunMessages = messages;

            const response = await this.client.chat.completions.create({
                model: options.model || this.model,
                temperature: this.temperature,
                messages: messages as any[],
            });

            const result = response.choices[0]?.message?.content || "";
            return {
                messages,
                data: result as T,
            };
        } catch (error) {
            this.currentRetry++;
            if (this.currentRetry < this.defaultRetries) {
                return this.run(userPrompt, options);
            }
            
            if (error instanceof Error) {
                throw new AgentError("Failed to chat with OpenAI", error);
            }
            throw new AgentError("An unknown error occurred");
        }
    }

    private prepareMessages(userPrompt: string, messageHistory?: Message[]): Message[] {
        const messages: Message[] = [];

        // Add system prompts
        for (const prompt of this.systemPrompts) {
            messages.push({ role: "system", content: prompt });
        }

        // Add message history if provided
        if (messageHistory?.length) {
            messages.push(...messageHistory);
        }

        // Add user prompt
        messages.push({ role: "user", content: userPrompt });

        return messages;
    }

    getLastRunMessages(): Message[] | null {
        return this.lastRunMessages;
    }
}
