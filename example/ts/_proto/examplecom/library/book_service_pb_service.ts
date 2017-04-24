// package: examplecom.library
// file: examplecom/library/book_service.proto

import * as examplecom_library_book_service_pb from "../../examplecom/library/book_service_pb";
export class BookService {
  static serviceName = "examplecom.library.BookService";
}
export namespace BookService {
  export class GetBook {
    static methodName = "GetBook";
    static service = BookService;
    static requestStream = false;
    static responseStream = false;
    static requestType = examplecom_library_book_service_pb.GetBookRequest;
    static responseType = examplecom_library_book_service_pb.Book;
  }
  export class QueryBooks {
    static methodName = "QueryBooks";
    static service = BookService;
    static requestStream = false;
    static responseStream = true;
    static requestType = examplecom_library_book_service_pb.QueryBooksRequest;
    static responseType = examplecom_library_book_service_pb.Book;
  }
}
