cmake_minimum_required (VERSION 3.3)
project(Example)

list(APPEND CMAKE_MODULE_PATH ${CMAKE_SOURCE_DIR}/../cmake)

find_package(Grpc REQUIRED)

set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++11")

set(PROTO_PATH "${CMAKE_SOURCE_DIR}/../../proto")
set(BOOK_SERVICE_PROTO "${PROTO_PATH}/examplecom/library/book_service.proto")

grpc_generate_cpp(GRPC_SRCS GRPC_HDRS ${BOOK_SERVICE_PROTO})

add_library(book_service 
    ${GRPC_SRCS} 
    ${GRPC_HDRS}
)
target_include_directories(book_service
    PUBLIC
    ${CMAKE_CURRENT_BINARY_DIR}
)
target_link_libraries(book_service
    PUBLIC
    gRPC::grpc
)

add_executable(exampleserver 
    main.cpp
)
target_include_directories(exampleserver
    PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
)
target_link_libraries(exampleserver
    PUBLIC
    book_service
    gRPC::grpc
    gRPC::grpc_unsecure
    protobuf::libprotobuf
)
