import { Service } from '../decorators/Service';
import amqp, { Connection, Channel, Options } from 'amqplib';
import { ConsumerPayload, Context, ExchangeConfig, PublishOptions, QueueConfig } from '../types';
import { ServiceProvider } from './ProviderService';

@Service({ lifecycle: 'singleton' })
export class QueueService {
    private connection?: Connection;
    private channels: Channel[] = [];
    private RABBITMQ_PROTOCOL: string = process.env.RABBITMQ_PROTOCOL || 'amqp';
    private RABBITMQ_USERNAME?: string = process.env.RABBITMQ_USERNAME || 'guest';
    private RABBITMQ_PASSWORD?: string = process.env.RABBITMQ_PASSWORD || 'guest';
    private RABBITMQ_HOST?: string = process.env.RABBITMQ_HOST || 'localhost';
    private RABBITMQ_PORT?: number = Number(process.env.RABBITMQ_PORT || '5672');
    private RABBITMQ_HEARTBEAT?: number = Number(process.env.RABBITMQ_HEARTBEAT) || 60;
    private RABBITMQ_VHOST?: string = process.env.RABBITMQ_VHOST || '/';
    private isClosed: boolean = false;
    private isConnected: boolean = false;
    private _serviceProvider?: ServiceProvider;

    constructor(serviceProvider?: ServiceProvider) {
        this._serviceProvider = serviceProvider;
    }

    async init(): Promise<void> {
        await this.connect();
    }

    checkConnection(): boolean {
        return this.isConnected === true;
    }

    private async connect(): Promise<void> {
        this.connection = await amqp.connect({
            protocol: this.RABBITMQ_PROTOCOL,
            hostname: this.RABBITMQ_HOST,
            port: this.RABBITMQ_PORT,
            username: this.RABBITMQ_USERNAME,
            password: this.RABBITMQ_PASSWORD,
            heartbeat: this.RABBITMQ_HEARTBEAT,
            vhost: this.RABBITMQ_VHOST,
        });

        this.isConnected = true;

        this.connection.on('close', async () => {
            this.isConnected = false;

            if (this.isClosed) {
                return;
            }
            this.connect();
        });

        this.connection.on('error', async (err: any) => {
            this.isConnected = false;
            console.error('Connection error:', err);
            this.connect();
        });

        const defaultChannel = await this.connection.createChannel();

        if (this.channels.length === 0) {
            this.channels.push(defaultChannel);
        } else {
            this.channels[0] = defaultChannel;
        }
    }

    async createChannel(): Promise<Channel> {
        if (!this.connection) {
            throw new Error('Connection is not established');
        }
        const channel = await this.connection.createChannel();
        this.channels.push(channel);
        return channel;
    }

    async configureExchange(config: ExchangeConfig, channel?: Channel): Promise<void> {
        if (!this.connection) {
            throw new Error('Connection is not established');
        }

        if (!channel) {
            channel = this.channels[0];
        }

        await channel.assertExchange(config.name, config.type, config.options);
    }

    async configureQueue(config: QueueConfig, exchangeName?: string, channel?: Channel): Promise<void> {
        if (!this.connection) {
            throw new Error('Connection is not established');
        }

        if (!channel) {
            channel = this.channels[0];
        }

        await channel.assertQueue(config.name, config.options);
        if (exchangeName && config.bindingKey) {
            await channel.bindQueue(config.name, exchangeName, config.bindingKey);
        }
    }

    async consume(queueName: string, onMessage: (payload: ConsumerPayload) => Promise<void>, channel?: Channel): Promise<void> {
        if (!this.connection) {
            throw new Error('Connection is not established');
        }

        if (!channel) {
            channel = this.channels[0];
        }

        await channel.consume(
            queueName,
            async (msg: any | null) => {
                if (msg) {
                    let actionTaken = false;

                    const sessionId = this._serviceProvider!.beginSession();

                    const payload: ConsumerPayload = {
                        message: this.parseMessage(msg),
                        sessionId,
                        ack: () => {
                            channel.ack(msg);
                            actionTaken = true;
                        },
                        nack: () => {
                            channel.nack(msg);
                            actionTaken = true;
                        },
                        reject: () => {
                            channel.reject(msg);
                            actionTaken = true;
                        },
                    };

                    try {
                        await onMessage(payload);

                        this._serviceProvider!.endSession(sessionId);

                        if (!actionTaken) {
                            payload.ack();
                        }
                    } catch (error) {
                        this._serviceProvider!.endSession(sessionId);
                        console.error('Consumer handler error:', error);
                        if (!actionTaken) {
                            payload.nack();
                        }
                    }
                }
            },
            { noAck: false },
        );
    }

    async publish({ exchange = '', routingKey = '', queue, message }: PublishOptions, channel?: Channel): Promise<void> {
        if (!this.connection) {
            throw new Error('Connection is not established');
        }

        if (!channel) {
            channel = this.channels[0];
        }

        if (exchange) {
            channel.publish(exchange, routingKey, Buffer.from(message));
            console.log(`Message sent to exchange ${exchange} with routing key ${routingKey}`);
        } else if (queue) {
            channel.sendToQueue(queue, Buffer.from(message));
        } else {
            throw new Error('Either exchange or queue must be specified to publish a message');
        }
    }

    private parseMessage(msg: any): any {
        try {
            return JSON.parse(msg.content.toString());
        } catch (e) {
            return msg.content.toString();
        }
    }

    async close(): Promise<void> {
        await Promise.all(
            this.channels.map((ch) => {
                ch.deleteQueue;
            }),
        );
        this.channels = [];
        this.isClosed = true;
        await this.connection?.close();
    }

    async dispose(): Promise<void> {
        await this.close();

        Object.keys(this).forEach((key) => {
            (this as any)[key] = undefined;
        });
    }
}
