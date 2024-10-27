import { ConsumerPayload } from './../src/types/index';
import { App, Context } from '../src';
import { Service } from '../src/decorators/Service';
import { CacheService } from '../src/services/CacheService';
import { QueueService } from '../src/services/QueueService';

describe('Tests for development', () => {
    test('injectInitCallback', async () => {
        const app = new App();

        let testData: any;

        app.injectInitCallback(async (payload: Context): Promise<void> => {
            testData = payload;
        });

        await app.init();

        expect(testData).not.toBeUndefined();

        await app.dispose();
    });

    test('CacheService', async () => {
        const app = new App();

        @Service()
        class TestService {
            constructor(private cacheService?: CacheService) {}

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

        await app.dispose();
    });

    test('QueueService', async () => {
        const app = new App();

        app.injectInitCallback(async (payload: Context): Promise<void> => {
            const queueService = await payload.resolveAsync<QueueService>(QueueService);
            expect(queueService).toBeDefined();

            const testOnMessage = async (payload: ConsumerPayload): Promise<void> => {
                console.log('testOnMessage', payload.message);
            };

            await queueService?.configureQueue({ name: 'test' });
            await queueService?.consume('test', testOnMessage);

            await new Promise((resolve) => setTimeout(resolve, 1000));

            queueService?.publish({ queue: 'test', routingKey: 'test', message: 'test' });
        });

        await app.init();

        await app.dispose();
    });
});
