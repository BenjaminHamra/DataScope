import { pool } from "../db.js";
import bcrypt from "bcrypt";
import { hashRounds, tokenCompanyPassword, tokenWholePassword } from "../config.js"
import jwt from "jsonwebtoken";
import { setPrompt, getWords, tokenize, calcularComplejidad, clasificate, initClasificador } from "../utils/analizer.js"

export const initialPage = async (req, res) => {
    console.log("Contenido recibido:", req.body.content);
    setPrompt(req.body.content)
    getWords()
    tokenize()
    const complejidad = calcularComplejidad()
    await initClasificador();
    const clasificador = await clasificate();

    //clasificate()
    res.send("funciono");
};

export const insertCompany = async (req, res) => {
    console.log(req.body)
    const { name, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, hashRounds);

    const { rows } = await pool.query('INSERT INTO public.company (name, password) VALUES ($1, $2) RETURNING *', [name, hashedPassword])
    res.json(rows[0])
}


export const loginCompany = async (req, res) => {
    const { companyName, companyPassword } = req.body
    try {
        const companyQueryResult = await pool.query('SELECT * FROM public.company WHERE name=$1', [companyName]);
        if (companyQueryResult.rowCount === 0) return res.status(401).json({ error: "company doesnt exist" })

        const company = companyQueryResult.rows[0]

        const matchCompany = await bcrypt.compare(companyPassword, company.password);

        if (!matchCompany) return res.status(401).json({ error: "wrong password" })

        const token = jwt.sign(
            { companyId: company.id, companyName: company.name },
            tokenCompanyPassword,
            { expiresIn: "1h" }
        );

        res.json({ token })

    } catch (error) {
        res.status(500).json({ error: error.message || "Internal server error" })
    }
}

export const loginAreaByCompany = async (req, res) => {
    const user = req.user
    const { areaName, areaPassword } = req.body

    try {

        const areaQueryResult = await pool.query('SELECT * FROM public."operationalAreas" WHERE name=$1 AND "companyId"=$2', [areaName, user.companyId]);
        if (areaQueryResult.rowCount === 0) return res.status(401).json({ error: "area doesnt exist" })

        const area = areaQueryResult.rows[0]

        const matchArea = await bcrypt.compare(areaPassword, area.password);

        if (!matchArea) return res.status(401).json({ error: "wrong password" })

        const token = jwt.sign(
            { companyId: user.companyId, companyName: user.companyName, areaId: area.id, areaName: area.name },
            tokenWholePassword,
            { expiresIn: "1h" }
        );

        res.json({ token })

    } catch (error) {
        res.send("encountered " + error)
    }
}

export const getCompanyByToken = async (req, res) => {
    const user = req.user
    const company = await pool.query('SELECT * FROM public.company WHERE id=$1', [user.companyId]);
    res.json(company.rows[0]);
}

export const getAllByToken = async (req, res) => {
    const user = req.user
    const company = await pool.query('SELECT * FROM public.company WHERE id=$1', [user.companyId]);
    const area = await pool.query('SELECT * FROM public."operationalAreas" WHERE id=$1', [user.areaId]);
    res.json({
        company: company.rows[0],
        area: area.rows[0]
    });
}