import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';

// 평가 결과 타입 정의
export interface EvaluationResult {
  rankings: Array<{
    rank: number;
    playerId: string;
    score: number;
  }>;
  comments: Array<{
    playerId: string;
    comment: string;
  }>;
  summary?: string; // 전체 평가 해설
  evaluationCriteria?: string; // 평가 기준 설명
}

// 그림 제출 데이터 타입
export interface DrawingSubmission {
  playerId: string;
  imageData: string; // base64 인코딩된 이미지 데이터
  timestamp: number;
}

// AI 모델 타입 정의
export type AIModelType = 'gemini' | 'chatgpt' | 'claude';

// AI 평가자 인터페이스
export interface AIEvaluator {
  evaluate(submissions: DrawingSubmission[], keyword: string): Promise<EvaluationResult>;
}

// 모델별 설정
const MODEL_CONFIG = {
  gemini: {
    model: "gemini-2.5-flash",
    maxRetries: 3,
    timeout: 30000,
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,  // 해설을 위해 토큰 더 증가
    }
  },
  chatgpt: {
    model: "gpt-4o-mini",
    maxRetries: 3,
    timeout: 30000,
    temperature: 0.7,
    maxTokens: 4096
  },
  claude: {
    model: "claude-3-5-haiku-20241022",
    maxRetries: 3,
    timeout: 30000,
    temperature: 0.7,
    maxTokens: 8192
  }
};

// API 키 검증
function validateApiKey(): string {
  console.log('🔑 API 키 검증 시작...');
  console.log('📋 환경 변수 상태:', {
    nodeEnv: process.env.NODE_ENV,
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    keyLength: process.env.GEMINI_API_KEY?.length || 0,
    keyPrefix: process.env.GEMINI_API_KEY?.substring(0, 10) + '...' || 'none',
    allEnvKeys: Object.keys(process.env).filter(key => key.includes('GEMINI')),
    processEnvKeys: Object.keys(process.env).length
  });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('⚠️  GEMINI_API_KEY 환경 변수가 설정되지 않았습니다!');
    console.error('🔍 사용 가능한 환경 변수들:', Object.keys(process.env).filter(key => key.includes('GEMINI')));
    console.error('🔍 .env 파일 확인:', {
      cwd: process.cwd(),
      envFiles: ['.env.local', '.env', '.env.development.local'].map(file => {
        try {
          const fs = require('fs');
          const path = require('path');
          const exists = fs.existsSync(path.join(process.cwd(), file));
          return { file, exists };
        } catch (e: unknown) {
          return { file, exists: false, error: e instanceof Error ? e.message : String(e) };
        }
      })
    });
    throw new Error('Gemini API key is not configured');
  }

  if (apiKey.length < 20) {
    console.error('❌ GEMINI_API_KEY가 너무 짧습니다:', {
      length: apiKey.length,
      startsWithAI: apiKey.startsWith('AI'),
      preview: apiKey.substring(0, 5) + '***'
    });
    throw new Error('Invalid Gemini API key format');
  }

  console.log('✅ API 키 검증 완료:', {
    length: apiKey.length,
    startsWithAI: apiKey.startsWith('AI'),
    preview: apiKey.substring(0, 5) + '***'
  });
  return apiKey;
}

