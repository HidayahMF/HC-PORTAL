const express=require('express');const cors=require('cors');const rateLimit=require('express-rate-limit');const path=require('node:path');const {notFound,errorHandler}=require('./middleware/error');
const legacyNomor=require('./modules/legacy-nomor/app').app;
const legacyKontrak=require('./modules/legacy-kontrak/app').app;
const wagRuntime=require(path.resolve(__dirname,'modules/wag/runtime/server.js'));

function mountLegacy(app,prefix,legacy){app.use(prefix,(req,res,next)=>{const originalUrl=req.url;const originalBaseUrl=req.baseUrl;req.url=`/api${originalUrl==='/'?'':originalUrl}`;return legacy(req,res,(error)=>{req.url=originalUrl;req.baseUrl=originalBaseUrl;next(error)})})}
function createApp(){const app=express();app.set('trust proxy',1);app.locals.readiness={http:true,database:false,background:false,error:null};app.use(cors({origin:true,credentials:true}));app.use(express.json({limit:'32mb'}));app.use(express.urlencoded({extended:true,limit:'32mb'}));app.use(rateLimit({windowMs:60000,max:300,standardHeaders:true,legacyHeaders:false}));app.get('/health',(_req,res)=>res.json({success:true,data:{status:'ok',readiness:app.locals.readiness}}));app.get('/readyz',(_req,res)=>{const ready=app.locals.readiness.database&&app.locals.readiness.background;res.status(ready?200:503).json({success:ready,data:app.locals.readiness})});mountLegacy(app,'/api/nomor-surat',legacyNomor);mountLegacy(app,'/api/kontrak',legacyKontrak);mountLegacy(app,'/api/wag',wagRuntime.createApp());app.use(notFound);app.use(errorHandler);return app}
module.exports={createApp};
