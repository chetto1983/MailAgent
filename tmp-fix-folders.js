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
  return null;
}
(async()=>{
  try{
    const providerId='cmi4tahls0001yhcw7zvishqo';
    const folders=await p.folder.findMany({where:{providerId}, select:{id:true,name:true,specialUse:true}});
    for(const f of folders){
      if(!f.specialUse){
        const norm=normalize(f.name);
        if(norm){
          await p.folder.update({where:{id:f.id}, data:{specialUse:norm}});
          console.log('updated', f.name, '->', norm);
        }
      }
    }
  }catch(e){console.error(e);}finally{await p.$disconnect();}
})();
