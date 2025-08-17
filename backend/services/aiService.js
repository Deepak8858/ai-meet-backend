const Groq = require('groq-sdk')
const { GoogleGenerativeAI } = require('@google/generative-ai')

class AIService {
  constructor() {
    // Initialize Groq client
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    })

    // Initialize Gemini client as fallback
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    this.geminiModel = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    this.primaryProvider = 'groq'
    this.fallbackProvider = 'gemini'
  }

  async summarizeText(content, prompt, provider = 'groq') {
    try {
      const systemPrompt = this.buildSystemPrompt(prompt)
      const userPrompt = this.formatContentForAI(content)

      if (provider === 'groq' && this.groq) {
        return await this.summarizeWithGroq(systemPrompt, userPrompt)
      } else if (provider === 'gemini' && this.geminiModel) {
        return await this.summarizeWithGemini(systemPrompt, userPrompt)
      } else {
        throw new Error('No AI provider available')
      }
    } catch (error) {
      console.error(`${provider} API error:`, error)
      
      // Try fallback if primary fails
      if (provider === 'groq' && this.geminiModel) {
        console.log('Falling back to Gemini...')
        return await this.summarizeWithGemini(this.buildSystemPrompt(prompt), this.formatContentForAI(content))
      }
      
      throw new Error(`AI summarization failed: ${error.message}`)
    }
  }

  async summarizeWithGroq(systemPrompt, userPrompt) {
    const response = await this.groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'openai/gpt-oss-20b',
      temperature: 0.3,
      max_tokens: 2048,
      top_p: 0.9
    })

    if (!response.choices[0]?.message?.content) {
      throw new Error('No response from Groq API')
    }

    return response.choices[0].message.content.trim()
  }

  async summarizeWithGemini(systemPrompt, userPrompt) {
    const chat = this.geminiModel.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }]
        },
        {
          role: 'model',
          parts: [{ text: 'I understand. I will help you summarize the meeting notes according to your instructions.' }]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 2048,
      }
    })

    const result = await chat.sendMessage(userPrompt)
    const response = await result.response
    
    if (!response.text()) {
      throw new Error('No response from Gemini API')
    }

    return response.text().trim()
  }

  buildSystemPrompt(userPrompt) {
    return `You are a professional meeting notes summarizer. Your task is to analyze meeting transcripts and create clear, concise, and actionable summaries based on the user's specific instructions.

Key guidelines:
- Focus on clarity and brevity
- Maintain professional tone
- Highlight key decisions, action items, and outcomes
- Use bullet points or numbered lists when appropriate
- Ensure the summary is easy to scan and understand
- Remove filler words and redundant information

User's specific instructions: ${userPrompt}

Please provide a well-structured summary that follows these instructions precisely.`
  }

  formatContentForAI(content) {
    const maxLength = 50000 // ~50KB limit for content
    if (content.length > maxLength) {
      content = content.substring(0, maxLength) + '... [Content truncated due to length]'
    }
    
    return `Please summarize the following meeting transcript:

${content}`
  }

  async validateAPIKeys() {
    const results = {
      groq: false,
      gemini: false
    }

    try {
      if (process.env.GROQ_API_KEY) {
        await this.groq.models.list()
        results.groq = true
      }
    } catch (error) {
      console.warn('Groq API key validation failed:', error.message)
    }

    try {
      if (process.env.GEMINI_API_KEY) {
        await this.geminiModel.generateContent('test')
        results.gemini = true
      }
    } catch (error) {
      console.warn('Gemini API key validation failed:', error.message)
    }

    return results
  }
}

module.exports = new AIService()