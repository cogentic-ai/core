import OpenAI from "openai";

export class AgentError extends Error {
    constructor(message: string, public readonly cause?: Error) {
        super(message);
        this.name = "AgentError";
    }
}

interface AgentConfig {
    model: string;
    temperature: number;
    apiKey?: string;
}

export class Agent {
    readonly model: string;
    private temperature: number;
    private client: OpenAI;

    constructor(config: AgentConfig) {
        this.model = config.model;
        this.temperature = config.temperature;
        const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
        
        if (!apiKey) {
            throw new AgentError(
                "OpenAI API key is required. Provide it via constructor or OPENAI_API_KEY environment variable."
            );
        }

        this.client = new OpenAI({ apiKey });
    }

    async chat(message: string): Promise<string> {
        try {
            const response = await this.client.chat.completions.create({
                model: this.model,
                temperature: this.temperature,
                messages: [{ role: "user", content: message }],
            });

            return response.choices[0]?.message?.content || "";
        } catch (error) {
            if (error instanceof Error) {
                throw new AgentError("Failed to chat with OpenAI", error);
            }
            throw new AgentError("An unknown error occurred");
        }
    }
}
