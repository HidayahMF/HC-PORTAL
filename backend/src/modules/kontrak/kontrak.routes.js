const router=require('express').Router(); const controller=require('./kontrak.controller'); router.get('/health',controller.health); module.exports=router;
