import {QueryBooksRequest, GetBookRequest, Book} from "../_proto/examplecom/library/book_service_pb";

export class BookService {
  static serviceName: string = "examplecom.library.BookService";
}
export namespace BookService {
  export class GetBook {
    static methodName = "GetBook";
    static service = BookService;
    static requestStream: false;
    static responseStream: false;
    static requestType = GetBookRequest;
    static responseType = Book;
  }
  export class QueryBooks {
    static methodName = "QueryBooks";
    static service = BookService;
    static requestStream: false;
    static responseStream: true;
    static requestType = QueryBooksRequest;
    static responseType = Book;
  }
}
