const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const cors = require('cors');
const ObjectID = require('mongodb').ObjectId;
var admin = require("firebase-admin");

const app = express();
const port = process.env.PORT || 5000;

// firebase admin initialization 

var serviceAccount = require("./tourdeworld-f9a0e-firebase-adminsdk-msn1h-dd68206f1b.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bcmlz.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const idToken = req.headers.authorization.split('Bearer ')[1];
        try {
            const decodedUser = await admin.auth().verifyIdToken(idToken);
            req.decodedUserEmail = decodedUser.email;
        }
        catch {

        }
    }
    next();
}

async function run() {
    try {
        await client.connect();
        const database = client.db('tourdeworld2021');
        const productCollection = database.collection('services');
        const orderCollection = database.collection('booked_service');

        //GET Products API
        app.get('/services', async (req, res) => {
            const cursor = productCollection.find({});
            const products = await cursor.toArray();
                
            res.send({              
                products
            });
        });

        // Use POST to get data by keys
        app.post('/services/bykeys', async (req, res) => {
            const keys = req.body;
            const query = { key: { $in: keys } }
            const products = await productCollection.find(query).toArray();
            res.json(products);
        });

        // Add Orders API
        app.get('/booked_service', verifyToken, async (req, res) => {
            const email = req.query.email;
            if (req.decodedUserEmail === email) {
                const query = { email: email };
                const cursor = orderCollection.find(query);
                const orders = await cursor.toArray();
                res.json(orders);
            }
            else {
                res.status(401).json({ message: 'User not authorized' })
            }

        });

        app.post('/booked_service', async (req, res) => {
            const order = req.body;
            order.createdAt = new Date();
            const result = await orderCollection.insertOne(order);
            res.json(result);
        })

        // Delete API 
        app.delete('/booked_service/:key',async(req,res)=>{
            const id = req.params.key;
            const query = {_id: ObjectID(id)};
            const result = await orderCollection.deleteOne(query);
            console.log(result, 'delete')

            res.json(result);
        })
    }
    finally {
        // await client.close();
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('TOUR de WORLD server is running');
});

app.listen(port, () => {
    console.log('Server running at port', port);
})