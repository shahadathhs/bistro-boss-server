const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

const user = process.env.DB_USER
const password = process.env.DB_PASS

const uri = `mongodb+srv://${user}:${password}@cluster0.ahaugjj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    //await client.connect();

    const database = client.db("bistroBossDB");
    const menuCollection = database.collection("menu");
    const reviewsCollection = database.collection("reviews");
    const cartsCollection = database.collection("carts");
    const usersCollection = database.collection('users');

    // users related api
    app.get("/users", async(req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result)
    })

    app.post("/users", async(req, res) => {
      const user = req.body;
      // insert email if user does not exist
      // in three way (1. email unique, 2. upsert, 3.simple checking)
      const query = { email: user.email};
      const existingUser = await usersCollection.findOne(query)
      if (existingUser) {
        return res.send({ message : "user already exist", insertedId: null})
      }
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })

    app.delete("/users/:id", async(req, res) => {
      const id = req.params.id;
      const query = { _id : new ObjectId(id)};
      const result = await usersCollection.deleteOne(query);
      res.send(result)
    })

    app.patch("/users/admin/:id", async(req, res) => {
      const id = req.params.id;
      const query = { _id : new ObjectId(id)};
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result = await usersCollection.updateOne(query, updateDoc);
    })
    
    // menu related api
    app.get("/menu", async(req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result)
    })

    // review related api
    app.get("/reviews", async(req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result)
    })
    
    // cart related api
    app.get("/carts", async(req, res) => {
      const email = req.query.email;
      console.log(email)
      const query = {ownerEmail : email}
      const result = await cartsCollection.find(query).toArray();
      res.send(result)
    })

    app.post("/carts", async(req, res) => {
      const cartItem = req.body;
      const result = await cartsCollection.insertOne(cartItem)
      res.send(result)
    })

    app.delete("/carts/:id", async(req, res) => {
      const id = req.params.id;
      const query = { _id : new ObjectId(id)};
      const result = await cartsCollection.deleteOne(query);
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    //await client.db("admin").command({ ping: 1 });
    // Get the database and collection on which to run the operation
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Bistro Boss Server Running!')
})

app.listen(port, () => {
  console.log(`Bistro Boss listening on port ${port}`)
})