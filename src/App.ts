import { ServiceContainer } from './ServiceContainer';
import { EventService } from './services/EventService';
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
        this._serviceContainer.register(EventService);

        for (const callback of this._initCallbacks) {
            await callback(this._serviceContainer.createContext);
        }
    }

    public async start(): Promise<void> {}
}
