export function debug(...args: any[]) {
  if (console.debug) {
    console.debug.apply(null, args);
  } else {
    console.log.apply(null, args);
  }
}

export function debugBuffer(str: string, buffer: Uint8Array) {
  const asArray: number[] = [];
  for(let i = 0; i < buffer.length; i++) {
    asArray.push(buffer[i]);
  }
  debug(str, asArray.join(","))
}