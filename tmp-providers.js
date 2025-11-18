const {PrismaClient}=require('./backend/node_modules/@prisma/client');
const p=new PrismaClient();
(async()=>{try{const providers=await p.providerConfig.findMany({select:{id:true,email:true,providerType:true,lastSyncedAt:true,metadata:true}}); console.dir(providers,{depth:null});}catch(e){console.error(e);}finally{await p.$disconnect();}})();
