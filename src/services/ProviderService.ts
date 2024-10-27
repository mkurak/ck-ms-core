import { Service } from '../decorators/Service';

@Service({ lifecycle: 'singleton' })
export class ServiceProvider {
    beginSession(): string {
        return '';
    }
    endSession(sessionId: string): void {}
    resolveAsync<T>(nameOrType: any, sessionId?: string): Promise<T | undefined> {
        return Promise.resolve(undefined);
    }
    register(classType: new (...args: any[]) => any): void {}
}
