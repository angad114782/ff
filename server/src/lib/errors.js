export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export const badRequest = (m) => new HttpError(400, m)
export const unauthorized = (m = 'Authentication required.') => new HttpError(401, m)
export const forbidden = (m = 'You do not have access to this.') => new HttpError(403, m)
export const notFound = (m = 'Not found.') => new HttpError(404, m)
