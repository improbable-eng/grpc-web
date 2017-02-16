require('../proto/terminator_pb.js');

var TERMINATOR_SIZE = 4
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


function headerIsTerminatorMarker(state) {
  var x = new Uint8Array(state.buffer, state.position, TERMINATOR_SIZE)
  return x[0] == 0xD && x[1] == 0xE && x[2] == 0xA && x[3] == 0xD
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

function parseAndHandleTerminator(state) {
  if (!hasEnoughBytes(HEADER_SIZE + TERMINATOR_SIZE, state)) {
    console.log('Not enough bytes to read terminator')
    return null;
  }
  var headerView = new DataView(state.buffer, state.position + TERMINATOR_SIZE, HEADER_SIZE)
  var terminatorLength = readLengthFromHeader(headerView)
  if (!hasEnoughBytes(TERMINATOR_SIZE + HEADER_SIZE + terminatorLength, state)) {  // position was still not updated
    console.log('Terminator reading is broken, will wait on more data.')
    return null;
  }

  // TODO(michal): Fill this out.
  var terminatorData = new Uint8Array(state.buffer, state.position + TERMINATOR_SIZE + HEADER_SIZE, terminatorLength)
  var terminator = proto.grpc.experimental.browser_compat.BrowserTerminator.deserializeBinary(terminatorData)

  state.position += 2 * HEADER_SIZE + terminatorLength
  return terminator
}

export function grpcChunkParser(bytes, state = {}, flush) {
  var chunkData = [];

  if (bytes.length === 0 && flush) {
    return [ chunkData, state ];
  }

  addBufferToState(bytes.buffer, state)

  var messageCount = 0


  while (true) {
    if (!hasEnoughBytes(HEADER_SIZE, state)) {
      return [ chunkData, state ];
    }
    var headerView = new DataView(state.buffer, state.position, HEADER_SIZE);

    if (headerIsTerminatorMarker(state)) {
      const terminator = parseAndHandleTerminator(state)
      if (terminator) {
        chunkData.push({ type: 'terminator', data: terminator });
        return [ chunkData, state ]
      }

    }
    var msgLength = readLengthFromHeader(headerView)
    if (!hasEnoughBytes(HEADER_SIZE + msgLength, state)) {
      return [ chunkData, state ]
    }
    var messageData = new Uint8Array(state.buffer, state.position + HEADER_SIZE, msgLength)
    chunkData.push({ type: 'message', data: messageData })

    state.position += HEADER_SIZE + msgLength
    messageCount += 1
  }

  return [ chunkData, state ];
}