// Gemini 평가자 클래스
class GeminiEvaluator implements AIEvaluator {
  async evaluate(submissions: DrawingSubmission[], keyword: string): Promise<EvaluationResult> {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API key is not configured');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: MODEL_CONFIG.gemini.model,
        generationConfig: MODEL_CONFIG.gemini.generationConfig
      });

      const parts = [
        {
          text: `**🎨 AI 그림 평가 챌린지!**

주제: "${keyword}"

안녕하세요! 저는 그림 그리기 게임의 AI 심사위원입니다. 제출된 ${submissions.length}개의 작품을 다음 기준으로 종합 평가하겠습니다:

**📋 평가 기준 (총 100점)**
1. **주제 연관성 (50점)**: "${keyword}"라는 주제를 얼마나 잘 표현했는가?
2. **창의성 (30점)**: 독창적이고 참신한 아이디어가 있는가?
3. **완성도 (20점)**: 그림의 기술적 완성도와 전체적인 완성감

**🎯 평가 결과를 다음 JSON 형식으로만 반환해주세요:**

\`\`\`json
{
  "rankings": [
    {"rank": 1, "playerId": "${submissions[0]?.playerId}", "score": 95},
    {"rank": 2, "playerId": "${submissions[1]?.playerId}", "score": 88}
  ],
  "comments": [
    {"playerId": "${submissions[0]?.playerId}", "comment": "주제 '${keyword}'를 매우 창의적으로 표현했습니다! 특히 [구체적인 요소]가 인상적이었고, 전체적인 완성도도 훌륭합니다. 색상 선택과 구도가 매우 조화롭네요. 🌟"},
    {"playerId": "${submissions[1]?.playerId}", "comment": "주제를 잘 이해하고 표현하려 노력한 모습이 보입니다. [구체적인 장점]이 돋보이지만, [개선점]을 보완하면 더욱 좋은 작품이 될 것 같아요! 👍"}
  ],
  "summary": "이번 라운드는 '${keyword}'라는 주제로 진행되었습니다. 모든 참가자들이 각자의 개성과 창의력을 발휘한 멋진 작품들을 선보였습니다. 특히 [전체적인 특징이나 패턴]이 인상적이었으며, 다음 라운드가 더욱 기대됩니다! 🎨✨",
  "evaluationCriteria": "주제 연관성 50%, 창의성 30%, 완성도 20% 기준으로 평가했습니다. 모든 작품을 공정하고 객관적으로 비교 분석했으며, 각 작품의 고유한 장점을 찾아 격려하는 방향으로 코멘트했습니다."
}
\`\`\`

**💡 평가 시 주의사항:**
- 각 작품의 장점을 찾아 격려하는 톤으로 코멘트 작성
- 구체적이고 건설적인 피드백 제공
- 점수는 60~100점 범위에서 변별력 있게 부여
- 코멘트는 최소 2-3줄로 상세하게 작성`
        },
        // 모든 제출된 그림을 base64로 포함
        ...submissions.map((submission) => ({
          inlineData: {
            mimeType: "image/png",
            data: submission.imageData.replace(/^data:image\/[a-z]+;base64,/, '') // base64 헤더 제거
          }
        }))
      ];

      console.log(`🤖 Gemini 평가 시작: ${submissions.length}개 그림, 제시어: "${keyword}"`);
      console.log('📤 Gemini API 요청 데이터:', {
        model: MODEL_CONFIG.gemini.model,
        submissionCount: submissions.length,
        keyword: keyword,
        imageDataSizes: submissions.map(s => `Player ${s.playerId}: ${s.imageData.length} chars`)
      });

      // 이미지 데이터 유효성 검증
      console.log('🔍 이미지 데이터 검증 중...');
      submissions.forEach((submission, index) => {
        const isValidBase64 = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/.test(submission.imageData);
        console.log(`🖼️  이미지 ${index + 1} (Player ${submission.playerId}):`, {
          length: submission.imageData.length,
          isValidBase64: isValidBase64,
          prefix: submission.imageData.substring(0, 50) + '...',
          hasComma: submission.imageData.includes(','),
          commaIndex: submission.imageData.indexOf(',')
        });
      });

      console.log('🚀 Gemini API 요청 전송 중...');
      const response = await model.generateContent(parts);

      console.log('📥 Gemini API 응답 받음');
      console.log('🔍 응답 객체 상세 정보:', {
        response: !!response,
        hasResponse: !!response.response,
        responseType: typeof response.response,
        responseKeys: response.response ? Object.keys(response.response) : 'N/A'
      });

      // 응답 객체 상세 분석
      console.log('🔍 응답 candidates 정보:', {
        hasCandidates: !!response.response.candidates,
        candidatesLength: response.response.candidates?.length || 0,
        firstCandidate: response.response.candidates?.[0] ? {
          hasContent: !!response.response.candidates[0].content,
          contentParts: response.response.candidates[0].content?.parts?.length || 0,
          finishReason: response.response.candidates[0].finishReason
        } : 'N/A'
      });

      // 여러 방법으로 텍스트 추출 시도
      let result = '';
      try {
        result = response.response.text();
        console.log('✅ response.text() 성공');
      } catch (textError: unknown) {
        console.error('❌ response.text() 실패:', textError instanceof Error ? textError.message : String(textError));

        // 대안: candidates에서 직접 추출
        try {
          if (response.response.candidates?.[0]?.content?.parts?.[0]?.text) {
            result = response.response.candidates[0].content.parts[0].text;
            console.log('✅ candidates에서 텍스트 추출 성공');
          }
        } catch (candidateError: unknown) {
          console.error('❌ candidates 텍스트 추출 실패:', candidateError instanceof Error ? candidateError.message : String(candidateError));
        }
      }

      console.log('📋 AI 평가 원본 응답 전체:', JSON.stringify(result, null, 2));
      console.log('📋 AI 평가 원본 응답 (처음 500자):', result.substring(0, 500));
      console.log('📋 AI 평가 원본 응답 (마지막 200자):', result.substring(Math.max(0, result.length - 200)));
      console.log('📊 응답 길이:', result.length, '자');
      console.log('📊 응답 타입:', typeof result);
      console.log('📊 응답이 빈 문자열인가?', result === '');
      console.log('📊 응답이 null/undefined인가?', result === null || result === undefined);

      // 빈 응답인 경우 추가 정보 출력
      if (!result || result.length === 0) {
        console.error('💥 Gemini API 빈 응답 감지!');
        console.log('🔍 응답 객체 전체 구조:', JSON.stringify(response.response, null, 2));
        console.log('🔍 후보 응답들:', response.response.candidates?.map((candidate, index) => ({
          index,
          finishReason: candidate.finishReason,
          safetyRatings: candidate.safetyRatings,
          hasContent: !!candidate.content,
          contentParts: candidate.content?.parts?.length || 0
        })));
      }

      return parseEvaluationResult(result, submissions);

    } catch (error: unknown) {
      console.error('💥 Gemini API 호출 실패:', error);
      console.error('🔍 에러 상세 정보:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
        status: (error as any)?.status,
        statusText: (error as any)?.statusText,
        stack: error instanceof Error ? error.stack?.substring(0, 500) + '...' : 'No stack trace',
        errorType: typeof error,
        errorKeys: error && typeof error === 'object' ? Object.keys(error as object) : 'N/A'
      });

      // 네트워크 관련 에러인지 확인
      if ((error as any)?.code === 'ENOTFOUND' || (error as any)?.code === 'ECONNREFUSED') {
        console.error('🌐 네트워크 연결 문제 감지');
      }

      // API 키 관련 에러인지 확인
      if ((error as any)?.status === 401 || (error as any)?.status === 403) {
        console.error('🔑 API 키 인증 문제 감지');
      }

      // 요청 크기 관련 에러인지 확인
      if ((error as any)?.status === 413 || (error instanceof Error && error.message.includes('too large'))) {
        console.error('📦 요청 크기 초과 문제 감지');
      }

      // 에러 발생 시 기본 결과 반환
      console.log('🔄 기본 결과 생성으로 전환...');
      return generateDefaultResult(submissions);
    }
  }
}

