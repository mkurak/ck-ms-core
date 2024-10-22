import { HandlerResponse } from './HandlerResponse';

export interface Subscriber {
    callbackAsync: (payload: HandlerResponse) => Promise<void>;
    order: number | null;
}
