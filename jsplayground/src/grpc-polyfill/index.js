import chunkedRequest from 'chunked-request';
import { grpcChunkParser, frameRequest } from './src/transport';

function makeRequestBody(req, serializer) {
	try {
		return frameRequest(serializer(req))
	}
	catch (e) {
		throw new Error(`failed to frame request body: ${e.message}`);
	}
}


// makeRpc returns a new gRPC service which can be used to initiate calls against
// the gRPC host; this function is not intended to be called directly, but is instead
// used as a factory function by `makeGenericClientConstructor()`.
function makeRpc(name, serviceDescriptor, props) {
	if (serviceDescriptor.requestStream) {
		// it's not possible to stream data to a server using HTML5.
		throw new Error(`unsupported requestStream on ${key}`);
	}

	// This function is used by the client to initiate an RPC.
	return function (req, callback) {
		const { requestSerialize, responseDeserialize } = serviceDescriptor;

		let lastMessage;
		let lastTerminator;
		let lastError;

		// initiate the request.
		chunkedRequest({
			url: `${props.host}${serviceDescriptor.path}`,
			method: 'POST',
			headers: {
				"content-type": "application/grpc-web",
				"grpc-browser-compat": "true"
			},
			body: makeRequestBody(req, requestSerialize),
			chunkParser: grpcChunkParser,
			onChunk: function (err, data) {
				try {
					const messages = data
					.filter(d => d.type === 'message')
					.map(d => responseDeserialize(d.data));

					const terminators = data
						.filter(d => d.type === 'terminator')

					if (messages.length) {
						lastMessage = messages[messages.length -1];
					}
					if (terminators.length) {
						lastTerminator = terminators[terminators.length-1];
					}
				}
				catch (e) {
					lastError = e;
				}
			},
			onComplete: function() {
				console.log(">>> on complete, terminator ", lastTerminator.data);
				callback(lastError, lastMessage)
			}
		});
	}
}

exports.makeGenericClientConstructor = function (protoDescriptor) {
	var _props = {};

	// Client is the object returned the consumer so they can make the RPC
	// `host` is the gRPC endpoint to call, ie: https://localhost:8080/
	var Client = function (host) {
		_props.host = host;
	};

	// Dynamically add the methods from the protoDescriptor to the Client.
	Object.keys(protoDescriptor)
		.forEach(function (key) {
			Client.prototype[key] = makeRpc(key, protoDescriptor[key], _props);
	});

	return Client;
};