const {PrismaClient}=require('./backend/node_modules/@prisma/client');
const p=new PrismaClient();
function normalize(name){
  const lower=name.toLowerCase().trim();
  if (['inbox','posta in arrivo','posteingang'].includes(lower)) return 'INBOX';
  if (['sent items','sentitems','sent','posta inviata','inviata','elementi inviati'].includes(lower)) return 'SENT';
  if (['deleted items','deleteditems','trash','posta eliminata','cestino','eliminata'].includes(lower)) return 'TRASH';
  if (['drafts','bozze','draft'].includes(lower)) return 'DRAFTS';
  if (['junk email','junk','spam','posta indesiderata','post indiserata'].includes(lower)) return 'SPAM';
  if (['archive','archivia','archivio','all mail'].includes(lower)) return 'ARCHIVE';
  return name.toUpperCase();
}
(async()=>{
  try{
    const providerId='cmi4tahls0001yhcw7zvishqo';
    const provider=await p.providerConfig.findUnique({where:{id:providerId}, select:{tenantId:true}});
    const folders=await p.folder.findMany({where:{providerId}, select:{id:true,name:true,specialUse:true}});
    for(const f of folders){
      const keys = f.specialUse ? [f.specialUse.replace('\\','').toUpperCase()] : [normalize(f.name)];
      const total = await p.email.count({where:{providerId, folder:{in:keys}}});
      const unread = await p.email.count({where:{providerId, folder:{in:keys}, isRead:false}});
      await p.folder.update({where:{id:f.id}, data:{totalCount:total, unreadCount:unread}});
      console.log('folder', f.name, keys, '=>', total, unread);
    }
  }catch(e){console.error(e);}finally{await p.$disconnect();}
})();
