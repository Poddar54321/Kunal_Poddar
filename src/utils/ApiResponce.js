class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    ((this.statusCode = statusCode),
      (this.data = data),
      (this.message = message),
      (this.success = statusCode < 400)); // error codes above 400 are relevant to error so that will be handled in ApiError
  }
}

export { ApiResponse };
