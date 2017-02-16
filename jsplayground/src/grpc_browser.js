require('./proto/terminator_pb.js');

console.log("I AM BEING INCLUDED");

// Demo
import testproto from './proto/test_pb.js'



var TERMINATOR_SIZE = 4
var HEADER_SIZE = 5

// frameMessage builds a gRPC frame around a proto message and returns the whole payload.
export function frameMessage(protoMessage) {
  var messageBytes = protoMessage.serializeBinary()
  var frame = new ArrayBuffer(messageBytes.byteLength + 5)
  // Write length pre-amble.
  new DataView(frame, 1, 4).setUint32(0, messageBytes.length, false /* big endian */)
  new Uint8Array(frame, 5).set(messageBytes)
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
      return
    }
    var headerView = new DataView(state.buffer, state.position + TERMINATOR_SIZE, HEADER_SIZE)
    var terminatorLength = readLengthFromHeader(headerView)
    if (!hasEnoughBytes(TERMINATOR_SIZE + HEADER_SIZE + terminatorLength, state)) {  // position was still not updated
      console.log('Terminator reading is broken, will wait on more data.')
    }

    // TODO(michal): Fill this out.
    var terminatorData = new Uint8Array(state.buffer, state.position + TERMINATOR_SIZE + HEADER_SIZE, terminatorLength)
    var terminator = proto.grpc.experimental.browser_compat.BrowserTerminator.deserializeBinary(terminatorData)

    console.log('Terminator: ', terminator.toObject())
    state.position += 2 * HEADER_SIZE + terminatorLength
    return
}

export function dispatchMessage(readBuffer, state) {
  addBufferToState(readBuffer, state)
  var messageCount = 0
  while (true) {
    if (!hasEnoughBytes(HEADER_SIZE, state)) {
      return messageCount
    }
    var headerView = new DataView(state.buffer, state.position, HEADER_SIZE);


    if (headerIsTerminatorMarker(state)) {
      parseAndHandleTerminator(state)
    } else {
      var msgLength = readLengthFromHeader(headerView)
      if (!hasEnoughBytes(HEADER_SIZE + msgLength, state)) {
        return messageCount
      }
      var messageData = new Uint8Array(state.buffer, state.position + HEADER_SIZE, msgLength)
      var msg = proto.mwitkow.testproto.PingResponse.deserializeBinary(messageData)
      console.log('Message', msg.toObject())

      state.position += HEADER_SIZE + msgLength
      messageCount += 1
    }
  }
}