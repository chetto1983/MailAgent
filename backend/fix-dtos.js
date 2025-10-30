const fs = require('fs');

// Fix google-provider.dto.ts
let content = fs.readFileSync('src/modules/providers/dto/google-provider.dto.ts', 'utf8');
content = content.replace(/  email: string;/g, '  email!: string;');
content = content.replace(/  authorizationCode: string;/g, '  authorizationCode!: string;');
fs.writeFileSync('src/modules/providers/dto/google-provider.dto.ts', content);

// Fix microsoft-provider.dto.ts
content = fs.readFileSync('src/modules/providers/dto/microsoft-provider.dto.ts', 'utf8');
content = content.replace(/  email: string;/g, '  email!: string;');
content = content.replace(/  authorizationCode: string;/g, '  authorizationCode!: string;');
fs.writeFileSync('src/modules/providers/dto/microsoft-provider.dto.ts', content);

// Fix generic-provider.dto.ts
content = fs.readFileSync('src/modules/providers/dto/generic-provider.dto.ts', 'utf8');
content = content.replace(/  email: string;/g, '  email!: string;');
content = content.replace(/  imapHost: string;/g, '  imapHost!: string;');
content = content.replace(/  imapUsername: string;/g, '  imapUsername!: string;');
content = content.replace(/  imapPassword: string;/g, '  imapPassword!: string;');
fs.writeFileSync('src/modules/providers/dto/generic-provider.dto.ts', content);

// Fix provider-response.dto.ts
content = fs.readFileSync('src/modules/providers/dto/provider-response.dto.ts', 'utf8');
content = content.replace(/  id: string;/g, '  id!: string;');
content = content.replace(/  providerType: string;/g, '  providerType!: string;');
content = content.replace(/  email: string;/g, '  email!: string;');
content = content.replace(/  supportsEmail: boolean;/g, '  supportsEmail!: boolean;');
content = content.replace(/  supportsCalendar: boolean;/g, '  supportsCalendar!: boolean;');
content = content.replace(/  supportsContacts: boolean;/g, '  supportsContacts!: boolean;');
content = content.replace(/  isDefault: boolean;/g, '  isDefault!: boolean;');
content = content.replace(/  isActive: boolean;/g, '  isActive!: boolean;');
content = content.replace(/  createdAt: Date;/g, '  createdAt!: Date;');
content = content.replace(/  updatedAt: Date;/g, '  updatedAt!: Date;');
content = content.replace(/  authUrl: string;/g, '  authUrl!: string;');
content = content.replace(/  state: string;/g, '  state!: string;');
content = content.replace(/  success: boolean;/g, '  success!: boolean;');
fs.writeFileSync('src/modules/providers/dto/provider-response.dto.ts', content);

console.log('DTOs fixed!');
