const express = require('express');
const bodyParser = require('body-parser');
const shortid = require('shortid');
const dns = require('dns');
const {
    MongoClient
} = require('mongodb');
const cors = require('cors');


if (process.env.NODE_ENV !== "production")
    require('dotenv').config();

const client = new MongoClient(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const app = express();

app.use(cors());

app.use(bodyParser.urlencoded({
    extended: true
}));

app.get('/', async (req, res)=>{

    try{
        await client.connect();

        let urls = await client.db('url_shortner').collection('url').find().toArray();
        //await client.close();

        res.json(urls);
    }catch(err){
        res.statusCode = 500;
        res.json({"error": "something went wrong"});
    }

});


app.post('/', (req, res)=>{
    try{
        let inputUrl = new URL(req.body.url);
        dns.lookup(inputUrl.hostname,{all: true}, async (err, address)=>{
            if(err){
                res.json({"error": "URL does not exist on internet"});
            }else{
                try{
                    await client.connect();
            
                    let doc = await client.db('url_shortner').collection('url').insertOne({
                        "url": req.body.url,
                        "short": shortid.generate(),
                        "clicks": 0
                    });
            
                    if(doc.insertedCount = 1){
                        res.statusCode = 201;
                        res.json({"inserted" : true});
                    }else{
                        res.statusCode = 500;
                        res.json({"inserted" : false});
                    }
            
                    //await client.close();
                }catch(err){
                    res.statusCode = 500;
                    res.json({"error": "something went wrong"});
                }
            }
        })
        
    }catch(err){
        res.statusCode = 409;
        res.json({"error": "url not in correct format. Please mention \'http://\' or \'https://\'"})
    }
});

app.get('/:short_url',async (req, res)=>{
    try{
        await client.connect();

        let doc = await client.db('url_shortner').collection('url').findOne({short: req.params.short_url});
        console.log(doc);
        let updateOutput = await client.db('url_shortner').collection('url').updateOne({short: req.params.short_url}, {$set: {clicks : doc.clicks+1}});

        if(updateOutput.result.nModified === 1){
            res.redirect(301, doc.url);
        }
        else{
            res.statusCode = 500;
            res.json({"error" : "clicks not modified"});
        }
        //await client.close();

    }catch(err){
        res.statusCode = 500;
        res.json({"error": "something went wrong"});
    }
});



app.listen(process.env.PORT, ()=>{
    console.log("server started at Port : ", process.env.PORT);
});


