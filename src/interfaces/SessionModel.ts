import { ServiceModel } from './ServiceModel';

export interface SessionModel {
    services: Map<string, ServiceModel>;
}
