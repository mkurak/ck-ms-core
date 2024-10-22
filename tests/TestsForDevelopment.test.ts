import { App, Context } from '../src';

describe('Tests for development', () => {
    test('test1', async () => {
        const app = new App();

        let testData: any;

        app.injectInitCallback(async (payload: Context): Promise<void> => {
            testData = payload;
        });

        await app.init();

        expect(testData).not.toBeUndefined();
    });
});
