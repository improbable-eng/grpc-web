#include <iostream>
#include <string>
#include <vector>

#include <grpc/grpc.h>
#include <grpc++/server.h>
#include <grpc++/server_builder.h>
#include <grpc++/server_context.h>
#include <grpc++/security/server_credentials.h>

#include "book_service.grpc.pb.h"

using grpc::Server;
using grpc::ServerBuilder;
using grpc::ServerContext;
using grpc::ServerReader;
using grpc::ServerReaderWriter;
using grpc::ServerWriter;
using grpc::Status;
using grpc::StatusCode;
using examplecom::library::BookService;
using examplecom::library::GetBookRequest;
using examplecom::library::Book;
using examplecom::library::QueryBooksRequest;

Book createBook(int64_t isbn, const std::string& title, const std::string& author)
{
    Book book;
    book.set_isbn(isbn);
    book.set_title(title);
    book.set_author(author);
    return book;
}

std::vector<Book> createBooks()
{
    std::vector<Book> books;
    books.push_back(createBook(60929871L, "Brave New World", "Aldous Huxley"));
    books.push_back(createBook(140009728L, "Nineteen Eighty-Four", "George Orwell"));
    books.push_back(createBook(9780140301694L, "Alice's Adventures in Wonderland", "Lewis Carroll"));
    books.push_back(createBook(140008381L, "Animal Farm", "George Orwell"));
    return books;
}

bool startsWith(const std::string& str, const std::string& prefix) {
    if (str.length() >= prefix.length()) 
    {
        return str.compare(0, prefix.length(), prefix) == 0;
    } 
    else 
    {
        return false;
    }
}

class BookServiceImpl final : public BookService::Service
{
public:
    explicit BookServiceImpl(const std::vector<Book>& books)
        : mBooks(books) {}

    virtual Status GetBook(ServerContext* context, 
                           const GetBookRequest* request, 
                           Book* response)
    {
        for (const Book& book : mBooks)
        {
            if (book.isbn() == request->isbn()) {
                response->CopyFrom(book);
                return Status::OK;
            }
        }

        return Status(StatusCode::NOT_FOUND, "Book could not be found");
    }

    virtual Status QueryBooks(ServerContext* context, 
                              const QueryBooksRequest* request,
                              ServerWriter<Book>* writer)
    {
        for (const Book& book : mBooks)
        {
            const std::string& prefix = request->author_prefix();
            if (startsWith(book.author(), prefix)) {
                writer->Write(book);
            }
        }
        return Status::OK;
    }

private:
    const std::vector<Book>& mBooks;
};

void RunServer(const std::vector<Book>& books)
{
    std::string server_address("0.0.0.0:50051");
    BookServiceImpl service(books);

    ServerBuilder builder;
    builder.AddListeningPort(server_address, grpc::InsecureServerCredentials());
    builder.RegisterService(&service);
    std::unique_ptr<Server> server(builder.BuildAndStart());
    std::cout << "Server listening on " << server_address << std::endl;
    server->Wait();
}

int main(int argc, char** argv)
{
    std::vector<Book> books = createBooks();
    RunServer(books);

    return 0;
}
