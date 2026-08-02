/**
 * Validators Utility
 * Custom validation functions for user input
 */

const validator = require("validator");

// Checks if password meets strength requirements:
// Min 8 chars, 1 lowercase, 1 uppercase, 1 number, 1 symbol
const isStrong = (password) => {
    return validator.isStrongPassword(password, {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1
    });
};

module.exports = { isStrong };