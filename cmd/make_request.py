
import logging
import requests
import struct 
import sys

def main():
  payload = '{"value": "blah"}'

  full_payload = struct.pack('x') + struct.pack('>I', len(payload)) + payload
  
  resp = requests.post("http://localhost:9090/mwitkow.testproto.TestService/PingList", headers={"Content-Type": "application/grpc", "Grpc-Browser-Compat": "true"}, data=full_payload)

  logging.info("Got response headers: {}".format(resp.headers))
  for out in resp.iter_lines(4 * 1024 * 1024):
    logging.info(repr(out))




if __name__ == '__main__':
  logging.basicConfig(stream=sys.stdout,
                      level=logging.INFO,
                      format='%(asctime)s %(process)6s %(levelname)6s | %(message)s')
  main()

