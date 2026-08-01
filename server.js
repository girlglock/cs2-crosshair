require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const app = require("./api/index.js");

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`cs2-crosshair running on http://localhost:${port} :3c`);
});
