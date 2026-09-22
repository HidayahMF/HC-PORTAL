const service=require('./kontrak.service'); exports.health=async(_req,res,next)=>{try{res.json({success:true,data:await service.health()})}catch(error){next(error)}};
