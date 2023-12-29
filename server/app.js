const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require("helmet");

const ranksRouter = require('./routes/ranks.route');
const privacyPolicyRouter = require('./routes/privacyPolicy.route');

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use(
    helmet.contentSecurityPolicy({
      directives: {
        "script-src": ["'self'", "code.jquery.com", "cdn.jsdelivr.net"],
      },
    }),
);


app.get("/", function (req, res) {
    res.send("Hello World!");
});

app.use('/api', ranksRouter);
app.use('/privacy-policy', privacyPolicyRouter);

module.exports = app;