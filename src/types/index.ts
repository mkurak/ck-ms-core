import { Channel, Options } from 'amqplib';

export type Lifecycle = 'singleton' | 'transient' | 'scoped';

export type Context = {
    beginSession(): string;
    endSession(sessionId: string): void;
    resolveAsync<T>(nameOrType: any, sessionId?: string): Promise<T | undefined>;
    register(classType: new (...args: any[]) => any): void;
};

export type EventModel = {
    event: string;
    subscribers: Subscriber[];
};

export type HandlerError = {
    message: string;
    key: string;
    stack: string | null;
    meta: object | null;
};

export type HandlerResponse = {
    data: any | null;
    result: any;
    error: HandlerError | null;
    stopProcessing: boolean;
    sessionId?: string;
};

export type ServiceMetadatas = {
    name: string;
    target: new (...args: any[]) => any;
    lifecycle: 'singleton' | 'transient' | 'scoped';
    paramTypes: any[];
};

export type ServiceModel = {
    name: string;
    lifecycle: Lifecycle;
    classType: new (...args: any[]) => any;
    instance?: any;
    sessionId?: string;
};

export type SessionModel = {
    services: Map<string, ServiceModel>;
};

export type Subscriber = {
    callbackAsync: (payload: HandlerResponse) => Promise<void>;
    order: number | null;
};

export type ExchangeConfig = {
    name: string;
    type: 'direct' | 'fanout' | 'topic' | 'headers';
    options?: Options.AssertExchange;
};

export type QueueConfig = {
    name: string;
    options?: Options.AssertQueue;
    bindingKey?: string;
};

export type ConsumerPayload = {
    message: any;
    sessionId: string;
    ack: () => void;
    nack: () => void;
    reject: () => void;
};

export type PublishOptions = {
    exchange?: string;
    routingKey?: string;
    queue: string;
    message: string;
};
