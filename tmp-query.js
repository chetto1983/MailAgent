const {PrismaClient}=require('./backend/node_modules/@prisma/client');
const p=new PrismaClient();
(async()=>{try{const fs=await p.folder.findMany({where:{providerId:'cmi4tahls0001yhcw7zvishqo'},select:{name:true,path:true,specialUse:true,totalCount:true,unreadCount:true}}); console.dir(fs,{depth:null});}catch(e){console.error(e);}finally{await p.$disconnect();}})();
