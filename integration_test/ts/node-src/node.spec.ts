// Allow Node to accept the self-signed certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
// Disable the CORS-related tests as they don't apply for Node environments (no origin)
(global as any).DISABLE_CORS_TESTS = true;
// Disable the WebSocket-based tests as they don't apply for Node environments
(global as any).DISABLE_WEBSOCKET_TESTS = true;

import "../src/spec";
