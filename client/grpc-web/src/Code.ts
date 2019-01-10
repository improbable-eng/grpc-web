export enum Code {
  OK = 0,
  Canceled = 1,
  Unknown = 2,
  InvalidArgument = 3,
  DeadlineExceeded = 4,
  NotFound = 5,
  AlreadyExists = 6,
  PermissionDenied = 7,
  ResourceExhausted = 8,
  FailedPrecondition = 9,
  Aborted = 10,
  OutOfRange = 11,
  Unimplemented = 12,
  Internal = 13,
  Unavailable = 14,
  DataLoss = 15,
  Unauthenticated = 16,
}

export function httpStatusToCode(httpStatus: number): Code {
  switch (httpStatus) {
    case 0: // Connectivity issues
      return Code.Internal;
    case 200:
      return Code.OK;
    case 400:
      return Code.InvalidArgument;
    case 401:
      return Code.Unauthenticated;
    case 403:
      return Code.PermissionDenied;
    case 404:
      return Code.NotFound;
    case 409:
      return Code.Aborted;
    case 412:
      return Code.FailedPrecondition;
    case 429:
      return Code.ResourceExhausted;
    case 499:
      return Code.Canceled;
    case 500:
      return Code.Unknown;
    case 501:
      return Code.Unimplemented;
    case 503:
      return Code.Unavailable;
    case 504:
      return Code.DeadlineExceeded;
    default:
      return Code.Unknown;
  }
}
