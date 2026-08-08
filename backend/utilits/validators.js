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

// Checks if a value is a valid http(s) URL.
// require_tld is disabled so localhost and bare IP addresses remain valid.
const isHttpUrl = (value) => {
    return validator.isURL(value, {
        require_protocol: true,
        protocols: ["http", "https"],
        require_tld: false
    });
};

module.exports = { isStrong, isHttpUrl };