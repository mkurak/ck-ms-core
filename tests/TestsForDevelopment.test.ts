import { App, Context } from '../src';
import { Service } from '../src/decorators/Service';
import { CacheService } from '../src/services/CacheService';

describe('Tests for development', () => {
    test('injectInitCallback', async () => {
        const app = new App();

        let testData: any;

        app.injectInitCallback(async (payload: Context): Promise<void> => {
            testData = payload;
        });

        await app.init();

        expect(testData).not.toBeUndefined();
    });

    test('CacheService', async () => {
        const app = new App();

        @Service()
        class TestService {
            constructor(public cacheService?: CacheService) {}

            async setCacheData() {
                this.cacheService!.createNamespace('test');
                await this.cacheService!.set('test', 'test', 'test');
            }

            async getCacheData() {
                return await this.cacheService!.get('test', 'test');
            }
        }

        let checkTestData: string;

        app.injectInitCallback(async (payload: Context): Promise<void> => {
            payload.register(TestService);

            const testService = await payload.resolveAsync<TestService>(TestService);
            if (testService) {
                await testService.setCacheData();
                checkTestData = await testService.getCacheData();
            }
        });

        await app.init();

        expect(checkTestData!).toBeDefined();
        expect(checkTestData!).toBe('test');
    });
});
