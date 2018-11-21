import {grpc} from "grpc-web-client";
import {BookService} from "../_proto/examplecom/library/book_service_pb_service";
import {QueryBooksRequest, Book, GetBookRequest} from "../_proto/examplecom/library/book_service_pb";
import {ProtobufMessage} from "grpc-web-client/src/message";
import {Metadata} from "grpc-web-client/src/metadata";

declare const USE_TLS: boolean;
const host = USE_TLS ? "https://localhost:9091" : "http://localhost:9090";

function getBook() {
  const getBookRequest = new GetBookRequest();
  getBookRequest.setIsbn(60929871);
  grpc.unary(BookService.GetBook, {
    request: getBookRequest,
    host: host,
    // Middleware is optional. It allows you to take side effects when various request callbacks are triggered.
    middleware: (descriptor, props) => {
      console.log("middleware: request created", descriptor, props);

      return {
        onStart: metadata => console.log("middleware: request started", metadata),
        onSend: (message: ProtobufMessage) => console.log("middleware: onSend", message.toObject()),
        onFinishSend: () => console.log("middleware: onFinishSend"),
        onClose: () => console.log("middleware: onClose"),
        onHeaders: (headers: Metadata) => console.log("middleware: onHeaders", headers),
        onMessage: (message: ProtobufMessage) => console.log("middleware: onMessage", message.toObject()),
        onEnd: (status, statusMessage, trailers) => console.log("middleware: onEnd", status, statusMessage, trailers)
        }
    },
    onEnd: res => {
      const { status, statusMessage, headers, message, trailers } = res;
      console.log("getBook.onEnd.status", status, statusMessage);
      console.log("getBook.onEnd.headers", headers);
      if (status === grpc.Code.OK && message) {
        console.log("getBook.onEnd.message", message.toObject());
      }
      console.log("getBook.onEnd.trailers", trailers);
      queryBooks();
    }
  });
}

getBook();

function queryBooks() {
  const queryBooksRequest = new QueryBooksRequest();
  queryBooksRequest.setAuthorPrefix("Geor");
  const client = grpc.client(BookService.QueryBooks, {
    host: host,
  });
  client.onHeaders((headers: grpc.Metadata) => {
    console.log("queryBooks.onHeaders", headers);
  });
  client.onMessage((message: Book) => {
    console.log("queryBooks.onMessage", message.toObject());
  });
  client.onEnd((code: grpc.Code, msg: string, trailers: grpc.Metadata) => {
    console.log("queryBooks.onEnd", code, msg, trailers);
  });
  client.start();
  client.send(queryBooksRequest);
}
