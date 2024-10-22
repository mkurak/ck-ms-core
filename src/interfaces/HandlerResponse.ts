import { HandlerError } from './HandlerError';

export interface HandlerResponse {
    data: any | null;
    result: any;
    error: HandlerError | null;
    stopProcessing: boolean;
    sessionId?: string;
}
