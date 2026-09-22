const jwt=require('jsonwebtoken');
function cookieAuth(cookieName,secret=process.env.JWT_SECRET){return (req,res,next)=>{try{const token=req.headers.authorization?.startsWith('Bearer ')?req.headers.authorization.slice(7):req.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith(`${cookieName}=`))?.slice(cookieName.length+1);if(!token) return res.status(401).json({success:false,message:'Authentication required.'});req.user=jwt.verify(token,secret);next()}catch{res.status(401).json({success:false,message:'Authentication required.'})}}}
module.exports={cookieAuth};
