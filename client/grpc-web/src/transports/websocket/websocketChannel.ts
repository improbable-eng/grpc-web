import { Metadata } from "../../metadata";
import { Transport, TransportFactory, TransportOptions } from "../Transport";
import { debug } from "../../debug";
import { Body, Cancel, Complete, GrpcFrame, Header, HeaderValue } from "./websocketChannel_pb";

export function WebsocketChannelTransport(): TransportFactory {
  type WebsocketAddress = string;
  let activeWebsockets = new Map<WebsocketAddress, WebsocketChannel>();

  function getChannel(wsHost: string): WebsocketChannel {
    let channel = activeWebsockets.get(wsHost)
    if (channel == null) {
      let newChannel = new WebsocketChannelImpl(wsHost)
      activeWebsockets.set(wsHost, newChannel)
      return newChannel
    } else {
      return channel
    }
  }

  return (opts: TransportOptions) => {
    let host = opts.url.replace(`${opts.methodDefinition.service.serviceName}/${opts.methodDefinition.methodName}`, '')
    let wsHost = constructWebSocketAddress(host)
    
    return getChannel(wsHost).websocketChannelRequest(opts);
  }
}

interface GrpcStream extends Transport {
  readonly streamId: number
  flush(): void
}

interface WebsocketChannel {
  websocketChannelRequest(options: TransportOptions): GrpcStream
  close(): void
}

class WebsocketChannelImpl implements WebsocketChannel {
  readonly wsUrl: string;
  readonly activeStreams = new Map<number, TransportOptions>();
  ws: WebSocket;
  streamId = 0
  closed = false

  constructor(ws: string) {
    this.wsUrl = ws;
  }

  recover(event: Event) {
    if(!closed){
      this.activeStreams.forEach((opts, streamId, _map) => {
        opts.debug && debug("channel error", streamId, event);
        opts.onEnd(new Error(event.toString()))
      })
      this.activeStreams.clear()
      this.ws = new WebSocket(this.wsUrl, ["grpc-websocket-channel"]);
    } 
  }

  close() {
    closed = true
    this.ws?.close()
  }

  onMessage(event: MessageEvent) {
    const frame = GrpcFrame.deserializeBinary(new Uint8Array(event.data))
    const streamId = frame.getStreamid()
    console.log("active streams accesed for ", streamId)
    const stream = this.activeStreams.get(streamId)
    if (stream != null) {
      switch (frame.getPayloadCase()) {
        case GrpcFrame.PayloadCase.HEADER:
          stream.debug && debug(`received header for ${streamId}`)
          const header = frame.getHeader()
          if (header != null) {
            const headerMap = header.getHeadersMap()
            const metaData = new Metadata()
            headerMap.forEach((entry, key) => metaData.append(key, entry.getValueList()))
            stream.onHeaders(metaData, header.getStatus())
          }
          break
        case GrpcFrame.PayloadCase.BODY:
          stream.debug && debug(`received body for ${streamId}`)
          const body = frame.getBody()
          if (body != null) {
            stream.onChunk(body.getData_asU8())
          }
          break
        case GrpcFrame.PayloadCase.COMPLETE: 
          stream.debug && debug(`completing ${streamId}`)
          stream.onEnd()
          break
        case GrpcFrame.PayloadCase.FAILURE: 

          const failure = frame.getFailure()
          if (failure != null) {
            const message = failure.getErrormessage()
            stream.debug && debug(`failing ${streamId} ${message}`)
            stream.onEnd(new Error(message))
          } else {
            stream.onEnd(new Error("unknown error"))
          }
          break
        case GrpcFrame.PayloadCase.CANCEL: 
          stream.onEnd(new Error("stream was canceled"))
          break
        default: break
      }
    } else {
      //todo better logging? 
      console.warn("stream does not exist", streamId)
    }
  }

  private getWebsocket(): WebSocket {
    if (this.ws == null) {
      this.ws = new WebSocket(this.wsUrl, ["grpc-websocket-channel"])
      this.ws.binaryType = "arraybuffer"
      this.ws.onclose = (event) => this.recover(event)
      this.ws.onerror = (event) => this.recover(event)
      this.ws.onmessage = (event) => this.onMessage(event)
    }
    return this.ws
  }

  websocketChannelRequest(opts: TransportOptions): GrpcStream {
    let currentStreamId = this.streamId++
    const sendQueue: Array<GrpcFrame> = []
    const self = this
    function sendToWebsocket(toSend: GrpcFrame) {
      if (self.activeStreams.get(toSend.getStreamid()) != null) {
        const ws = self.getWebsocket()
        if (ws.readyState === ws.CONNECTING) {
          opts.debug && debug(`stream.webscocket queued ${currentStreamId}`)
          sendQueue.push(toSend)
        } else {
          while (sendQueue.length > 0) {
            const msg = sendQueue.pop()
            if(msg != null){
              ws.send(msg.serializeBinary())
            }
          }
          ws.send(toSend.serializeBinary())
        }
      } else {
        debug(`stream does not exist ${toSend.getStreamid()}`)
      }
    }

    function newFrame(): GrpcFrame {
      const frame = new GrpcFrame()
      frame.setStreamid(currentStreamId)
      return frame
    }

    //question: can this structure be reused or is it one time use?
    return {
      streamId: currentStreamId,
      sendMessage: (msgBytes: Uint8Array) => {
        opts.debug && debug(`stream.sendMessage ${currentStreamId}`)
        const body = new Body()
        body.setData(msgBytes)

        const frame = newFrame()
        frame.setBody(body)

        sendToWebsocket(frame)
      },
      finishSend: () => {
        opts.debug && debug(`stream.finished ${currentStreamId}`)
        const frame = newFrame()
        frame.setComplete(new Complete())
        sendToWebsocket(frame)
      },
      start: (metadata: Metadata) => {
        opts.debug && debug(`stream.start ${currentStreamId}`)
        self.activeStreams.set(currentStreamId, opts)
        const header = new Header()
        header.setOperation(`${opts.methodDefinition.service.serviceName}/${opts.methodDefinition.methodName}`)
        //todo add all meta data.
        const headerMap = header.getHeadersMap()
        metadata.forEach((key, values) => {
          const headerValue = new HeaderValue()
          headerValue.setValueList(values)
          headerMap.set(key, headerValue)
        })

        const frame = newFrame()
        frame.setHeader(header)
        sendToWebsocket(frame)
      },
      cancel: () => {
        opts.debug && debug(`stream.abort ${currentStreamId}`)
        const frame = newFrame()
        frame.setCancel(new Cancel())
        sendToWebsocket(frame)
      },
      flush: () => {
        opts.debug && debug(`stream.flushed ${currentStreamId}`)
        const ws = self.getWebsocket()
        if (ws.readyState === ws.OPEN) {
          while (sendQueue.length > 0) {
            const msg = sendQueue.pop()
            if(msg != null){
              ws.send(msg.serializeBinary())
            }
          }
        }
      }
    }
  }
}

function constructWebSocketAddress(url: string) {
  if (url.substr(0, 8) === "https://") {
    return `wss://${url.substr(8)}`
  } else if (url.substr(0, 7) === "http://") {
    return `ws://${url.substr(7)}`
  }
  throw new Error("Websocket transport constructed with non-https:// or http:// host.");
}
