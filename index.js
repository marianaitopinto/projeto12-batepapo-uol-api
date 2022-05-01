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
        await db.collection('participants').insertOne({ ...newParticipant, lastStatus: Date.now() })
        res.sendStatus(201);
    } catch {
        res.sendStatus(500);
    }
});

app.get('/participants', async (req, res) => {
    try {
        const participants = await db.collection('participants').find().toArray();
        res.send(participants);
    } catch {
        res.sendStatus(500);
    }
});

app.post('/messages', async (req, res) => {
    const { user } = req.headers;
    const users = await db.collection('participants').find({}).toArray();
    const loggedUsers = users.map(user => user.name);

    const messagesSchema = joi.object({
        from: joi.string().valid(...loggedUsers).required(),
        to: joi.string().required(),
        text: joi.string().required(),
        type: joi.string().valid('message', 'private_message').required(),
    });

    const newMessage = {
        ...req.body,
        time: dayjs().format('HH:mm:ss'),
    };
    
    const validation = messagesSchema.validate(newMessage, { abortEarly: false });

    if (validation.error) {
        res.status(422).send(validation.error.details);
        return;
    }

    try {
        await db.collection('messages').insertOne(...newMessage);
        res.sendStatus(201);
    } catch {
        res.sendStatus(500);
    }
}); 

app.get('/messages', async (req, res) => {
    const limit = parseInt(req.query.limit);
    try {
        const messages = await db.collection('messages').find().toArray();
        res.send(messages);
    } catch {
        res.sendStatus(500);
    }
});

app.listen(5000, () => console.log(chalk.bold.magenta("Loading")));