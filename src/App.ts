import { Context } from './interfaces/Context';
import { ServiceContainer } from './ServiceContainer';
import { EventService } from './services/EventService';

export class App {
    private _serviceContainer: ServiceContainer;
    private _initCallbacks: Array<(payload: Context) => Promise<void>> = [];

    constructor() {
        this._serviceContainer = new ServiceContainer();
    }

    public set injectInitCallback(callback: (payload: Context) => Promise<void>) {
        const context = this._serviceContainer.createContext;

        this._serviceContainer.register(EventService);

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
