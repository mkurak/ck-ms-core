export interface ServiceMetadatas {
    name: string;
    target: new (...args: any[]) => any;
    lifecycle: 'singleton' | 'transient' | 'scoped';
    paramTypes: any[];
}
