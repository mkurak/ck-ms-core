import 'reflect-metadata';
import { ServiceMetadatas } from '../interfaces/ServiceMetadatas';

export interface ServiceOptions {
    name?: string;
    lifecycle?: 'singleton' | 'transient' | 'scoped';
}

export function Service(options?: ServiceOptions) {
    return function (target: any) {
        const name = options?.name || target.name;
        const lifecycle = options?.lifecycle || 'transient';

        const paramTypes = Reflect.getMetadata('design:paramtypes', target) || [];

        Reflect.defineMetadata(
            'ck:service',
            {
                name,
                target,
                lifecycle,
                paramTypes,
            } as ServiceMetadatas,
            target,
        );
    };
}
