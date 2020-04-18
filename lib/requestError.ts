export default class RequestError extends Error {
  Code: string;
  RequestId: string;
}
