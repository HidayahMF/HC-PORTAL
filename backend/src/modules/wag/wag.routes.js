const router=require('express').Router(); const controller=require('./wag.controller'); router.get('/health',controller.health); module.exports=router;
