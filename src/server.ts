import express from "express";

const app = express();

app.get("/projeto-docker", (req, res) => {
    res.json({ message: "Testando aplicação Docker!" });
});

app.listen(3000, () => {
    console.log("Servidor rodando na porta 3000");
});