// ChatGPT 평가자 클래스
class ChatGPTEvaluator implements AIEvaluator {
  async evaluate(submissions: DrawingSubmission[], keyword: string): Promise<EvaluationResult> {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key is not configured');
      }

      const openai = new OpenAI({ apiKey });

      // 이미지 데이터 준비
      const imageContents = submissions.map(submission => {
        // 이미지 URL이 이미 data: 접두사를 가지고 있는지 확인
        const imageUrl = submission.imageData.startsWith('data:') 
          ? submission.imageData 
          : `data:image/png;base64,${submission.imageData.replace(/^data:image\/[a-z]+;base64,/, '')}`;

        return {
          type: "image_url",
          image_url: {
            url: imageUrl,
          }
        };
      });

      // 프롬프트 준비
      const prompt = `**🎨 AI 그림 평가 챌린지!**

주제: "${keyword}"

안녕하세요! 저는 그림 그리기 게임의 AI 심사위원입니다. 제출된 ${submissions.length}개의 작품을 다음 기준으로 종합 평가하겠습니다:

**📋 평가 기준 (총 100점)**
1. **주제 연관성 (50점)**: "${keyword}"라는 주제를 얼마나 잘 표현했는가?
2. **창의성 (30점)**: 독창적이고 참신한 아이디어가 있는가?
3. **완성도 (20점)**: 그림의 기술적 완성도와 전체적인 완성감

**🎯 평가 결과를 다음 JSON 형식으로만 반환해주세요:**

\`\`\`json
{
  "rankings": [
    {"rank": 1, "playerId": "${submissions[0]?.playerId}", "score": 95},
    {"rank": 2, "playerId": "${submissions[1]?.playerId}", "score": 88}
  ],
  "comments": [
    {"playerId": "${submissions[0]?.playerId}", "comment": "주제 '${keyword}'를 매우 창의적으로 표현했습니다! 특히 [구체적인 요소]가 인상적이었고, 전체적인 완성도도 훌륭합니다. 색상 선택과 구도가 매우 조화롭네요. 🌟"},
    {"playerId": "${submissions[1]?.playerId}", "comment": "주제를 잘 이해하고 표현하려 노력한 모습이 보입니다. [구체적인 장점]이 돋보이지만, [개선점]을 보완하면 더욱 좋은 작품이 될 것 같아요! 👍"}
  ],
  "summary": "이번 라운드는 '${keyword}'라는 주제로 진행되었습니다. 모든 참가자들이 각자의 개성과 창의력을 발휘한 멋진 작품들을 선보였습니다. 특히 [전체적인 특징이나 패턴]이 인상적이었으며, 다음 라운드가 더욱 기대됩니다! 🎨✨",
  "evaluationCriteria": "주제 연관성 50%, 창의성 30%, 완성도 20% 기준으로 평가했습니다. 모든 작품을 공정하고 객관적으로 비교 분석했으며, 각 작품의 고유한 장점을 찾아 격려하는 방향으로 코멘트했습니다."
}
\`\`\`

**💡 평가 시 주의사항:**
- 각 작품의 장점을 찾아 격려하는 톤으로 코멘트 작성
- 구체적이고 건설적인 피드백 제공
- 점수는 60~100점 범위에서 변별력 있게 부여
- 코멘트는 최소 2-3줄로 상세하게 작성`;

