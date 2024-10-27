import { ServiceContainer } from './ServiceContainer';
import { CacheService } from './services/CacheService';
import { EventService } from './services/EventService';
import { ServiceProvider } from './services/ProviderService';
import { QueueService } from './services/QueueService';
import { Context } from './types';

export class App {
    private _serviceContainer: ServiceContainer;
    private _initCallbacks: Array<(payload: Context) => Promise<void>> = [];

    constructor() {
        this._serviceContainer = new ServiceContainer();
    }

    public injectInitCallback(callback: (payload: Context) => Promise<void>) {
        this._initCallbacks.push(callback);
    }

    public async init(): Promise<void> {
        this._serviceContainer.register(ServiceProvider);
        this._serviceContainer.register(EventService);
        this._serviceContainer.register(CacheService);
        this._serviceContainer.register(QueueService);

        const serviceProvider = await this._serviceContainer.resolveAsync<ServiceProvider>(ServiceProvider);
        if (serviceProvider) {
            serviceProvider.beginSession = this._serviceContainer.beginSession.bind(this._serviceContainer);
            serviceProvider.endSession = this._serviceContainer.endSession.bind(this._serviceContainer);
            serviceProvider.resolveAsync = this._serviceContainer.resolveAsync.bind(this._serviceContainer);
            serviceProvider.register = this._serviceContainer.register.bind(this._serviceContainer);
        }

        for (const callback of this._initCallbacks) {
            await callback(this._serviceContainer.createContext);
        }
    }

    public async dispose(): Promise<void> {
        const eventService = await this._serviceContainer.resolveAsync<EventService>(EventService);
        const cacheService = await this._serviceContainer.resolveAsync<CacheService>(CacheService);
        const queueService = await this._serviceContainer.resolveAsync<QueueService>(QueueService);

        if (eventService) {
            await eventService.dispose();
        }

        if (cacheService) {
            await cacheService.dispose();
        }

        if (queueService) {
            await queueService.dispose();
        }

        this._serviceContainer.dispose();

        Object.keys(this).forEach((key) => {
            (this as any)[key] = undefined;
        });
    }

    public async start(): Promise<void> {}
}
