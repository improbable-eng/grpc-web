// package: examplecom.library
// file: examplecom/library/book_service.proto

import * as examplecom_library_book_service_pb from "../../examplecom/library/book_service_pb";
export class BookService {
  static serviceName = "examplecom.library.BookService";
}
export namespace BookService {
  export class GetBook {
    static readonly methodName = "GetBook";
    static readonly service = BookService;
    static readonly requestStream = false;
    static readonly responseStream = false;
    static readonly requestType = examplecom_library_book_service_pb.GetBookRequest;
    static readonly responseType = examplecom_library_book_service_pb.Book;
  }
  export class QueryBooks {
    static readonly methodName = "QueryBooks";
    static readonly service = BookService;
    static readonly requestStream = false;
    static readonly responseStream = true;
    static readonly requestType = examplecom_library_book_service_pb.QueryBooksRequest;
    static readonly responseType = examplecom_library_book_service_pb.Book;
  }
}
