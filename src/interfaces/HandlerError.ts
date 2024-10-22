export interface HandlerError {
    message: string;
    key: string;
    stack: string | null;
    meta: object | null;
}
