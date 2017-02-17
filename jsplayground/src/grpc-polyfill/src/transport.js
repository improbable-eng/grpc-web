var parseHeaders = require('parse-headers')

var HEADER_SIZE = 5

// frameRequest packs a gRPC request with the correct preample expected by the
// gPRC endpoint.
export function frameRequest(bytes) {
    const frame = new ArrayBuffer(bytes.byteLength + 5);
    new DataView(frame, 1, 4).setUint32(0, bytes.length, false /* big endian */);
    new Uint8Array(frame, 5).set(bytes);
    return frame
}

function hasEnoughBytes(byteCount, state) {
    return state.buffer.byteLength - state.position >= byteCount
}

function isTrailerHeader(headerView) {
    // This is encoded in the MSB of the grpc header's first byte.
    return (headerView.getUint8(0) & 0x80) === 0x80
}

function parseTrailerData(msgData) {
    // Note: THIS MAY NOT BE CORRECT, who knows what the text encoding is for HTTP headers.
    var str = new TextDecoder("utf-8").decode(msgData);
    return parseHeaders(str)
}

function readLengthFromHeader(headerView) {
    return headerView.getUint32(1, false /* bigEndian */)
}

function addBufferToState(readBuffer, state) {
    if (state.buffer == null) {
        state.buffer = readBuffer;
        state.position = 0;
    } else if (state.position == state.buffer.byteLength) {
        state.buffer = readBuffer;
        state.position = 0;
    } else {
        var remaining = state.buffer.byteLength - state.position;
        var newBuf = new Uint8Array(remaining + readBuffer.byteLength);
        newBuf.set(new Uint8Array(state.buffer, state.position), 0);
        newBuf.set(new Uint8Array(readBuffer), remaining);
        state.buffer = newBuf.buffer;
        state.position = 0;
    }
}


export function grpcChunkParser(bytes, state = {}, flush) {
    var chunkData = [];

    if (bytes.length === 0 && flush) {
        return [chunkData, state];
    }

    addBufferToState(bytes.buffer, state)

    while (true) {
        if (!hasEnoughBytes(HEADER_SIZE, state)) {
            return [chunkData, state];
        }
        let headerBuffer = state.buffer.slice(state.position, state.position + HEADER_SIZE)
        var headerView = new DataView(headerBuffer);

        var msgLength = readLengthFromHeader(headerView)
        if (!hasEnoughBytes(HEADER_SIZE + msgLength, state)) {
            return [chunkData, state]
        }
        var messageData = new Uint8Array(state.buffer, state.position + HEADER_SIZE, msgLength)
        state.position += HEADER_SIZE + msgLength
        if (isTrailerHeader(headerView)) {
            var trailers = parseTrailerData(messageData);
            chunkData.push({type: 'terminator', data: trailers});
            return [chunkData, state]
        } else {
            chunkData.push({type: 'message', data: messageData})
        }
    }

    return [chunkData, state];
}



function buf2hex(buffer) { // buffer is an ArrayBuffer
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join(' ');
}
