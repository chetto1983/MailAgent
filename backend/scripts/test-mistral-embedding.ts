import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { MistralService } from '../src/modules/ai/services/mistral.service';

async function main() {
  const appContext = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  try {
    const mistralService = appContext.get(MistralService);
    const client = await mistralService.createMistralClient();

    const sampleText =
      'Questo è un testo di prova per verificare la generazione di embedding con Mistral.';
    const embedding = await mistralService.generateEmbedding(sampleText, client);

    console.log('Embedding generata con successo');
    console.log('Dimensione vettore:', embedding.length);
    console.log('Prime 8 componenti:', embedding.slice(0, 8));
  } catch (error) {
    console.error('Test embedding fallito:', error);
    process.exitCode = 1;
  } finally {
    await appContext.close();
  }
}

main();
