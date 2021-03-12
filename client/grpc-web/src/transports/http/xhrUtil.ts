let xhr: XMLHttpRequest;

function getXHR () {
  if (xhr !== undefined) return xhr;

  if (XMLHttpRequest) {
    xhr = new XMLHttpRequest();
    try {
      xhr.open("GET", "https://localhost")
    } catch (e) {}
  }
  return xhr
}

export function xhrSupportsResponseType(type: string) {
  const xhr = getXHR();
  if (!xhr) {
    return false;
  }
  try {
    (xhr as any).responseType = type;
    return xhr.responseType === type;
  } catch (e) {}
  return false
}

export function detectMozXHRSupport(): boolean {
  return typeof XMLHttpRequest !== "undefined" && xhrSupportsResponseType("moz-chunked-arraybuffer")
}

export function detectXHROverrideMimeTypeSupport(): boolean {
  console.trace();
  console.log("XMLHttpRequest", typeof XMLHttpRequest !== "undefined");
  console.log("XMLHttpRequest.prototype.hasOwnProperty('overrideMimeType')", XMLHttpRequest.prototype.hasOwnProperty("overrideMimeType"));
  return typeof XMLHttpRequest !== "undefined" && XMLHttpRequest.prototype.hasOwnProperty("overrideMimeType")
}