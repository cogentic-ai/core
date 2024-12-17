interface MockResponse {
  content: string;
}

export class MockOpenAI {
  private static instance: MockOpenAI;
  private mockResponses: Map<string, MockResponse>;

  private constructor() {
    this.mockResponses = new Map();
  }

  static getInstance(): MockOpenAI {
    if (!MockOpenAI.instance) {
      MockOpenAI.instance = new MockOpenAI();
    }
    return MockOpenAI.instance;
  }

  setMockResponse(prompt: string, response: string): void {
    this.mockResponses.set(prompt, { content: response });
  }

  clearMocks(): void {
    this.mockResponses.clear();
  }

  async chatCompletion(prompt: string): Promise<MockResponse> {
    const response = this.mockResponses.get(prompt);
    if (!response) {
      throw new Error(`No mock response found for prompt: ${prompt}`);
    }
    return response;
  }
}
