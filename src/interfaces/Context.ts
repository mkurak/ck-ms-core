export interface Context {
    beginSession(): string;
    endSession(sessionId: string): void;
    resolveAsync<T>(nameOrType: any, sessionId?: string): Promise<T | undefined>;
}