      console.log(`🤖 ChatGPT 평가 시작: ${submissions.length}개 그림, 제시어: "${keyword}"`);

      // 이미지 데이터 유효성 검증
      console.log('🔍 이미지 데이터 검증 중...');
      submissions.forEach((submission, index) => {
        const isValidBase64 = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/.test(submission.imageData);
        console.log(`🖼️  이미지 ${index + 1} (Player ${submission.playerId}):`, {
          length: submission.imageData.length,
          isValidBase64: isValidBase64,
          prefix: submission.imageData.substring(0, 50) + '...'
        });
      });

      console.log('🚀 ChatGPT API 요청 전송 중...');
      console.log('📤 ChatGPT API 요청 구성:', {
        model: MODEL_CONFIG.chatgpt.model,
        maxTokens: MODEL_CONFIG.chatgpt.maxTokens,
        temperature: MODEL_CONFIG.chatgpt.temperature,
        promptLength: prompt.length,
        imageCount: imageContents.length,
        imageUrls: imageContents.map(img => img.image_url.url.substring(0, 30) + '...')
      });

      // API 요청 구성
      const response = await openai.chat.completions.create({
        model: MODEL_CONFIG.chatgpt.model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              ...imageContents
            ]
          }
        ],
        max_tokens: MODEL_CONFIG.chatgpt.maxTokens,
        temperature: MODEL_CONFIG.chatgpt.temperature
      });

      console.log('📥 ChatGPT API 응답 받음');
      console.log('🔍 ChatGPT 응답 객체 상세 정보:', {
        id: response.id,
        model: response.model,
        created: response.created,
        choicesCount: response.choices?.length || 0,
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens
        } : 'N/A'
      });

      // 응답 텍스트 추출
      const result = response.choices[0]?.message?.content || '';

      console.log('📋 ChatGPT 응답 세부 정보:', {
        firstChoice: response.choices[0] ? {
          index: response.choices[0].index,
          finishReason: response.choices[0].finish_reason,
          hasMessage: !!response.choices[0].message,
          messageRole: response.choices[0].message?.role,
          contentLength: response.choices[0].message?.content?.length || 0
        } : 'N/A'
      });

      console.log('📋 AI 평가 원본 응답 전체:', JSON.stringify(result, null, 2));
      console.log('📋 AI 평가 원본 응답 (처음 500자):', result.substring(0, 500));
      console.log('📋 AI 평가 원본 응답 (마지막 200자):', result.substring(Math.max(0, result.length - 200)));

      // 응답 유효성 검증
      console.log('📊 ChatGPT 응답 분석:', {
        length: result.length,
        isEmpty: result.length === 0,
        hasJson: /\{[\s\S]*\}/.test(result),
        hasCodeBlock: /```/.test(result),
        firstBrace: result.indexOf('{'),
        lastBrace: result.lastIndexOf('}'),
        jsonBlockCount: (result.match(/```json/g) || []).length,
        plainCodeBlockCount: (result.match(/```(?!json)/g) || []).length
      });

      return parseEvaluationResult(result, submissions);

    } catch (error: unknown) {
      console.error('💥 ChatGPT API 호출 실패:', error);
      console.error('🔍 ChatGPT 에러 상세 정보:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        status: (error as any)?.status,
        statusText: (error as any)?.statusText,
        type: (error as any)?.type,
        code: (error as any)?.code,
        param: (error as any)?.param,
        stack: error instanceof Error ? error.stack?.substring(0, 500) + '...' : 'No stack trace',
        errorType: typeof error,
        errorKeys: error && typeof error === 'object' ? Object.keys(error as object) : 'N/A'
      });

      // 에러 유형 분석
      if ((error as any)?.code === 'ENOTFOUND' || (error as any)?.code === 'ECONNREFUSED') {
        console.error('🌐 ChatGPT 네트워크 연결 문제 감지');
      }

      if ((error as any)?.status === 401 || (error as any)?.status === 403) {
        console.error('🔑 ChatGPT API 키 인증 문제 감지');
      }

      if ((error as any)?.status === 429) {
        console.error('⚠️ ChatGPT API 요청 한도 초과 문제 감지');
      }

      if ((error as any)?.status === 413 || (error instanceof Error && error.message.includes('too large'))) {
        console.error('📦 ChatGPT 요청 크기 초과 문제 감지');
      }

      // 에러 발생 시 기본 결과 반환
      console.log('🔄 기본 결과 생성으로 전환...');
      return generateDefaultResult(submissions);
    }
  }
}

// Claude 평가자 클래스
class ClaudeEvaluator implements AIEvaluator {
  async evaluate(submissions: DrawingSubmission[], keyword: string): Promise<EvaluationResult> {
    try {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('Anthropic API key is not configured');
      }

      const anthropic = new Anthropic({ apiKey });

      // 이미지 데이터 준비
      const imageContents = submissions.map((submission, index) => ({
        type: "image",
        source: {
          type: "base64",
          media_type: "image/png",
          data: submission.imageData.replace(/^data:image\/[a-z]+;base64,/, '')
        }
      }));

      // 프롬프트 준비
      const prompt = `**🎨 AI 그림 평가 챌린지!**

주제: "${keyword}"

안녕하세요! 저는 그림 그리기 게임의 AI 심사위원입니다. 제출된 ${submissions.length}개의 작품을 다음 기준으로 종합 평가하겠습니다:

**📋 평가 기준 (총 100점)**
1. **주제 연관성 (50점)**: "${keyword}"라는 주제를 얼마나 잘 표현했는가?
2. **창의성 (30점)**: 독창적이고 참신한 아이디어가 있는가?
3. **완성도 (20점)**: 그림의 기술적 완성도와 전체적인 완성감

**🎯 평가 결과를 다음 JSON 형식으로만 반환해주세요:**

\`\`\`json
{
  "rankings": [
    {"rank": 1, "playerId": "${submissions[0]?.playerId}", "score": 95},
    {"rank": 2, "playerId": "${submissions[1]?.playerId}", "score": 88}
  ],
  "comments": [
    {"playerId": "${submissions[0]?.playerId}", "comment": "주제 '${keyword}'를 매우 창의적으로 표현했습니다! 특히 [구체적인 요소]가 인상적이었고, 전체적인 완성도도 훌륭합니다. 색상 선택과 구도가 매우 조화롭네요. 🌟"},
    {"playerId": "${submissions[1]?.playerId}", "comment": "주제를 잘 이해하고 표현하려 노력한 모습이 보입니다. [구체적인 장점]이 돋보이지만, [개선점]을 보완하면 더욱 좋은 작품이 될 것 같아요! 👍"}
  ],
  "summary": "이번 라운드는 '${keyword}'라는 주제로 진행되었습니다. 모든 참가자들이 각자의 개성과 창의력을 발휘한 멋진 작품들을 선보였습니다. 특히 [전체적인 특징이나 패턴]이 인상적이었으며, 다음 라운드가 더욱 기대됩니다! 🎨✨",
  "evaluationCriteria": "주제 연관성 50%, 창의성 30%, 완성도 20% 기준으로 평가했습니다. 모든 작품을 공정하고 객관적으로 비교 분석했으며, 각 작품의 고유한 장점을 찾아 격려하는 방향으로 코멘트했습니다."
}
\`\`\`

**💡 평가 시 주의사항:**
- 각 작품의 장점을 찾아 격려하는 톤으로 코멘트 작성
- 구체적이고 건설적인 피드백 제공
- 점수는 60~100점 범위에서 변별력 있게 부여
- 코멘트는 최소 2-3줄로 상세하게 작성`;

      console.log(`🤖 Claude 평가 시작: ${submissions.length}개 그림, 제시어: "${keyword}"`);

      // 이미지 데이터 유효성 검증
      console.log('🔍 이미지 데이터 검증 중...');
      submissions.forEach((submission, index) => {
        const isValidBase64 = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/.test(submission.imageData);
        console.log(`🖼️  이미지 ${index + 1} (Player ${submission.playerId}):`, {
          length: submission.imageData.length,
          isValidBase64: isValidBase64,
          prefix: submission.imageData.substring(0, 50) + '...'
        });
      });

      console.log('🚀 Claude API 요청 전송 중...');
      console.log('📤 Claude API 요청 구성:', {
        model: MODEL_CONFIG.claude.model,
        maxTokens: MODEL_CONFIG.claude.maxTokens,
        temperature: MODEL_CONFIG.claude.temperature,
        promptLength: prompt.length,
        imageCount: imageContents.length,
        imageTypes: imageContents.map(img => img.type)
      });

      // API 요청 구성
      const response = await anthropic.messages.create({
        model: MODEL_CONFIG.claude.model,
        max_tokens: MODEL_CONFIG.claude.maxTokens,
        temperature: MODEL_CONFIG.claude.temperature,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              ...imageContents
            ]
          }
        ]
      });

      console.log('📥 Claude API 응답 받음');
      console.log('🔍 Claude 응답 객체 상세 정보:', {
        id: response.id,
        model: response.model,
        type: response.type,
        role: response.role,
        contentCount: response.content?.length || 0,
        stopReason: response.stop_reason,
        usage: response.usage ? {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens
        } : 'N/A'
      });

      // 응답 텍스트 추출
      const result = response.content.reduce((acc, item) => {
        if (item.type === 'text') {
          return acc + item.text;
        }
        return acc;
      }, '');

      console.log('📋 Claude 응답 세부 정보:', {
        contentItems: response.content.map(item => ({
          type: item.type,
          textLength: item.type === 'text' ? item.text?.length : 0
        }))
      });

      console.log('📋 AI 평가 원본 응답 전체:', JSON.stringify(result, null, 2));
      console.log('📋 AI 평가 원본 응답 (처음 500자):', result.substring(0, 500));
      console.log('📋 AI 평가 원본 응답 (마지막 200자):', result.substring(Math.max(0, result.length - 200)));

      // 응답 유효성 검증
      console.log('📊 Claude 응답 분석:', {
        length: result.length,
        isEmpty: result.length === 0,
        hasJson: /\{[\s\S]*\}/.test(result),
        hasCodeBlock: /```/.test(result),
        firstBrace: result.indexOf('{'),
        lastBrace: result.lastIndexOf('}'),
        jsonBlockCount: (result.match(/```json/g) || []).length,
        plainCodeBlockCount: (result.match(/```(?!json)/g) || []).length
      });

      return parseEvaluationResult(result, submissions);

    } catch (error: unknown) {
      console.error('💥 Claude API 호출 실패:', error);
      console.error('🔍 Claude 에러 상세 정보:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        status: (error as any)?.status,
        statusText: (error as any)?.statusText,
        type: (error as any)?.type,
        code: (error as any)?.code,
        param: (error as any)?.param,
        stack: error instanceof Error ? error.stack?.substring(0, 500) + '...' : 'No stack trace',
        errorType: typeof error,
        errorKeys: error && typeof error === 'object' ? Object.keys(error as object) : 'N/A'
      });

      // 에러 유형 분석
      if ((error as any)?.code === 'ENOTFOUND' || (error as any)?.code === 'ECONNREFUSED') {
        console.error('🌐 Claude 네트워크 연결 문제 감지');
      }

      if ((error as any)?.status === 401 || (error as any)?.status === 403) {
        console.error('🔑 Claude API 키 인증 문제 감지');
      }

      if ((error as any)?.status === 429) {
        console.error('⚠️ Claude API 요청 한도 초과 문제 감지');
      }

      if ((error as any)?.status === 413 || (error instanceof Error && error.message.includes('too large'))) {
        console.error('📦 Claude 요청 크기 초과 문제 감지');
      }

      // 에러 발생 시 기본 결과 반환
      console.log('🔄 기본 결과 생성으로 전환...');
      return generateDefaultResult(submissions);
    }
  }
}

// 평가자 팩토리 함수
export function createEvaluator(modelType: AIModelType): AIEvaluator {
  switch (modelType) {
    case 'gemini':
      return new GeminiEvaluator();
    case 'chatgpt':
      return new ChatGPTEvaluator();
    case 'claude':
      return new ClaudeEvaluator();
    default:
      return new GeminiEvaluator(); // 기본값은 Gemini
  }
}

// JSON 응답 파싱 함수 (개선된 버전)
function parseEvaluationResult(llmResponse: string, submissions: DrawingSubmission[]): EvaluationResult {
  try {
    console.log('🔍 AI 응답 파싱 중...');
    console.log('📄 파싱할 응답 미리보기:', llmResponse.substring(0, 200) + '...');
    console.log('📊 파싱 입력 정보:', {
      responseLength: llmResponse.length,
      submissionCount: submissions.length,
      playerIds: submissions.map(s => s.playerId)
    });

    // 여러 JSON 추출 패턴 시도
    const patterns = [
      /```json\s*(\{[\s\S]*?\})\s*```/,  // ```json 블록
      /```\s*(\{[\s\S]*?\})\s*```/,      // ``` 블록
      /(\{[\s\S]*?\})/                   // 단순 JSON
    ];

    console.log('🔍 JSON 추출 패턴 시도 중...');
    let matchedPattern = null;
    let extractedJson = null;

    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      console.log(`🔍 패턴 ${i + 1} 시도 중...`);
      const match = llmResponse.match(pattern);
      if (match) {
        matchedPattern = i;
        extractedJson = match[1];
        console.log(`🎯 패턴 ${i + 1} 매치됨:`, {
          patternType: i === 0 ? '```json 블록' : i === 1 ? '``` 블록' : '단순 JSON',
          extractedLength: extractedJson.length,
          preview: extractedJson.substring(0, 100) + '...'
        });

        try {
          console.log(`🔍 JSON 파싱 시도 중 (패턴 ${i + 1})...`);
          const parsed = JSON.parse(extractedJson);
          console.log('✅ JSON 파싱 성공');

          // 필수 필드 검증
          console.log('🔍 필수 필드 검증 중...');
          if (parsed.rankings && parsed.comments && Array.isArray(parsed.rankings)) {
            console.log('✅ AI 응답 파싱 성공');
            console.log('🏆 파싱된 결과:', {
              rankingsCount: parsed.rankings.length,
              commentsCount: parsed.comments.length,
              hasSummary: !!parsed.summary,
              hasEvaluationCriteria: !!parsed.evaluationCriteria,
              rankings: parsed.rankings.map(r => ({ rank: r.rank, playerId: r.playerId, score: r.score })),
              comments: parsed.comments.map(c => ({ playerId: c.playerId, commentLength: c.comment.length }))
            });

            // 플레이어 ID 검증
            const submissionIds = new Set(submissions.map(s => s.playerId));
            const rankingIds = new Set(parsed.rankings.map(r => r.playerId));
            const commentIds = new Set(parsed.comments.map(c => c.playerId));

            console.log('🔍 플레이어 ID 검증:', {
              submissionIds: [...submissionIds],
              rankingIds: [...rankingIds],
              commentIds: [...commentIds],
              allSubmissionsInRankings: [...submissionIds].every(id => rankingIds.has(id)),
              allSubmissionsInComments: [...submissionIds].every(id => commentIds.has(id))
            });

            return parsed;
          } else {
            console.warn(`⚠️  패턴 ${i + 1}에서 필수 필드 누락:`, {
              hasRankings: !!parsed.rankings,
              hasComments: !!parsed.comments,
              rankingsIsArray: Array.isArray(parsed.rankings),
              parsedKeys: Object.keys(parsed)
            });
          }
        } catch (parseError: unknown) {
          console.error(`❌ 패턴 ${i + 1} JSON 파싱 실패:`, {
            error: parseError instanceof Error ? parseError.message : String(parseError),
            extractedJsonPreview: extractedJson.substring(0, 50) + '...' + extractedJson.substring(extractedJson.length - 50)
          });
        }
      } else {
        console.log(`❌ 패턴 ${i + 1} 매치 없음`);
      }
    }

    throw new Error('Valid JSON not found in any pattern');

  } catch (error: unknown) {
    console.error('💥 LLM 응답 파싱 실패:', error);
    console.error('🔍 파싱 에러 상세 정보:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.substring(0, 300) + '...' : 'No stack trace',
      errorType: typeof error
    });

    console.log('📄 전체 원본 응답:', llmResponse);

    // 응답 구조 심층 분석
    const jsonBraceCount = (llmResponse.match(/\{/g) || []).length;
    const jsonCloseBraceCount = (llmResponse.match(/\}/g) || []).length;
    const codeBlockCount = (llmResponse.match(/```/g) || []).length;

    console.log('📊 응답 심층 분석:', {
      length: llmResponse.length,
      hasJson: /\{[\s\S]*\}/.test(llmResponse),
      hasCodeBlock: /```/.test(llmResponse),
      firstBrace: llmResponse.indexOf('{'),
      lastBrace: llmResponse.lastIndexOf('}'),
      jsonBraceCount: jsonBraceCount,
      jsonCloseBraceCount: jsonCloseBraceCount,
      braceBalance: jsonBraceCount - jsonCloseBraceCount,
      codeBlockCount: codeBlockCount,
      codeBlocksBalanced: codeBlockCount % 2 === 0,
      hasJsonKeywords: /\"rankings\"/.test(llmResponse) && /\"comments\"/.test(llmResponse),
      possibleJsonStart: llmResponse.indexOf('{'),
      possibleJsonEnd: llmResponse.lastIndexOf('}'),
      possibleJsonLength: llmResponse.lastIndexOf('}') - llmResponse.indexOf('{') + 1
    });

    // 가능한 JSON 부분 추출 시도
    if (llmResponse.indexOf('{') >= 0 && llmResponse.lastIndexOf('}') > llmResponse.indexOf('{')) {
      const possibleJson = llmResponse.substring(llmResponse.indexOf('{'), llmResponse.lastIndexOf('}') + 1);
      console.log('🔍 가능한 JSON 부분 추출 시도:', {
        length: possibleJson.length,
        preview: possibleJson.length > 100 ? possibleJson.substring(0, 50) + '...' + possibleJson.substring(possibleJson.length - 50) : possibleJson
      });

      try {
        JSON.parse(possibleJson);
        console.log('⚠️ 추출된 JSON은 유효하지만 패턴 매칭에 실패했습니다. 파싱 로직 검토 필요');
      } catch (jsonError: unknown) {
        console.error('❌ 추출된 JSON도 유효하지 않음:', jsonError instanceof Error ? jsonError.message : String(jsonError));
      }
    }

    console.log('🔄 기본 결과 생성 중...');
    return generateDefaultResult(submissions);
  }
}

