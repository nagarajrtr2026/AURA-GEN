import { WebSocketServer } from 'ws';
export class AuraWebSocketServer {
    server;
    constructor(port) {
        this.server = new WebSocketServer({ port });
    }
    start() {
        this.server.on('connection', (socket) => {
            socket.send(JSON.stringify({ type: 'connection_established', timestamp: Date.now(), data: { status: 'connected' } }));
            socket.on('message', (raw) => {
                try {
                    const event = JSON.parse(raw.toString());
                    const payload = {
                        type: event.type ?? 'telemetry_update',
                        timestamp: Date.now(),
                        data: event.data,
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
    }
    broadcast(type, data) {
        const payload = {
            type,
            timestamp: Date.now(),
            data,
        };
        this.server.clients.forEach((client) => {
            if (client.readyState === 1) {
                client.send(JSON.stringify(payload));
            }
        });
    }
    close() {
        this.server.close();
    }
}
