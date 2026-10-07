import { WebSocketServer } from 'ws';
export class AuraWebSocketServer {
    server;
    generationSubscribers = new Map();
    started = false;
    constructor(port, allowedOrigin) {
        this.server = new WebSocketServer({
            port,
            verifyClient: (info) => !allowedOrigin || !info.origin || info.origin === allowedOrigin,
        });
    }
    start() {
        if (this.started)
            return Promise.resolve();
        this.started = true;
        this.server.on('connection', (socket) => {
            socket.send(JSON.stringify({ type: 'connection_established', timestamp: Date.now(), data: { status: 'connected' } }));
            socket.on('close', () => {
                for (const [requestId, subscriber] of this.generationSubscribers) {
                    if (subscriber === socket)
                        this.generationSubscribers.delete(requestId);
                }
            });
            socket.on('message', (raw) => {
                try {
                    const event = JSON.parse(raw.toString());
                    if (event.type === 'generation_subscribe' && typeof event.requestId === 'string') {
                        this.generationSubscribers.set(event.requestId, socket);
                        socket.send(JSON.stringify({
                            type: 'generation_subscription_ready',
                            timestamp: Date.now(),
                            requestId: event.requestId,
                            data: { status: 'subscribed' },
                        }));
                        return;
                    }
                    if (event.type === 'generation_unsubscribe' && typeof event.requestId === 'string') {
                        if (this.generationSubscribers.get(event.requestId) === socket)
                            this.generationSubscribers.delete(event.requestId);
                        return;
                    }
                    const eventType = event.type;
                    if (!eventType || !['telemetry_update', 'ui_fallback', 'ui_morph_start', 'ui_morph_complete'].includes(eventType))
                        return;
                    const payload = {
                        type: eventType,
                        timestamp: Date.now(),
                        data: event.data,
                        ...(typeof event.requestId === 'string' ? { requestId: event.requestId } : {}),
                    };
                    this.server.clients.forEach((client) => {
                        if (client.readyState === 1) {
                            client.send(JSON.stringify(payload));
                        }
                    });
                }
                catch {
                    socket.send(JSON.stringify({ type: 'validation_error', timestamp: Date.now(), data: { message: 'Invalid telemetry payload.' } }));
                }
            });
        });
        if (this.server.address())
            return Promise.resolve();
        return new Promise((resolve, reject) => {
            this.server.once('listening', resolve);
            this.server.once('error', reject);
        });
    }
    get port() {
        const address = this.server.address();
        return address && typeof address !== 'string' ? address.port : null;
    }
    sendToRequest(requestId, type, data) {
        const socket = this.generationSubscribers.get(requestId);
        if (socket?.readyState === 1) {
            const payload = { type, timestamp: Date.now(), data, requestId };
            socket.send(JSON.stringify(payload));
        }
        if (type === 'ui_generation_complete' || type === 'ui_generation_error') {
            this.generationSubscribers.delete(requestId);
        }
    }
    broadcast(type, data) {
        const payload = {
            type,
            timestamp: Date.now(),
            data,
            ...(typeof data.requestId === 'string' ? { requestId: data.requestId } : {}),
        };
        this.server.clients.forEach((client) => {
            if (client.readyState === 1) {
                client.send(JSON.stringify(payload));
            }
        });
    }
    close(callback) {
        this.server.close(callback);
    }
}
