const { Client } = require("@upstash/qstash");
require("dotenv").config({ path: ".env.local" });

const qstash = new Client({ 
    token: process.env.QSTASH_TOKEN || "",
    baseUrl: process.env.QSTASH_URL
});

async function test() {
    try {
        console.log("Testing QStash...");
        console.log("Token length:", process.env.QSTASH_TOKEN?.length);
        const res = await qstash.publishJSON([
            {
                url: `${process.env.PUBLIC_BASE_URL}/api/workers/generate-certificate`,
                body: { test: true },
            }
        ]);
        console.log("Response:", res);
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
