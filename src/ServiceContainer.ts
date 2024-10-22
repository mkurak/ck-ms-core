import 'reflect-metadata';
import { v4 as uuidv4 } from 'uuid';
import { ServiceModel } from './interfaces/ServiceModel';
import { SessionModel } from './interfaces/SessionModel';
import { Lifecycle } from './types';
import { Context } from './interfaces/Context';
import { ServiceMetadatas } from './interfaces/ServiceMetadatas';

export class ServiceContainer {
    private _services: Map<string, ServiceModel> = new Map();
    private _sessions: Map<string, SessionModel> = new Map();
    private _context?: Context;

    public beginSession(): string {
        const sessionId = uuidv4();

        if (this._sessions.has(sessionId)) {
            return this.beginSession();
        }

        this._sessions.set(sessionId, { services: new Map() });

        return sessionId;
    }

    public endSession(sessionId: string): void {
        this._sessions.delete(sessionId);
    }

    public get createContext(): Context {
        if (!this._context) {
            this._context = {
                beginSession: this.beginSession.bind(this),
                endSession: this.endSession.bind(this),
                resolveAsync: this.resolveAsync.bind(this),
            };
        }

        return this._context;
    }

    private async _createInstanceAsync<T>(service: ServiceModel, sessionId?: string): Promise<T> {
        const dependencies = Reflect.getMetadata('design:paramtypes', service.classType) || [];

        let resolvedDependencies: Array<any> = new Array();

        for (let dependency of dependencies) {
            if (dependency.name === 'Context') {
                resolvedDependencies.push(this.createContext);
                continue;
            }

            if (!this._services.has(dependency.name)) {
                resolvedDependencies.push(undefined);
                continue;
            }

            const depService = this._services.get(dependency.name);
            if (!depService) {
                console.error(`Dependency with type ${dependency.name} does not exist for service ${service.name}`);
                resolvedDependencies.push(undefined);
                continue;
            }

            if (service.lifecycle == 'singleton' && depService?.lifecycle == 'scoped') {
                console.error(`Service with name ${dependency.name} is scoped and cannot be injected into a singleton service`);
                resolvedDependencies.push(undefined);
                continue;
            }

            const _service = await this.resolveAsync(dependency.name, sessionId);
            resolvedDependencies.push(_service);
        }

        const instance = new service.classType(...resolvedDependencies);
        if (instance['init']) {
            const initResult = instance['init']();

            if (initResult instanceof Promise) {
                await initResult;
            }
        }

        return instance;
    }

    public async resolveAsync<T>(nameOrType: any, sessionId?: string): Promise<T | undefined> {
        let serviceName: string = typeof nameOrType === 'string' ? nameOrType : nameOrType.name;
        let service: ServiceModel | undefined;

        if (sessionId) {
            const session = this._sessions.get(sessionId);
            if (session) {
                const service = session.services.get(serviceName);
                if (!service) {
                    const serviceMain = this._services.get(serviceName);
                    if (!serviceMain) {
                        console.error(`Service with name ${serviceName} does not exist`);
                        return undefined;
                    }

                    if (serviceMain.lifecycle !== 'scoped') {
                        console.error(`Service with name ${serviceName} is not scoped`);
                        return undefined;
                    }

                    const newService = {
                        name: serviceName,
                        lifecycle: 'scoped',
                        classType: serviceMain.classType,
                    } as ServiceModel;
                    newService.instance = await this._createInstanceAsync(newService, sessionId);
                    session.services.set(serviceName, newService);

                    return newService.instance;
                } else {
                    return service.instance;
                }
            } else {
                console.error(`Session with id ${sessionId} does not exist`);
                return undefined;
            }
        } else {
            service = this._services.get(serviceName);
            if (!service) {
                console.error(`Service with name ${nameOrType} does not exist`);
                return undefined;
            }

            switch (service.lifecycle) {
                case 'singleton':
                    if (!service.instance) {
                        service.instance = await this._createInstanceAsync(service);
                    }
                    return service.instance;
                case 'transient':
                    return await this._createInstanceAsync(service);
                default:
                    console.error(`Service with name ${nameOrType} is scoped and requires a session id to resolve`);
                    return undefined;
            }
        }
    }

    private _getServiceMetadata(target: new (...args: any[]) => any): ServiceMetadatas | undefined {
        const data = Reflect.getMetadata('ck:service', target);

        return data ? (data as ServiceMetadatas) : undefined;
    }

    public register(classType: new (...args: any[]) => any): void {
        const metadata = this._getServiceMetadata(classType);

        if (!metadata) {
            console.error('Decorator not used for the service. You must use the @Service decorator to add the service...');
            return;
        }

        if (this._services.has(metadata.name)) {
            console.error(`Service with name ${name} already exists`);
            return;
        }

        const service = {
            name: metadata.name,
            lifecycle: metadata.lifecycle as Lifecycle,
            classType: metadata.target,
        } as ServiceModel;

        this._services.set(metadata.name, service);
    }

    public clear(): void {
        this._services.clear();
        this._sessions.clear();
    }

    public get foundedServicesCount(): number {
        return this._services.size;
    }

    public get foundedSessionsCount(): number {
        return this._sessions.size;
    }
}
