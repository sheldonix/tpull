class ReportedError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ReportedError';
    this.reported = true;
    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

function isReportedError(err) {
  return Boolean(err && err.reported);
}

export {
  ReportedError,
  isReportedError,
};
