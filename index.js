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

app.post('/participants', async (req, res) => {
    const newParticipant = req.body;
    const time = dayjs().format('HH:mm:ss');
    const from = req.body.name;

    const participantSchema = joi.object({
        name: joi.string().required(),
    });

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
        await db.collection('messages').insertOne({ from, to: 'Todos', text: 'entra na sala...', type: 'status', time });
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
    const time = dayjs().format('HH:mm:ss');
    const users = await db.collection('participants').find({}).toArray();
    const loggedUsers = users.map(user => user.name);

    const messagesSchema = joi.object({
        from: joi.string().valid(...loggedUsers).required(),
        to: joi.string().required(),
        text: joi.string().required(),
        type: joi.string().valid('message', 'private_message').required(),
    });

    const newMessage = {
        from: user,
        ...req.body,
    };

    const validation = messagesSchema.validate(newMessage, { abortEarly: false });

    if (validation.error) {
        res.status(422).send(validation.error.details);
        return;
    }

    try {
        await db.collection('messages').insertOne({ ...newMessage, time });
        res.sendStatus(201);
    } catch {
        res.sendStatus(500);
    }
});

app.get('/messages', async (req, res) => {
    const limit = parseInt(req.query.limit);
    const { user } = req.headers;

    try {
        const messages = await db.collection('messages').find({ $or: [{ from: user }, { to: user }, { to: 'Todos' }] }).toArray();

        if (limit) {
            res.send(messages.slice(- limit));
            return;
        } else {
            res.send(messages);
        }
    } catch {
        res.sendStatus(500);
    }
});

app.listen(5000, () => console.log(chalk.bold.magenta("Loading")));