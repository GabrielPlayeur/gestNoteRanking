const path = require('path');

/**
 * It's a function that send the privacy policy
 * @param req - The request object.
 * @param res - The response object.
 */
const getPrivacyPolicy = (req, res) => {
    res.sendFile(path.join(__dirname,"../views/privacyPolicy.view.html"));
};

module.exports = {
    getPrivacyPolicy,
};