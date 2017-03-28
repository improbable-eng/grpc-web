import {grpc, BrowserHeaders} from "grpc-web-client";

import {
  BookService,
} from "./services";
import {QueryBooksRequest, Book, GetBookRequest} from "../_proto/examplecom/library/book_service_pb";

declare const USE_TLS: boolean;
const host = USE_TLS ? "https://localhost:9091" : "http://localhost:9090";

const getBookRequest = new GetBookRequest();
getBookRequest.setIsbn(60929871);
grpc.invoke(BookService.GetBook, {
  request: getBookRequest,
  host: host,
  onHeaders: function(headers: BrowserHeaders) {
    console.log("onHeaders", headers);
  },
  onMessage: function(message: Book) {
    console.log("onMessage", message.toObject());
  },
  onError: function(err: Error) {
    console.error(err);
  },
  onComplete: function(code: grpc.Code, msg: string | undefined, trailers: BrowserHeaders) {
    console.log("onComplete", code, msg, trailers);

    const queryBooksRequest = new QueryBooksRequest();
    queryBooksRequest.setAuthorPrefix("Geor");
    grpc.invoke(BookService.QueryBooks, {
      request: queryBooksRequest,
      host: host,
      onHeaders: function(headers: BrowserHeaders) {
        console.log("onHeaders", headers);
      },
      onMessage: function(message: Book) {
        console.log("onMessage", message.toObject());
      },
      onError: function(err: Error) {
        console.error(err);
      },
      onComplete: function(code: grpc.Code, msg: string | undefined, trailers: BrowserHeaders) {
        console.log("onComplete", code, msg, trailers);
      }
    });
  }
});
