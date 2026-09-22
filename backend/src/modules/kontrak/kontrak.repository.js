const {getPool}=require('../../config/database'); exports.health=async()=>{const pool=await getPool();await pool.request().query('SELECT 1 AS ok');return {status:'ok'}};
