'use server';

import { generateFAQ, GenerateFAQInput } from '@/ai/flows/generate-faq';
import { z } from 'zod';

const actionSchema = z.object({
  documentUrls: z.array(z.string().url()),
});

export async function generateFaqAction(input: GenerateFAQInput) {
  const validatedInput = actionSchema.safeParse(input);

  if (!validatedInput.success) {
    throw new Error('Invalid input for generating FAQ.');
  }

  try {
    const result = await generateFAQ(validatedInput.data);
    return result;
  } catch (error) {
    console.error('Error in generateFaqAction:', error);
    throw new Error('Failed to generate FAQ due to a server error.');
  }
}
