const router=require('express').Router(); const controller=require('./surat.controller'); router.get('/health',controller.health); module.exports=router;
