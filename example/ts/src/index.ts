import {grpc, BrowserHeaders} from "grpc-web-client";
import {BookService} from "../_proto/examplecom/library/book_service_pb_service";
import {QueryBooksRequest, Book, GetBookRequest} from "../_proto/examplecom/library/book_service_pb";

declare const USE_TLS: boolean;
const host = USE_TLS ? "https://localhost:9091" : "http://localhost:9090";

function getBook() {
  const getBookRequest = new GetBookRequest();
  getBookRequest.setIsbn(60929871);
  grpc.invoke(BookService.GetBook, {
    request: getBookRequest,
    host: host,
    onHeaders: (headers: BrowserHeaders) => {
      console.log("getBook.onHeaders", headers);
    },
    onMessage: (message: Book) => {
      console.log("getBook.onMessage", message.toObject());
    },
    onEnd: (code: grpc.Code, msg: string, trailers: BrowserHeaders) => {
      console.log("getBook.onEnd", code, msg, trailers);

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
    onHeaders: (headers: BrowserHeaders) => {
      console.log("queryBooks.onHeaders", headers);
    },
    onMessage: (message: Book) => {
      console.log("queryBooks.onMessage", message.toObject());
    },
    onEnd: (code: grpc.Code, msg: string, trailers: BrowserHeaders) => {
      console.log("queryBooks.onEnd", code, msg, trailers);
    }
  });
}
