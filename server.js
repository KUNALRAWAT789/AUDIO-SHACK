import express from "express";
import cors from "cors";
import router from "./api/router.js";

const app = express();
app.use(cors());

app.use(express.json({ limit: '2mb' }));

app.use((req, res, next) => {
    console.log(`${req.method} request to: ${req.url}`);
    next();
});

app.use('/api', router);

app.listen(8000, () => {
    console.log("Server is listening!!");
});