//LOGIN ERRORS
export const errorLoginSystemNotSupported={status:"error",reason:"LOGIN_SYSTEM_NOT_SUPPORTED"};
export const errorWrongLoginCredentials={status:"error",reason:"WRONG_LOGIN_CREDENTIALS"};
export const errorUnexpectedLoginError={status:"error",reason:"UNEXPECTED_LOGIN_ERROR"};
export const errorUnexpectedValidationError={status:"error",reason:"UNEXPECTED_VALIDATION_ERROR"};

//COMMON ERRORS
export const errorInvalidJson={status:"error",reason:"INVALID_JSON"};
export const errorInvalidToken={status:"error",reason:"INVALID_TOKEN"};
export const errorNoData={status:"error",reason:"NO_DATA"};
export const errorInvalidUserProfile={status:"error",reason:"INVALID_USER_PROFILE"};

export function wrapError(msg:string){ return {status:"error",reason:msg};}
export function wrapValidateSuccess(obj:Object){ return Object.assign({status:"valid"},obj);}
export function wrapValidateFail(obj:Object){ return Object.assign({status:"not valid"},obj);}
