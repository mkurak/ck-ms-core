import { Service } from '../decorators/Service';
import { Context } from '../interfaces/Context';
import { EventModel } from '../interfaces/EventModel';
import { HandlerResponse } from '../interfaces/HandlerResponse';
import { Subscriber } from '../interfaces/Subscriber';

@Service({ name: 'EventService', lifecycle: 'singleton' })
export class EventService {
    private _context?: Context;
    private _events: Map<string, EventModel> = new Map();

    constructor(context?: Context) {
        this._context = context;
    }

    public addEvent(eventModel: EventModel): void {
        if (!eventModel.event || eventModel.event === '') {
            throw new Error('Event name is required');
        }

        if (this._events.has(eventModel.event)) {
            throw new Error('Event already exists');
        }

        this._events.set(eventModel.event, eventModel);
    }

    public getEvent(eventName: string): EventModel | undefined {
        return this._events.get(eventName);
    }

    public addSubscriber(eventName: string, subscriber: Subscriber): void {
        if (!this._events.has(eventName)) {
            const newEvent = {
                event: eventName,
                subscribers: [subscriber],
            } as EventModel;

            this.addEvent(newEvent);

            return;
        }

        const event: EventModel = this.getEvent(eventName) as EventModel;

        if (event.subscribers.some((sub) => sub.callbackAsync === subscriber.callbackAsync)) {
            throw new Error('Subscriber already exists');
        }

        subscriber.order = subscriber.order ?? event.subscribers.length + 1;

        event.subscribers.push(subscriber);

        event.subscribers = event.subscribers.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }

    public async triggerAsync(eventName: string, payload: HandlerResponse, sessionId?: string): Promise<HandlerResponse> {
        const event: EventModel | undefined = this.getEvent(eventName);

        if (!event) {
            this.addEvent({
                event: eventName,
                subscribers: [],
            });
        } else {
            if (this._context && !sessionId) {
                sessionId = this._context.beginSession();
            }

            payload.sessionId = sessionId;

            for (const subscriber of event.subscribers) {
                await subscriber.callbackAsync(payload);

                if (payload.stopProcessing) {
                    if (!payload.error) {
                        payload.error = {
                            message: 'Event processing stopped',
                            key: 'EVENT_PROCESSING_STOPPED',
                            stack: null,
                            meta: null,
                        };
                    }
                    break;
                }
            }

            if (this._context && sessionId) {
                this._context.endSession(sessionId);
            }
        }

        return payload;
    }

    public get eventsList(): readonly EventModel[] {
        return Object.freeze([...this._events.values()]);
    }

    public getSubscriber(eventName: string, order?: number | null): Subscriber | undefined {
        const event = this.getEvent(eventName);
        if (event) {
            return event.subscribers.find((sub) => {
                if (!order) {
                    return true;
                }

                return sub.order === order;
            });
        }
        return undefined;
    }

    public removeSubscriber(eventName: string, order: number): void {
        const event = this.getEvent(eventName);
        if (event) {
            event.subscribers = event.subscribers.filter((sub) => sub.order !== order);

            event.subscribers = event.subscribers.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        }
    }

    public removeEvent(eventName: string): void {
        this._events.delete(eventName);
    }

    public clear(): void {
        this._events.clear();
    }
}
