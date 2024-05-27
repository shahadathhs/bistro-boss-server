const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const stripe = require("stripe");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173"
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json());

// Initialize Stripe with the secret key
const stripeInstance = stripe(process.env.STRIPE_SECRET_KEY)

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

// const verifyToken = async(req, res, next) => {
//   // local storage
//   const localToken = req.headers.authorization
//   //console.log("Inside verifyToken", localToken)
//   // token unavailable
//   const splitToken = localToken.split(' ')[1]
//   //console.log("Inside verifyToken", splitToken)
//   if (!splitToken) {
//     return res.status(401).send({message: "Unauthorized"})
//   } 
//   jwt.verify(splitToken, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
//     if(error){
//       return res.status(403).send({message: "Forbidden"})
//     }
//     req.decodedToken = decoded;
//     next();
//   })
  
//   // cookies
//   // const token = req.cookies?.token;
//   // console.log("middleware token", token)
//   // // token unavailable
//   // if (!token) {
//   //   return res.status(401).send({message: "Unauthorized"})
//   // }
//   // // token available
//   // jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
//   //   if(error){
//   //     return res.status(403).send({message: "Forbidden"})
//   //   }
//   //   req.decodedToken = decoded;
//   //   next();
//   // })
// }


// // use verify admin after verifyToken
// const verifyAdmin = async(req, res, next) => {
//   const email = req.decodedToken.email;
//   const query = { email: email};
//   const user = await usersCollection.findOne(query);
//   const isAdmin = user?.role === "admin";
//   if (!isAdmin) {
//     return res.status(403).send({message: "Forbidden"})
//   }
//   next()
// }

// const cookieOptions = {
//   httpOnly: true,
//   secure: process.env.NODE_ENV === "production" ? true : false,
//   sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
// };

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    //await client.connect();

    const database = client.db("bistroBossDB");
    const menuCollection = database.collection("menu");
    const reviewsCollection = database.collection("reviews");
    const cartsCollection = database.collection("carts");
    const usersCollection = database.collection('users');
    const paymentsCollection = database.collection('payments');

    const verifyToken = async(req, res, next) => {
      // local storage
      const localToken = req.headers.authorization
      //console.log("Inside verifyToken", localToken)
      // token unavailable
      const splitToken = localToken.split(' ')[1]
      //console.log("Inside verifyToken", splitToken)
      if (!splitToken) {
        return res.status(401).send({message: "Unauthorized"})
      } 
      jwt.verify(splitToken, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if(error){
          return res.status(403).send({message: "Forbidden"})
        }
        req.decodedToken = decoded;
        next();
      })
      
      // cookies
      // const token = req.cookies?.token;
      // console.log("middleware token", token)
      // // token unavailable
      // if (!token) {
      //   return res.status(401).send({message: "Unauthorized"})
      // }
      // // token available
      // jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
      //   if(error){
      //     return res.status(403).send({message: "Forbidden"})
      //   }
      //   req.decodedToken = decoded;
      //   next();
      // })
    }
    
    
    // use verify admin after verifyToken
    const verifyAdmin = async(req, res, next) => {
      const email = req.decodedToken.email;
      const query = { email: email};
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({message: "Forbidden"})
      }
      next()
    }
    
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" ? true : false,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    };

    //jwt related api
    //creating Token
    app.post("/jwt", async (req, res) => {
      const userEmail = req.body;
      //console.log("user for token", userEmail);
      const token = jwt.sign(userEmail, process.env.ACCESS_TOKEN_SECRET);

      res
        .cookie("token", token, cookieOptions)
        .send({ loginSuccess: true, token: token });
    });

    //clearing Token
    app.post("/logout", async (req, res) => {
      const userEmail = req.body;
      //console.log("logging out", userEmail);
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ logoutSuccess: true });
    });

    // users related api
    app.get("/users", verifyToken, verifyAdmin, async(req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result)
    })

    app.get("/users/admin/:email", verifyToken, async(req, res) => {
      const email = req.params.email;
      console.log(email, req.decodedToken)
      if (email !== req.decodedToken?.email) {
        return res.status(403).send({message: "Forbidden"})
      }
      const query = { email: email}
      const user = await usersCollection.findOne(query)
      let admin = false
      if (user) {
        admin = user?.role === "admin"
        console.log("admin",admin)
      }
      res.send({admin})
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

    app.delete("/users/:id", verifyToken, verifyAdmin, async(req, res) => {
      const id = req.params.id;
      const query = { _id : new ObjectId(id)};
      const result = await usersCollection.deleteOne(query);
      res.send(result)
    })

    app.patch("/users/admin/:id", verifyToken, verifyAdmin, async(req, res) => {
      const id = req.params.id;
      const query = { _id : new ObjectId(id)};
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result)
    })
    
    // menu related api
    app.get("/menu", async(req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result)
    })

    app.get("/menu/:id", async(req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      //const query = {_id: id};
      // const query = {
      //   _id: id || new ObjectId.createFromHexString(id)
      // };
      const result = await menuCollection.findOne(query);
      res.send(result)
    })
    
    app.post("/menu", async(req, res) => {
      const menuItem = req.body;
      const result = await menuCollection.insertOne(menuItem)
      res.send(result)
    })

    app.delete("/menu/:id", verifyToken, verifyAdmin, async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await menuCollection.deleteOne(query);
      res.send(result)
    })

    app.patch("/menu/:id", async(req, res) => {
      const id = req.params.id;
      const item = req.body;
      const query = { _id : new ObjectId(id)};
      const updateDoc = {
        $set: {
          name: item.name,
          price: item.price,
          recipe: item.recipe,
          image: item.image,
          category: item.category
        },
      };
      const result = await menuCollection.updateOne(query, updateDoc);
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

    //payment related api
    //payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
    
      // Check if the price is provided and is a number
      if (!price || isNaN(price)) {
        console.error("Invalid price:", price);
        return res.status(400).send({ error: 'Price is required and must be a number' });
      }
    
      const amount = parseInt(price * 100); // Amount in cents
    
      try {
        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripeInstance.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ["card", "link"],
        });
    
        res.send({
          clientSecret: paymentIntent.client_secret,
        });
        console.log('Payment SUCCESS', req.body)
      } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).send({ error: 'Internal Server Error' });
      }
    });

    app.post('/payments', async(req, res) => {
      const payment = req.body;
      const paymentResult = await paymentsCollection.insertOne(payment);
      
      //carefully delete carts item
      console.log('paymentInfo', payment)
      const query = { 
        _id: { 
          $in: payment.cartIds.map(id => new ObjectId(id)) 
        } 
      };
      const deleteResult = await cartsCollection.deleteMany(query)
      
      res.send({paymentResult, deleteResult})
    })

    // app.get('/payments/:email', verifyToken, async(req, res) => {
    //   const email = req.params.email;
    //   console.log(email)
    //   const query = {email : email};
    //   if (email !== req.decodedToken.email) {
    //     return res.status(403).send({message: 'forbidden access'})
    //   }
    //   const result = await paymentsCollection.find(query).toArray();
    //   res.send(result)
    // })

    app.get("/payments", async(req, res) => {
      const email = req.query.email;
      const query = {email : email}
      const result = await paymentsCollection.find(query).toArray();
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