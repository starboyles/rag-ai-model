import "dotenv/config";
import * as cheerio from "cheerio";

import { genkit, z } from "genkit";
import { gpt4o,  textEmbeddingAda002, openAI } from "genkitx-openai";

import { logger } from "genkit/logging";
logger.setLogLevel("debug");

import { retrieve } from "@genkit-ai/ai";
import { configureGenkit } from "@genkit-ai/core";
import { firebaseAuth } from "@genkit-ai/firebase/auth";
import { onFlow } from "@genkit-ai/firebase/functions";

import { defineFirestoreRetriever, firebase } from "@genkit-ai/firebase";
import { getFirestore } from "firebase-admin/firestore";
import { defineDotprompt } from '@genkit-ai/dotprompt';
import { dotprompt } from '@genkit-ai/dotprompt';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const ai = genkit({
  plugins: [openAI({ apiKey: process.env.OPENAI_API_KEY })],
});


