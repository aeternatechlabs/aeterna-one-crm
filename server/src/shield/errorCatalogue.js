/**
 * Aeterna One — API Shield Error Message Catalogue
 *
 * Centralized, English-only error response engine with three distinct personality styles:
 * - FUNNY: Rate limits, 404 Not Found, Conflicts/Duplicates, Resource Locked
 * - FRIENDLY: Validation errors, Invalid JSON, Payload/File too large, Service Unavailable
 * - PROFESSIONAL: Unauthorized, Forbidden, Session Expired, Account Disabled, Internal Server Error
 *
 * All messages strictly adhere to English only.
 */

const PERSONALITY_STYLES = {
  FUNNY: 'FUNNY',
  FRIENDLY: 'FRIENDLY',
  PROFESSIONAL: 'PROFESSIONAL',
};

const ERROR_CATEGORIES = {
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_JSON: 'INVALID_JSON',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  NOT_FOUND: 'NOT_FOUND',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  CONFLICT: 'CONFLICT',
  RESOURCE_LOCKED: 'RESOURCE_LOCKED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  RATE_LIMIT_LOGIN: 'RATE_LIMIT_LOGIN',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  MAINTENANCE_MODE: 'MAINTENANCE_MODE',
};

const ERROR_CATALOGUE = {
  [ERROR_CATEGORIES.RATE_LIMIT_EXCEEDED]: {
    statusCode: 429,
    personality: PERSONALITY_STYLES.FUNNY,
    messages: [
      'Whoa! Give the server a little breathing room! Too many requests detected.',
      "Slow down! This isn't a request marathon. Too many requests sent.",
      'The server needs a tiny coffee break! Too many requests received.',
      'One request at a time, superstar! Too many requests in this window.',
      'Too many requests from this IP address. Please pause and take a breather.',
      'Pump the brakes! Too many requests reaching the gateway right now.',
      'Speed limit enforced! Too many requests submitted in a short burst.',
    ],
  },

  [ERROR_CATEGORIES.RATE_LIMIT_LOGIN]: {
    statusCode: 429,
    personality: PERSONALITY_STYLES.FUNNY,
    messages: [
      'Too many login attempts! Even password-guessing bots need a nap. Too many requests.',
      'Hold on, keymaster! Too many requests on the login portal. Try again in a bit.',
      'Slow your roll! Too many requests on authentication. Take a short pause.',
      'Too many requests to sign in. Security shields have activated a brief cooldown.',
      'Whoa there, eager fingers! Too many requests detected on login. Grab a tea.',
      'Too many requests attempted for this session. Please wait before retrying.',
    ],
  },

  [ERROR_CATEGORIES.NOT_FOUND]: {
    statusCode: 404,
    personality: PERSONALITY_STYLES.FUNNY,
    messages: [
      'Looks like this resource went on vacation! The requested endpoint does not exist.',
      'We searched high and low, but this record or route does not exist.',
      '404! The requested destination does not exist on this server.',
      "Nothing to see here! The item you're looking for does not exist.",
      'Lost in cyberspace: this resource does not exist.',
      'Destination unknown! The specified path does not exist.',
    ],
  },

  [ERROR_CATEGORIES.METHOD_NOT_ALLOWED]: {
    statusCode: 405,
    personality: PERSONALITY_STYLES.FUNNY,
    messages: [
      'Knocking on the right door with the wrong handshake! Method not allowed.',
      "That HTTP verb isn't welcome at this endpoint party. Method not allowed.",
      "You can't do that here! This route doesn't accept that request method.",
      'Wrong tool for the job! The requested HTTP method is not permitted here.',
      'Nice try, but this endpoint speaks a different HTTP verb. Method not allowed.',
      'Access denied by protocol etiquette! That method is not allowed on this path.',
    ],
  },

  [ERROR_CATEGORIES.CONFLICT]: {
    statusCode: 409,
    personality: PERSONALITY_STYLES.FUNNY,
    messages: [
      'Looks like this record already exists in the system!',
      'Duplicate detected! A conflicting resource already exists.',
      'Conflict encountered! An entry with this identity already exists.',
      'Cannot overwrite history! A record with matching data already exists.',
      'Double trouble! A matching record already exists in the database.',
      'Deja vu! An identical entity already exists here.',
    ],
  },

  [ERROR_CATEGORIES.RESOURCE_LOCKED]: {
    statusCode: 423,
    personality: PERSONALITY_STYLES.FUNNY,
    messages: [
      'Hold your horses! This record is currently being edited by another team member.',
      'Resource under lock and key! Someone else is currently modifying this record.',
      'Patience, friend! This document is temporarily locked for active updates.',
      'Currently occupied! The resource is locked to prevent concurrency collisions.',
      'Hands off for a moment! Another process is working on this locked item.',
      'Locked down tight! Please wait for the current editor to finish.',
    ],
  },

  [ERROR_CATEGORIES.VALIDATION_ERROR]: {
    statusCode: 400,
    personality: PERSONALITY_STYLES.FRIENDLY,
    messages: [
      'Oops! Your input needs a little correction before we can proceed.',
      'Please double-check your submitted data; a few fields need your attention.',
      "Something doesn't look quite right with the submitted details.",
      'Almost there! Please correct the highlighted fields and try again.',
      "We noticed a few formatting errors in your submission. Let's fix those up!",
      'Input review required: please verify the submitted form values.',
    ],
  },

  [ERROR_CATEGORIES.INVALID_JSON]: {
    statusCode: 400,
    personality: PERSONALITY_STYLES.FRIENDLY,
    messages: [
      'Malformed JSON detected! The request payload could not be parsed.',
      "Looks like there's a missing comma or quote in your JSON payload.",
      'Unparseable request body. Please verify that your JSON is properly formatted.',
      'Syntax alert! The submitted JSON body syntax is broken or corrupted.',
      'Unable to decode your JSON package. Please inspect your request formatting.',
      'JSON parsing error: please check for trailing commas or unescaped characters.',
    ],
  },

  [ERROR_CATEGORIES.PAYLOAD_TOO_LARGE]: {
    statusCode: 413,
    personality: PERSONALITY_STYLES.FRIENDLY,
    messages: [
      "That's one seriously oversized package! Please reduce payload size.",
      'Easy there! The request payload exceeds our maximum allowed limit.',
      'Payload too hefty! Please trim the request body before trying again.',
      'Whoa, that request is too heavy! Please reduce the data size.',
      'Package too big for our mail chute! Please keep your payload under the limit.',
      'Payload limit exceeded. Consider breaking your request into smaller chunks.',
    ],
  },

  [ERROR_CATEGORIES.FILE_TOO_LARGE]: {
    statusCode: 413,
    personality: PERSONALITY_STYLES.FRIENDLY,
    messages: [
      'That file is a bit too bulky! Please upload a file within the allowed size limit.',
      'File size limit exceeded. Please compress or optimize your document first.',
      'Your file exceeds our upload capacity. Please select a smaller file.',
      'Heavyweight document detected! Please stay within the allowed upload file size.',
      'Upload failed: file size is beyond the permitted threshold for this action.',
      'Please trim that file down! Maximum upload size exceeded.',
    ],
  },

  [ERROR_CATEGORIES.UNSUPPORTED_FILE_TYPE]: {
    statusCode: 415,
    personality: PERSONALITY_STYLES.FRIENDLY,
    messages: [
      'Unsupported file format! Please upload an approved document or image type.',
      "We can't process that file type. Please check the list of supported extensions.",
      'Unknown file format! Please provide a supported file format.',
      'Format mismatch! That file extension is not permitted for upload.',
      'File type not recognized. Please submit your document in an approved format.',
      'Incompatible document format. Please convert your file to an accepted extension.',
    ],
  },

  [ERROR_CATEGORIES.SERVICE_UNAVAILABLE]: {
    statusCode: 503,
    personality: PERSONALITY_STYLES.FRIENDLY,
    messages: [
      "We're temporarily unavailable. Hang tight while our systems catch their breath!",
      'Our system needs a moment! Service is temporarily unavailable.',
      'Service temporarily unavailable. Our engineers are already looking into it.',
      'Brief service interruption in progress. Please check back in a few moments.',
      "The server is taking a quick maintenance breather. We'll be right back!",
      'Temporary service pause. Everything will be back up shortly.',
    ],
  },

  [ERROR_CATEGORIES.MAINTENANCE_MODE]: {
    statusCode: 503,
    personality: PERSONALITY_STYLES.FRIENDLY,
    messages: [
      "Scheduled maintenance in progress! We're tuning up the engines.",
      "Under scheduled maintenance. We're polishing things to make your CRM better!",
      'System upgrade underway! Normal service will resume shortly.',
      'Routine maintenance is currently active. Thanks for your patience!',
      'Our digital workshop is busy with enhancements. Back shortly!',
      'Scheduled system tune-up in progress. Please check back soon.',
    ],
  },

  [ERROR_CATEGORIES.UNAUTHORIZED]: {
    statusCode: 401,
    personality: PERSONALITY_STYLES.PROFESSIONAL,
    messages: [
      'Authentication required. Please sign in to your account.',
      'Your session could not be authenticated. Please log in again.',
      'Valid authentication credentials are required to access this resource.',
      'Authentication missing or invalid. Please provide a valid bearer token.',
      'Access denied. Please authenticate with your authorized credentials.',
      'No active authentication detected. Please sign in to continue.',
    ],
  },

  [ERROR_CATEGORIES.SESSION_EXPIRED]: {
    statusCode: 401,
    personality: PERSONALITY_STYLES.PROFESSIONAL,
    messages: [
      'Your session has expired. Please sign in again to continue.',
      'Session validity ended. Please re-authenticate to refresh your access.',
      'Your login token has expired. Sign in to renew your workspace credentials.',
      'Session timeout reached for security reasons. Please log back in.',
      'Credentials expired. Please authenticate to obtain a fresh access token.',
      'Security session expired. Please re-login to proceed safely.',
    ],
  },

  [ERROR_CATEGORIES.FORBIDDEN]: {
    statusCode: 403,
    personality: PERSONALITY_STYLES.PROFESSIONAL,
    messages: [
      'You do not have permission to access this resource.',
      'Access to this operation is restricted by role or branch policy.',
      'Action not permitted for your current organizational permissions.',
      'Forbidden: your account privileges do not permit this operation.',
      'Unauthorized operation: this capability is reserved for higher privileges.',
      'Access denied by security policy. Insufficient authorization level.',
    ],
  },

  [ERROR_CATEGORIES.ACCOUNT_DISABLED]: {
    statusCode: 403,
    personality: PERSONALITY_STYLES.PROFESSIONAL,
    messages: [
      'Your account has been deactivated. Please contact an administrator.',
      'Access suspended: this account is currently inactive. Contact your supervisor.',
      'This user profile has been disabled by security administration.',
      'Account access restricted. Please reach out to your branch management team.',
      'Deactivated account: contact your system administrator to restore access.',
      'Login prevented: this staff account has been set to inactive status.',
    ],
  },

  [ERROR_CATEGORIES.INTERNAL_SERVER_ERROR]: {
    statusCode: 500,
    personality: PERSONALITY_STYLES.PROFESSIONAL,
    messages: [
      'An unexpected error occurred. Our engineering team has been notified.',
      "Internal server error. We're investigating the issue.",
      'Something went wrong processing your request. Please try again later.',
      'Server encountered an error during execution. Our monitoring systems are on it.',
      'An internal system exception occurred. We apologize for the inconvenience.',
      'Unexpected server failure. Please retry your request in a few moments.',
    ],
  },
};

