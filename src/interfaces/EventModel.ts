import { Subscriber } from './Subscriber';

export interface EventModel {
    event: string;
    subscribers: Subscriber[];
}
