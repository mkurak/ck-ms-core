import { Lifecycle } from '../types';

export interface ServiceModel {
    name: string;
    lifecycle: Lifecycle;
    classType: new (...args: any[]) => any;
    instance?: any;
    sessionId?: string;
}
