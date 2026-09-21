import validatorLib from "validator";

export function isValidEmail(email) {
  return typeof email === "string" && validatorLib.isEmail(email);
}

export function isValidPassword(password) {
  return typeof password === "string" && password.length >= 8;
}