// Store last selected indices to prevent immediate repetition per category
const lastSelectedIndices = {};

/**
 * Retrieve a message from the catalogue for a given category.
 *
 * @param {string} category - One of ERROR_CATEGORIES
 * @param {Object} [options] - Options for selection
 * @param {number} [options.index] - Explicit index (for testable deterministic outputs)
 * @returns {{ code: string, message: string, personality: string, statusCode: number }}
 */
function getErrorMessage(category, options = {}) {
  const entry = ERROR_CATALOGUE[category] || ERROR_CATALOGUE[ERROR_CATEGORIES.INTERNAL_SERVER_ERROR];
  const { messages, personality, statusCode } = entry;
  const count = messages.length;

  let chosenIndex;
  if (typeof options.index === 'number' && options.index >= 0 && options.index < count) {
    chosenIndex = options.index;
  } else {
    const lastIndex = lastSelectedIndices[category] ?? -1;
    chosenIndex = Math.floor(Math.random() * count);
    if (count > 1 && chosenIndex === lastIndex) {
      chosenIndex = (chosenIndex + 1) % count;
    }
  }

  lastSelectedIndices[category] = chosenIndex;

  return {
    code: category,
    message: messages[chosenIndex],
    personality,
    statusCode,
  };
}

/**
 * Infer default error category from HTTP status code
 */
