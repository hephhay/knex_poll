import { createClient } from 'redis';

const client = createClient({
    socket: {
        port: Number(process.env.REDIS_PORT) || 6379,
        host: process.env.REDIS_HOST,
    },
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD
});

client.on('error', (err) => console.log('Redis Client Error', err));

const redisDisconnect = async () => {
    client.quit();
}

const redisConnect = async () => {
    await client.connect();
}

export { client, redisDisconnect, redisConnect };