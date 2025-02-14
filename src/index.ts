import "dotenv/config";
import * as cheerio from "cheerio";

import { genkit, z } from "genkit";
import { gpt4o, openAI } from "genkitx-openai";

import { logger } from "genkit/logging";
logger.setLogLevel("debug");

const ai = genkit({
  plugins: [openAI({ apiKey: process.env.OPENAI_API_KEY })],
});


