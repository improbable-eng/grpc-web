// Allow Node to accept the self-signed certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
// Disable the CORS-related tests as they don't apply for Node environments (no origin)
process.env.DISABLE_CORS_TESTS = true;
// Disable the WebSocket-based tests as they don't apply for Node environments
process.env.DISABLE_WEBSOCKET_TESTS = true;

import "../src/spec";
