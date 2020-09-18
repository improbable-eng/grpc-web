import { assert } from "chai";
import { decodeASCII, encodeASCII } from "../../../client/grpc-web/src/ChunkParser";

describe("ChunkParser", () => {
  describe("decodeASCII", () => {
    it("should allow valid HTTP headers around", () => {
      assert.equal(decodeASCII(new Uint8Array([
          85, 115, 101, 114, 45, 65, 103, 101, 110, 116, 58, 32, 77, 111, 122, 105, 108, 108, 97, 47, 53, 46, 48, 32,
          40, 87, 105, 110, 100, 111, 119, 115, 32, 78, 84, 32, 49, 48, 46, 48, 59, 32, 87, 105, 110, 54, 52, 59, 32,
          120, 54, 52, 59, 32, 114, 118, 58, 53, 55, 46, 48, 41, 32, 71, 101, 99, 107, 111, 47, 50, 48, 49, 48, 48, 49,
          48, 49, 32, 70, 105, 114, 101, 102, 111, 120, 47, 53, 55, 46, 48, 13, 10
        ])),
        "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:57.0) Gecko/20100101 Firefox/57.0\r\n");
    });

    it("should allow quoted headers", () => {
      assert.equal(decodeASCII(new Uint8Array([
          97, 108, 116, 45, 115, 118, 99, 58, 32, 104, 113, 61, 34, 58, 52, 52, 51, 34, 59, 32, 109, 97, 61, 50, 53, 57,
          50, 48, 48, 48, 59, 32, 113, 117, 105, 99, 61, 53, 49, 51, 48, 51, 52, 51, 49, 59, 32, 113, 117, 105, 99, 61,
          53, 49, 51, 48, 51, 51, 51, 57, 59, 32, 113, 117, 105, 99, 61, 53, 49, 51, 48, 51, 51, 51, 56, 59, 32, 113,
          117, 105, 99, 61, 53, 49, 51, 48, 51, 51, 51, 55, 59, 32, 113, 117, 105, 99, 61, 53, 49, 51, 48, 51, 51, 51,
          53, 44, 113, 117, 105, 99, 61, 34, 58, 52, 52, 51, 34, 59, 32, 109, 97, 61, 50, 53, 57, 50, 48, 48, 48, 59,
          32, 118, 61, 34, 52, 49, 44, 51, 57, 44, 51, 56, 44, 51, 55, 44, 51, 53, 34, 13, 10
        ])),
        `alt-svc: hq=":443"; ma=2592000; quic=51303431; quic=51303339; quic=51303338; quic=51303337; quic=51303335,quic=":443"; ma=2592000; v="41,39,38,37,35"\r\n`
      );
    });

    it("should reject non-encoded Unicode characters", () => {
      assert.throw(() => decodeASCII(Uint8Array.from([0xe3, 0x81, 0x82]))); // 'あ'
    })
  });

  describe("encodeASCII", () => {
    it("should allow valid HTTP headers around", () => {
      assert.deepEqual(encodeASCII(`User-Agent: Mozilla/5.0\r\n`),
        new Uint8Array([
          85, 115, 101, 114, 45, 65, 103, 101, 110, 116, 58, 32, 77, 111, 122, 105, 108, 108, 97, 47, 53, 46, 48, 13, 10
        ])
      );
    });

    it("should allow quoted headers", () => {
      assert.deepEqual(encodeASCII(`alt-svc: hq=":443";\r\n`),
        new Uint8Array([
          97, 108, 116, 45, 115, 118, 99, 58, 32, 104, 113, 61, 34, 58, 52, 52, 51, 34, 59, 13, 10
        ])
      );
    });

    it("should reject non-encoded Unicode characters", () => {
      assert.throw(() => encodeASCII(`あ`));
    })
  });

  describe("decodeASCII-encodeASCII", () => {
    function testInterop(testCase: string) {
      assert.equal(testCase, decodeASCII(encodeASCII(testCase)));
    }

    it("should allow valid HTTP headers around", () => {
      testInterop(`User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:57.0) Gecko/20100101 Firefox/57.0\r\n`);
    });

    it("should allow quoted headers", () => {
      testInterop(`alt-svc: hq=":443"; ma=2592000; quic=51303431; quic=51303339; quic=51303338; quic=51303337; quic=51303335,quic=":443"; ma=2592000; v="41,39,38,37,35"\r\n`);
    });
  });
});
