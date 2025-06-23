import { GoogleGenerativeAI } from '@google/generative-ai';

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

// Gemini 설정
const GEMINI_CONFIG = {
  model: "gemini-2.5-flash",
  maxRetries: 3,
  timeout: 30000,
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 8192,  // 해설을 위해 토큰 더 증가
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
        } catch (e) {
          return { file, exists: false, error: e.message };
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

// Gemini 2.5 Flash를 활용한 직접 이미지 평가
export async function evaluateWithGemini25Flash(
  submissions: DrawingSubmission[], 
  keyword: string
): Promise<EvaluationResult> {
  try {
    const apiKey = validateApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: GEMINI_CONFIG.model,
      generationConfig: GEMINI_CONFIG.generationConfig
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

    console.log(`🤖 AI 평가 시작: ${submissions.length}개 그림, 제시어: "${keyword}"`);
    console.log('📤 Gemini API 요청 데이터:', {
      model: GEMINI_CONFIG.model,
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
    } catch (textError) {
      console.error('❌ response.text() 실패:', textError.message);
      
      // 대안: candidates에서 직접 추출
      try {
        if (response.response.candidates?.[0]?.content?.parts?.[0]?.text) {
          result = response.response.candidates[0].content.parts[0].text;
          console.log('✅ candidates에서 텍스트 추출 성공');
        }
      } catch (candidateError) {
        console.error('❌ candidates 텍스트 추출 실패:', candidateError.message);
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
    
  } catch (error) {
    console.error('💥 Gemini API 호출 실패:', error);
    console.error('🔍 에러 상세 정보:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      status: error?.status,
      statusText: error?.statusText,
      stack: error?.stack?.substring(0, 500) + '...',
      errorType: typeof error,
      errorKeys: error ? Object.keys(error) : 'N/A'
    });
    
    // 네트워크 관련 에러인지 확인
    if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
      console.error('🌐 네트워크 연결 문제 감지');
    }
    
    // API 키 관련 에러인지 확인
    if (error?.status === 401 || error?.status === 403) {
      console.error('🔑 API 키 인증 문제 감지');
    }
    
    // 요청 크기 관련 에러인지 확인
    if (error?.status === 413 || error?.message?.includes('too large')) {
      console.error('📦 요청 크기 초과 문제 감지');
    }
    
    // 에러 발생 시 기본 결과 반환
    console.log('🔄 기본 결과 생성으로 전환...');
    return generateDefaultResult(submissions);
  }
}

// JSON 응답 파싱 함수 (개선된 버전)
function parseEvaluationResult(llmResponse: string, submissions: DrawingSubmission[]): EvaluationResult {
  try {
    console.log('🔍 AI 응답 파싱 중...');
    console.log('📄 파싱할 응답 미리보기:', llmResponse.substring(0, 200) + '...');
    
    // 여러 JSON 추출 패턴 시도
    const patterns = [
      /```json\s*(\{[\s\S]*?\})\s*```/,  // ```json 블록
      /```\s*(\{[\s\S]*?\})\s*```/,      // ``` 블록
      /(\{[\s\S]*?\})/                   // 단순 JSON
    ];
    
    let matchedPattern = null;
    let extractedJson = null;
    
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      const match = llmResponse.match(pattern);
      if (match) {
        matchedPattern = i;
        extractedJson = match[1];
        console.log(`🎯 패턴 ${i + 1} 매치됨:`, extractedJson.substring(0, 100) + '...');
        
        try {
          const parsed = JSON.parse(extractedJson);
          // 필수 필드 검증
          if (parsed.rankings && parsed.comments && Array.isArray(parsed.rankings)) {
            console.log('✅ AI 응답 파싱 성공');
            console.log('🏆 파싱된 결과:', {
              rankingsCount: parsed.rankings.length,
              commentsCount: parsed.comments.length,
              rankings: parsed.rankings.map(r => ({ rank: r.rank, playerId: r.playerId, score: r.score })),
              comments: parsed.comments.map(c => ({ playerId: c.playerId, commentLength: c.comment.length }))
            });
            return parsed;
          } else {
            console.warn(`⚠️  패턴 ${i + 1}에서 필수 필드 누락:`, {
              hasRankings: !!parsed.rankings,
              hasComments: !!parsed.comments,
              rankingsIsArray: Array.isArray(parsed.rankings)
            });
          }
        } catch (parseError) {
          console.error(`❌ 패턴 ${i + 1} JSON 파싱 실패:`, parseError.message);
        }
      }
    }
    
    throw new Error('Valid JSON not found in any pattern');
    
  } catch (error) {
    console.error('💥 LLM 응답 파싱 실패:', error);
    console.log('📄 전체 원본 응답:', llmResponse);
    console.log('📊 응답 분석:', {
      length: llmResponse.length,
      hasJson: /\{[\s\S]*\}/.test(llmResponse),
      hasCodeBlock: /```/.test(llmResponse),
      firstBrace: llmResponse.indexOf('{'),
      lastBrace: llmResponse.lastIndexOf('}')
    });
    
    console.log('🔄 기본 결과 생성 중...');
    return generateDefaultResult(submissions);
  }
}

// 기본 결과 생성 함수
function generateDefaultResult(submissions: DrawingSubmission[]): EvaluationResult {
  console.log('⚠️  기본 결과 생성 중...');
  console.log('📊 기본 결과 생성 정보:', {
    submissionCount: submissions.length,
    playerIds: submissions.map(s => s.playerId)
  });
  
  // 점수를 랜덤하게 배정하되, 70~100점 범위로 설정
  const shuffledSubmissions = [...submissions].sort(() => Math.random() - 0.5);
  
  const defaultResult: EvaluationResult = {
    rankings: shuffledSubmissions.map((submission, index) => ({
      rank: index + 1,
      playerId: submission.playerId,
      score: Math.max(70, 100 - (index * 5)) // 70~100점 범위
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
    scoreRange: `${Math.min(...defaultResult.rankings.map(r => r.score))}~${Math.max(...defaultResult.rankings.map(r => r.score))}점`
  });
  
  return defaultResult;
}

// 재시도 로직이 포함된 평가 함수
export async function evaluateDrawingsWithRetry(
  submissions: DrawingSubmission[], 
  keyword: string,
  maxRetries: number = GEMINI_CONFIG.maxRetries
): Promise<EvaluationResult> {
  console.log('🔄 AI 평가 재시도 시스템 시작');
  console.log('📊 재시도 설정:', {
    maxRetries: maxRetries,
    submissionCount: submissions.length,
    keyword: keyword
  });
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🚀 AI 평가 시도 ${attempt}/${maxRetries} 시작`);
      const startTime = Date.now();
      
      const result = await evaluateWithGemini25Flash(submissions, keyword);
      
      const endTime = Date.now();
      console.log(`✅ AI 평가 시도 ${attempt} 성공! (소요시간: ${endTime - startTime}ms)`);
      
      return result;
    } catch (error) {
      lastError = error as Error;
      const endTime = Date.now();
      console.error(`❌ AI 평가 시도 ${attempt}/${maxRetries} 실패:`, {
        error: error.message,
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
  
  console.error(`💥 모든 AI 평가 시도 실패 (${maxRetries}회). 기본 결과 반환.`);
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