import {assert} from "chai";
import {decodeASCII} from "../../../ts/src/ChunkParser";

describe("ChunkParser", () => {
  describe("decodeASCII", () => {
    function asciiToBinary(src: string): Uint8Array {
      const ret = new Uint8Array(src.length);
      for (let i = 0; i !== src.length; ++i) {
        ret[i] = src.charCodeAt(i);
      }
      return ret;
    }

    function testDecode(testCase: string) {
      assert.equal(testCase, decodeASCII(asciiToBinary(testCase)));
    }

    it("should allow valid HTTP headers around", () => {
      testDecode("User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:57.0) Gecko/20100101 Firefox/57.0\r\n");
    });

    it("should allow quoted headers", () => {
      testDecode(`alt-svc: hq=":443"; ma=2592000; quic=51303431; quic=51303339; quic=51303338; quic=51303337; quic=51303335,quic=":443"; ma=2592000; v="41,39,38,37,35"\r\n`);
    });

    it("should reject non-encoded Unicode characters", () => {
      assert.throw(() => decodeASCII(Uint8Array.from([0xe3, 0x81, 0x82]))); // 'あ'
    })
  })
});
