import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

const MODEL_NAME = "gemini-1.5-flash";

async function fileToGenerativePart(base64: string, mimeType: string) {
  return {
    inlineData: {
      data: base64,
      mimeType,
    },
  };
}

export async function scoreDrawing(
  base64ImageData: string,
  keyword: string
): Promise<{ score: number; feedback: string; reasoning: string }> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API Key is not set.");
    }
    console.log("🔑 Gemini API Key loaded: ✅ Present");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const generationConfig = {
      temperature: 0.2,
      topK: 32,
      topP: 1,
      maxOutputTokens: 2048,
    };

    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];

    const mimeType = "image/png";
    const imagePart = await fileToGenerativePart(
      base64ImageData.split(",")[1],
      mimeType
    );

    const prompt = `
      당신은 그림 실력을 평가하는 AI 심사위원입니다.
      - 사용자가 그린 그림이 제시어와 얼마나 유사한지 평가해주세요.
      - 평가는 100점 만점으로 하고, 반드시 점수만 숫자로 알려주세요.
      - 긍정적이고 격려하는 피드백을 한 문장으로 작성해주세요.
      - 왜 그렇게 점수를 주었는지, 어떤 점이 좋았고 어떤 점을 개선하면 좋을지에 대한 채점 근거를 두 문장으로 설명해주세요.

      제시어: ${keyword}

      출력 형식은 반드시 아래의 JSON 포맷을 따라주세요. 다른 설명은 절대 추가하지 마세요.
      {
        "score": <점수 (숫자)>,
        "feedback": "<한 문장 짜리 피드백>",
        "reasoning": "<두 문장으로 된 채점 근거>"
      }
    `;

    const parts = [prompt, imagePart];

    console.log("🤖 Gemini API 호출 중...");
    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig,
      safetySettings,
    });
    console.log("✅ Gemini API 호출 성공.");

    const responseText = result.response.text();
    const cleanedJsonString = responseText.replace(/```json|```/g, "").trim();

    console.log("📝 Gemini API Raw 응답:", cleanedJsonString);
    const parsedResponse = JSON.parse(cleanedJsonString);

    if (
      typeof parsedResponse.score !== "number" ||
      typeof parsedResponse.feedback !== "string" ||
      typeof parsedResponse.reasoning !== "string"
    ) {
      throw new Error("Gemini API로부터 잘못된 형식의 응답을 받았습니다.");
    }

    return parsedResponse;
  } catch (error) {
    console.error("🚫 scoreDrawing 함수 오류:", error);
    return {
      score: 0,
      feedback: "AI 채점에 실패했습니다. 다시 시도해주세요.",
      reasoning:
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다.",
    };
  }
}