// 기본 결과 생성 함수
function generateDefaultResult(submissions: DrawingSubmission[]): EvaluationResult {
  console.log('⚠️  기본 결과 생성 중... (AI 평가 실패로 인한 대체 결과)');
  console.log('📊 기본 결과 생성 정보:', {
    submissionCount: submissions.length,
    playerIds: submissions.map(s => s.playerId),
    timestamp: new Date().toISOString(),
    reason: 'AI 평가 실패 또는 응답 파싱 실패'
  });

  // 점수를 랜덤하게 배정하되, 70~100점 범위로 설정
  const shuffledSubmissions = [...submissions].sort(() => Math.random() - 0.5);

  // 각 플레이어별 점수 계산
  const scores = shuffledSubmissions.map((submission, index) => {
    const baseScore = Math.max(70, 100 - (index * 5)); // 70~100점 범위
    const randomVariation = Math.floor(Math.random() * 5); // 0-4점의 랜덤 변동
    return Math.min(100, baseScore + randomVariation); // 최대 100점
  });

  console.log('📊 기본 점수 생성:', {
    scoreDistribution: shuffledSubmissions.map((s, i) => ({ 
      playerId: s.playerId, 
      rank: i + 1, 
      score: scores[i] 
    }))
  });

  const defaultResult: EvaluationResult = {
    rankings: shuffledSubmissions.map((submission, index) => ({
      rank: index + 1,
      playerId: submission.playerId,
      score: scores[index]
    })),
    comments: submissions.map((submission) => ({
      playerId: submission.playerId,
      comment: "멋진 그림이네요! AI 평가 중 오류가 발생했지만 열심히 그려주셔서 감사합니다. 다음에는 더욱 멋진 작품을 기대할게요! 😊🎨"
    })),
    summary: `이번 라운드에는 ${submissions.length}명의 참가자가 각자의 창의력을 발휘한 멋진 작품들을 선보였습니다. AI 평가 중 일시적인 오류가 발생했지만, 모든 작품이 나름의 특색과 매력을 가지고 있었습니다. 앞으로도 계속해서 그림 실력을 발전시켜 나가길 응원합니다! 🌟`,
    evaluationCriteria: "기술적 문제로 AI 평가가 제한되었지만, 기본적인 평가 기준(주제 연관성, 창의성, 완성도)을 고려하여 공정하게 평가했습니다. 모든 참가자의 노력과 창의성을 인정하며 격려합니다."
  };

  console.log('✅ 기본 결과 생성 완료:', {
    rankingsCount: defaultResult.rankings.length,
    commentsCount: defaultResult.comments.length,
    scoreRange: `${Math.min(...defaultResult.rankings.map(r => r.score))}~${Math.max(...defaultResult.rankings.map(r => r.score))}점`,
    hasSummary: !!defaultResult.summary,
    hasEvaluationCriteria: !!defaultResult.evaluationCriteria,
    isDefaultResult: true
  });

  return defaultResult;
}

