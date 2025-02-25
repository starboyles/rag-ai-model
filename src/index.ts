import "dotenv/config";
import * as cheerio from "cheerio";

import { genkit, z } from "genkit";
import { gpt4o, textEmbeddingAda002, openAI } from "genkitx-openai";

import { logger } from "genkit/logging";
logger.setLogLevel("debug");

import { retrieve } from "@genkit-ai/ai";
import { configureGenkit } from "@genkit-ai/core";
import { firebaseAuth } from "@genkit-ai/firebase/auth";
import { onFlow } from "@genkit-ai/firebase/functions";

import { defineFirestoreRetriever, firebase } from "@genkit-ai/firebase";
import { getFirestore } from "firebase-admin/firestore";
import { defineDotprompt } from "@genkit-ai/dotprompt";
import { Dotprompt } from "@genkit-ai/dotprompt";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

const ai = genkit({
  plugins: [openAI({ apiKey: process.env.OPENAI_API_KEY })],
});

const firebaseConfig = {
  apiKey: process.env.firebase_apiKey,
  authDomain: process.env.firebase_authDomain,
  projectId: process.env.firebase_projectId,
  storageBucket: process.env.firebase_storageBucket,
  messagingSenderId: process.env.firebase_messagingSender_Id,
  appId: process.env.firebase_app_Id,
};

const app = admin.initializeApp(firebaseConfig);
const firestore = getFirestore(app);

configureGenkit({
  plugins: [Dotprompt(), firebase(), openAI()],
  flowStateStore: "firebase",
  logLevel: "debug",
  traceStore: "firebase",
  enableTracingAndMetrics: true,
});

const retrieverRef = defineFirestoreRetriever({
  name: "merchRetriever",
  firestore,
  collection: "merch",  // Collection containing merchandise data
  contentField: "text",  // Field for product descriptions
  vectorField: "embedding", // Field for embeddings
  embedder: textEmbeddingGecko001, // Embedding model
  distanceMeasure: "COSINE", // Similarity metric
});

// Input schema for the question and retrieved data
const MerchQuestionInputSchema = z.object({
  data: z.array(z.string()), // Retrieved product descriptions
  question: z.string(), // User's question
});

// Define the DotPrompt for the customer service AI
const merchPrompt = defineDotprompt(
  {
    name: 'merchPrompt',
    model: openAI,
    input: {
      schema: MerchQuestionInputSchema
    },
    output: {
      format: 'text'
    },
    config: {
      temperature: 0.3 // Control randomness of responses
    },
  },
  `
  You are a customer service AI for an online store. 
  Given a customer's question and product information from the database, 
  recommend the most suitable products.

  Product Database:
  {{#each data~}}
  - {{this}}
  {{~/each}}

  Customer's Question:
  {{question}}
  `
);

// Firebase Function to handle customer questions
export const merchFlow = onFlow(
  {
    name: "merchFlow",
    inputSchema: z.string(), // Input is the customer's question
    outputSchema: z.string(), // Output is the AI's response
    authPolicy: firebaseAuth((user) => {
      if (!user.email_verified) {
        throw new Error("Verified email required to run flow");
      }
    }),
  },
  async (question) => {
    // Retrieve relevant products from Firestore
    const docs = await retrieve({
      retriever: retrieverRef,
      query: question,
      options: { limit: 5 }, // Get top 5 matches
    });

    // Generate a response using the DotPrompt and retrieved data
    const llmResponse = await merchPrompt.generate({
      input: {
        data: docs.map(doc => doc.content[0].text || ''),
        question,
      },
    });

    return llmResponse.text; // Return the AI's response
  }
);

// Export the index flow from another module (merch_embed.ts)
export { embedFlow } from './merch_embed';
