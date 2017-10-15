import {grpc, Code, Metadata, registerDebugger, ConsoleDebuggerFactory } from "grpc-web-client";
import {BookService} from "../_proto/examplecom/library/book_service_pb_service";
import {QueryBooksRequest, Book, GetBookRequest} from "../_proto/examplecom/library/book_service_pb";
import {ExampleDebuggerFactory} from "./debugger";

declare const USE_TLS: boolean;
const host = USE_TLS ? "https://localhost:9091" : "http://localhost:9090";

registerDebugger(
    ConsoleDebuggerFactory, // comes with grpc-web-client
    ExampleDebuggerFactory, // user defined debugger
);

function getBook() {
  const getBookRequest = new GetBookRequest();
  getBookRequest.setIsbn(60929871);
  grpc.unary(BookService.GetBook, {
    request: getBookRequest,
    host: host,
    onEnd: res => {
      const { status, statusMessage, headers, message, trailers } = res;
      console.log("getBook.onEnd.status", status, statusMessage);
      console.log("getBook.onEnd.headers", headers);
      if (status === Code.OK && message) {
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
  grpc.invoke(BookService.QueryBooks, {
    request: queryBooksRequest,
    host: host,
    onHeaders: (headers: Metadata) => {
      console.log("queryBooks.onHeaders", headers);
    },
    onMessage: (message: Book) => {
      console.log("queryBooks.onMessage", message.toObject());
    },
    onEnd: (code: Code, msg: string, trailers: Metadata) => {
      console.log("queryBooks.onEnd", code, msg, trailers);
    }
  });
}