function getCategoryForStatus(statusCode) {
  switch (statusCode) {
    case 400:
      return ERROR_CATEGORIES.VALIDATION_ERROR;
    case 401:
      return ERROR_CATEGORIES.UNAUTHORIZED;
    case 403:
      return ERROR_CATEGORIES.FORBIDDEN;
    case 404:
      return ERROR_CATEGORIES.NOT_FOUND;
    case 405:
      return ERROR_CATEGORIES.METHOD_NOT_ALLOWED;
    case 409:
      return ERROR_CATEGORIES.CONFLICT;
    case 413:
      return ERROR_CATEGORIES.PAYLOAD_TOO_LARGE;
    case 415:
      return ERROR_CATEGORIES.UNSUPPORTED_FILE_TYPE;
    case 423:
      return ERROR_CATEGORIES.RESOURCE_LOCKED;
    case 429:
      return ERROR_CATEGORIES.RATE_LIMIT_EXCEEDED;
    case 503:
      return ERROR_CATEGORIES.SERVICE_UNAVAILABLE;
    default:
      return ERROR_CATEGORIES.INTERNAL_SERVER_ERROR;
  }
}

module.exports = {
  PERSONALITY_STYLES,
  ERROR_CATEGORIES,
  ERROR_CATALOGUE,
  getErrorMessage,
  getCategoryForStatus,
};
