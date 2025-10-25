import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as https from 'https';

@Injectable()
export class AiService {
  constructor(private readonly configService: ConfigService) {}

  async generateTest(topic: string, difficulty: string) {
    const OPENAI_API_KEY = this.configService.get<string>('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      // eslint-disable-next-line no-console
      console.error("OPENAI_API_KEY is not set!");
      throw new InternalServerErrorException("OpenAI API Key missing");
    }
    const prompt = `
      Generate a ${difficulty}-level mathematics test on "${topic}" with 5 multiple-choice questions. 
      For each question, provide:
      - id (number)
      - question (string)
      - options (array of strings)
      - correctAnswer (string)
      Respond in JSON array format, do NOT wrap the output in markdown or code fences.
      [
        {
          "id": 1,
          "question": "...",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": "C"
        },
        ...
      ]
    `;
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2048,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      }
    );
    let content = response.data.choices[0].message.content;
    // Remove markdown code block if present
    content = content
      .replace(/^\s*```(?:json)?/i, '')
      .replace(/```$/, '')
      .trim();
    try {
      return JSON.parse(content);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("AI response is not valid JSON:", content);
      throw new InternalServerErrorException("AI did not return valid JSON. Please try again.");
    }
  }

  async explainAnswer(question: string, userAnswer: string, correctAnswer: string) {
    const OPENAI_API_KEY = this.configService.get<string>('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      // eslint-disable-next-line no-console
      console.error("OPENAI_API_KEY is not set!");
      throw new InternalServerErrorException("OpenAI API Key missing");
    }
    const prompt = `
      Question: ${question}
      User's Answer: ${userAnswer}
      Correct Answer: ${correctAnswer}

      Give a step-by-step, student-friendly explanation for why the correct answer is right${
        userAnswer !== correctAnswer ? " and why the user's answer is incorrect" : ""
      }.
      Respond in plain text, do NOT wrap in markdown or code fences.
    `;
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 512,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      }
    );
    let content = response.data.choices[0].message.content;
    // Remove markdown code block if present
    content = content
      .replace(/^\s*```(?:json)?/i, '')
      .replace(/```$/, '')
      .trim();
    return content;
  }
}