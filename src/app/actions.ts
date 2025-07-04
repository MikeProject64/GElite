'use server';

import { generateFAQ, GenerateFAQInput } from '@/ai/flows/generate-faq';
import { z } from 'zod';

const actionSchema = z.object({
  documentUrls: z.array(z.string().url()),
});

export async function generateFaqAction(input: GenerateFAQInput) {
  const validatedInput = actionSchema.safeParse(input);

  if (!validatedInput.success) {
    throw new Error('Entrada inválida para gerar FAQ.');
  }

  try {
    const result = await generateFAQ(validatedInput.data);
    return result;
  } catch (error) {
    console.error('Error in generateFaqAction:', error);
    throw new Error('Falha ao gerar FAQ devido a um erro no servidor.');
  }
}
