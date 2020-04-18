export default class ConsumeResponseError extends Error {
  constructor(
    message: string,
    public readonly Code: number,
    public readonly RequestId: string | null,
    public readonly Body: object | null
  ) {
    super(message);
  }
}
