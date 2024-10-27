import { Service } from '../decorators/Service';
import mongoose, { Connection, Model, Schema } from 'mongoose';

@Service({ lifecycle: 'singleton' })
export class MongoDbService {
    private connections: Set<Connection> = new Set();
    private MONGO_URI: string = process.env.MONGO_URI ?? 'mongodb://localhost:27017/test';
    private MONGO_OPTIONS: mongoose.ConnectOptions = process.env.MONGO_OPTIONS
        ? JSON.parse(process.env.MONGO_OPTIONS)
        : {
              useNewUrlParser: true,
              useUnifiedTopology: true,
          };

    async createConnection(): Promise<Connection> {
        const connection = mongoose.createConnection(this.MONGO_URI, this.MONGO_OPTIONS);
        this.connections.add(connection);
        return connection;
    }

    async createModel(connection: Connection, modelName: string, schema: Schema): Promise<mongoose.Model<any, {}, {}, {}, any, any>> {
        return connection.model(modelName, schema);
    }

    async closeConnection(connection: Connection): Promise<void> {
        await connection.close();
        this.connections.delete(connection);
    }

    async closeAllConnections(): Promise<void> {
        await Promise.all(Array.from(this.connections).map((connection) => connection.close()));
        this.connections.clear();
    }

    async dispose(): Promise<void> {
        await this.closeAllConnections();
    }
}
