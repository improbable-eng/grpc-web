import {Metadata} from "../metadata";
import {Transport, TransportOptions} from "./Transport";
import {debug} from "../debug";
import detach from "../detach";
import {encodeASCII} from "../ChunkParser";

enum WebsocketSignal {
  FINISH_SEND = 1
}

const finishSendFrame = new Uint8Array([1]);

/* websocketRequest uses Websockets and requires the server to enable experimental websocket support */
export default function websocketRequest(options: TransportOptions): Transport {
  options.debug && debug("websocketRequest", options);

  let webSocketAddress = constructWebSocketAddress(options.url);

  const sendQueue: Array<ArrayBufferView | WebsocketSignal> = [];
  let ws: WebSocket;

  function sendToWebsocket(toSend: ArrayBufferView | WebsocketSignal) {
    if (toSend === WebsocketSignal.FINISH_SEND) {
      ws.send(finishSendFrame);
    } else {
      const byteArray = toSend as ArrayBufferView;
      const c = new Int8Array(byteArray.byteLength + 1);
      c.set(new Uint8Array([0]));

      c.set(byteArray as any as ArrayLike<number>, 1);

      ws.send(c)
    }
  }

  return {
    sendMessage: (msgBytes: ArrayBufferView) => {
      if (!ws || ws.readyState === ws.CONNECTING) {
        sendQueue.push(msgBytes);
      } else {
        sendToWebsocket(msgBytes);
      }
    },
    finishSend: () => {
      if (!ws || ws.readyState === ws.CONNECTING) {
        sendQueue.push(WebsocketSignal.FINISH_SEND);
      } else {
        sendToWebsocket(WebsocketSignal.FINISH_SEND);
      }
    },
    start: (metadata: Metadata) => {
      ws = new WebSocket(webSocketAddress, ["grpc-websockets"]);
      ws.binaryType = "arraybuffer";
      ws.onopen = function () {
        options.debug && debug("websocketRequest.onopen");
        ws.send(headersToBytes(metadata));

        // send any messages that were passed to sendMessage before the connection was ready
        sendQueue.forEach(toSend => {
          sendToWebsocket(toSend);
        });
      };

      ws.onclose = function (closeEvent) {
        options.debug && debug("websocketRequest.onclose", closeEvent);
        detach(() => {
          options.onEnd();
        });
      };

      ws.onerror = function (error) {
        options.debug && debug("websocketRequest.onerror", error);
      };

      ws.onmessage = function (e) {
        detach(() => {
          options.onChunk(new Uint8Array(e.data));
        });
      };

    },
    cancel: () => {
      options.debug && debug("websocket.abort");
      detach(() => {
        ws.close();
      });
    }
  };
}

function constructWebSocketAddress(url: string) {
  if (url.substr(0, 8) === "https://") {
    return `wss://${url.substr(8)}`;
  } else if (url.substr(0, 7) === "http://") {
    return `ws://${url.substr(7)}`;
  }
  throw new Error("Websocket transport constructed with non-https:// or http:// host.");
}

function headersToBytes(headers: Metadata): Uint8Array {
  let asString = "";
  headers.forEach((key, values) => {
    asString += `${key}: ${values.join(", ")}\r\n`;
  });
  return encodeASCII(asString);
}
