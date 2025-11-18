const {PrismaClient}=require('./backend/node_modules/@prisma/client');
const p=new PrismaClient();
(async()=>{try{const providerId='cmi4tahls0001yhcw7zvishqo';
  const folders=await p.folder.findMany({where:{providerId}, select:{id:true,name:true,specialUse:true,totalCount:true,unreadCount:true}});
  console.dir(folders,{depth:null});
} catch(e){console.error(e);} finally {await p.$disconnect();}}
)();
