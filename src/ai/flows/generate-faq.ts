'use server';

/**
 * @fileOverview FAQ generator AI agent.
 *
 * - generateFAQ - A function that handles the FAQ generation process.
 * - GenerateFAQInput - The input type for the generateFAQ function.
 * - GenerateFAQOutput - The return type for the generateFAQ function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateFAQInputSchema = z.object({
  documentUrls: z
    .array(z.string().url())
    .describe('An array of URLs pointing to documents to generate a FAQ from.'),
});
export type GenerateFAQInput = z.infer<typeof GenerateFAQInputSchema>;

const GenerateFAQOutputSchema = z.object({
  faq: z.string().describe('The generated FAQ as a markdown string.'),
});
export type GenerateFAQOutput = z.infer<typeof GenerateFAQOutputSchema>;

export async function generateFAQ(input: GenerateFAQInput): Promise<GenerateFAQOutput> {
  return generateFAQFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFAQPrompt',
  input: {schema: GenerateFAQInputSchema},
  output: {schema: GenerateFAQOutputSchema},
  prompt: `Você é um especialista em gerar FAQs. Você irá gerar um FAQ com base no conteúdo dos seguintes documentos.

Documentos:
{{#each documentUrls}}
- {{{this}}}
{{/each}}

FAQ:`,
});

const generateFAQFlow = ai.defineFlow(
  {
    name: 'generateFAQFlow',
    inputSchema: GenerateFAQInputSchema,
    outputSchema: GenerateFAQOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
