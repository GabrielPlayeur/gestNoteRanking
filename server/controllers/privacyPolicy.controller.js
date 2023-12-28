const path = require('path');

const getPrivacyPolicy = (req, res) => {
    res.sendFile(path.join(__dirname,"../views/privacyPolicy.view.html"));
};

module.exports = {
    getPrivacyPolicy,
};