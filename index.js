import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import joi from 'joi';
import dayjs from 'dayjs';
import chalk from 'chalk';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URL);
let db;

mongoClient.connect(() => {
    db = mongoClient.db('UOL');
});

const participantSchema = joi.object({
    name: joi.string().required(),
});

app.post('/participants', async (req, res) => {
    const newParticipant = req.body;
    const time = dayjs().format('HH:mm:ss');
    const validation = participantSchema.validate(newParticipant, { abortEarly: false });

    if (validation.error) {
        res.status(422).send(validation.error.details);
        return;
    }

    const checkParticipant = await db.collection('participants').findOne({ name: newParticipant.name });

    if (checkParticipant) {
        res.sendStatus(409);
        return;
    }

    try {
        await db.collection('participants').insertOne({...newParticipant, lastStatus: Date.now()})
        res.sendStatus(201);
    } catch {
        res.sendStatus(500);
    }
});

app.listen(5000, () => console.log(chalk.bold.magenta("Loading")));