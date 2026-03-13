export class ChatbotError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ChatbotError';
  }
}

export class NlpNotInitializedError extends ChatbotError {
  constructor() {
    super('NLP service not initialized', 'NLP_NOT_INITIALIZED', 500);
  }
}

export class QueryNotFoundError extends ChatbotError {
  constructor(queryName: string) {
    super(`Query not found: ${queryName}`, 'QUERY_NOT_FOUND', 404);
  }
}

export class ApiConnectionError extends ChatbotError {
  constructor(message: string) {
    super(message, 'API_CONNECTION_ERROR', 502);
  }
}

export class CircuitOpenError extends ChatbotError {
  constructor(baseUrl: string) {
    super(
      `Circuit breaker is OPEN for ${baseUrl} — requests are temporarily blocked`,
      'CIRCUIT_OPEN',
      503
    );
  }
}

export class FileReadError extends ChatbotError {
  constructor(filePath: string, detail?: string) {
    super(
      `Failed to read file: ${filePath}${detail ? ' — ' + detail : ''}`,
      'FILE_READ_ERROR',
      500
    );
  }
}
