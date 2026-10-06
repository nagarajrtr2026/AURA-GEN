import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WebSocket } from 'ws';
import { AuraWebSocketServer } from './server.js';
test('generation events are delivered only to the subscribed socket', async () => {
    const server = new AuraWebSocketServer(0, 'http://localhost:3000');
    await server.start();
    const url = `ws://127.0.0.1:${server.port}`;
    const first = new WebSocket(url, { origin: 'http://localhost:3000' });
    const second = new WebSocket(url, { origin: 'http://localhost:3000' });
    const secondEvents = [];
    second.on('message', (raw) => secondEvents.push(JSON.parse(raw.toString())));
    try {
        await Promise.all([
            new Promise((resolve) => first.once('open', resolve)),
            new Promise((resolve) => second.once('open', resolve)),
        ]);
        const subscriptionReady = new Promise((resolve) => {
            first.once('message', (raw) => resolve(JSON.parse(raw.toString())));
        });
        first.send(JSON.stringify({ type: 'generation_subscribe', requestId: 'request-1' }));
        assert.equal((await subscriptionReady).type, 'generation_subscription_ready');
        const streamedEvent = new Promise((resolve) => {
            first.once('message', (raw) => resolve(JSON.parse(raw.toString())));
        });
        server.sendToRequest('request-1', 'ui_generation_stream', { token: 'private-token' });
        const received = await streamedEvent;
        await new Promise((resolve) => setTimeout(resolve, 20));
        assert.equal(received.type, 'ui_generation_stream');
        assert.equal(received.data.token, 'private-token');
        assert.equal(secondEvents.some((event) => event.type === 'ui_generation_stream'), false);
        const rejectedClient = new WebSocket(url, { origin: 'https://attacker.example' });
        await assert.rejects(new Promise((resolve, reject) => {
            rejectedClient.once('open', resolve);
            rejectedClient.once('error', reject);
        }), /Unexpected server response: 401/);
    }
    finally {
        first.close();
        second.close();
        await new Promise((resolve) => server.close(() => resolve()));
    }
});
