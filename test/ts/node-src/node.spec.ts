// Allow Node to accept the self-signed certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
// Disable the CORS-related tests as they don't apply for Node environments (no origin)
process.env.DISABLE_CORS_TESTS = true;

import "../src/grpc.spec";
import "../src/detach.spec";
