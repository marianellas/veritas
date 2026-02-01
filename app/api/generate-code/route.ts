import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  
  try {
    const { prompt, codeType } = await request.json()

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY not configured. Please set it in your .env.local file.' },
        { status: 500 }
      )
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    
    // Log request details (without exposing full API key)
    const apiKeyPrefix = process.env.OPENAI_API_KEY?.substring(0, 7) || 'missing'
    console.log('OpenAI API Request:', {
      model,
      codeType,
      promptLength: prompt.length,
      apiKeyPrefix: `${apiKeyPrefix}...`,
    })
    
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: `You are an expert Python developer. Generate clean, well-documented Python ${codeType} code based on user descriptions. Return ONLY the code, no explanations or markdown formatting.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.6,
      max_tokens: 2000,
    })

    const generatedCode = response.choices[0]?.message?.content || ''
    
    if (!generatedCode) {
      return NextResponse.json(
        { error: 'No code generated in response' },
        { status: 500 }
      )
    }

    return NextResponse.json({ code: generatedCode })
  } catch (error: any) {
    console.error('Error generating code:', error)
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.constructor.name,
    })
    
    // Handle OpenAI API errors
    let errorMessage = 'Failed to generate code'
    let statusCode = 500
    
    if (error.status === 401) {
      errorMessage = 'Invalid OpenAI API key. Please check your .env.local file.'
      statusCode = 401
    } else if (error.status === 429) {
      errorMessage = error.message || 'OpenAI API quota exceeded. Please check your plan and billing details.'
      statusCode = 429
    } else if (error.status === 404) {
      errorMessage = `Model not found: ${model}. Please check your OPENAI_MODEL setting.`
      statusCode = 404
    } else if (error.message) {
      errorMessage = error.message
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      errorMessage = 'Cannot connect to OpenAI API. Please check your internet connection.'
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}