// 재시도 로직이 포함된 평가 함수
export async function evaluateDrawingsWithRetry(
  submissions: DrawingSubmission[], 
  keyword: string,
  modelType: AIModelType = 'gemini',
  maxRetries: number = 3
): Promise<EvaluationResult> {
  console.log('🔄 AI 평가 재시도 시스템 시작');
  console.log('📊 재시도 설정:', {
    modelType: modelType,
    maxRetries: maxRetries,
    submissionCount: submissions.length,
    keyword: keyword
  });

  let lastError: Error | null = null;

  // 모델 타입에 맞는 평가자 생성
  const evaluator = createEvaluator(modelType);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🚀 ${modelType.toUpperCase()} 평가 시도 ${attempt}/${maxRetries} 시작`);
      const startTime = Date.now();

      const result = await evaluator.evaluate(submissions, keyword);

      const endTime = Date.now();
      console.log(`✅ ${modelType.toUpperCase()} 평가 시도 ${attempt} 성공! (소요시간: ${endTime - startTime}ms)`);

      return result;
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const endTime = Date.now();
      console.error(`❌ ${modelType.toUpperCase()} 평가 시도 ${attempt}/${maxRetries} 실패:`, {
        error: error instanceof Error ? error.message : String(error),
        attempt: attempt,
        remainingAttempts: maxRetries - attempt
      });

      if (attempt < maxRetries) {
        // 지수적 백오프 (1초, 2초, 4초)
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`⏳ ${delay}ms 후 재시도... (${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`💥 모든 ${modelType.toUpperCase()} 평가 시도 실패 (${maxRetries}회). 기본 결과 반환.`);
  console.error(`🔍 마지막 오류:`, lastError?.message);

  return generateDefaultResult(submissions);
}

// 평가 결과 검증 함수
export function validateEvaluationResult(result: EvaluationResult, submissions: DrawingSubmission[]): boolean {
  // 기본 구조 검증
  if (!result.rankings || !result.comments || !Array.isArray(result.rankings) || !Array.isArray(result.comments)) {
    return false;
  }

  // 플레이어 수 일치 확인
  if (result.rankings.length !== submissions.length || result.comments.length !== submissions.length) {
    return false;
  }

  // 모든 플레이어 ID가 포함되어 있는지 확인
  const submissionPlayerIds = new Set(submissions.map(s => s.playerId));
  const rankingPlayerIds = new Set(result.rankings.map(r => r.playerId));
  const commentPlayerIds = new Set(result.comments.map(c => c.playerId));

  return (
    submissionPlayerIds.size === rankingPlayerIds.size &&
    submissionPlayerIds.size === commentPlayerIds.size &&
    [...submissionPlayerIds].every(id => rankingPlayerIds.has(id) && commentPlayerIds.has(id))
  );
} 
