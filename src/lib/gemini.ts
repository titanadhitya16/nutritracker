import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getNutritionAdvice(meals: string[], calories: number, target: number) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: `Saya telah makan: ${meals.join(', ')}. Total kalori hari ini adalah ${calories} kkal (target ${target} kkal). Berikan saran singkat (maksimal 2 kalimat) dalam bahasa Indonesia tentang pola makan saya hari ini agar tetap sehat. Berikan nuansa ahli gizi yang ramah dan profesional.` }
          ]
        }
      ]
    });

    return response.text || "Terus pantau asupanmu!";
  } catch (error) {
    console.error("Advice failed:", error);
    return "Gagal mendapatkan saran AI.";
  }
}

export async function getMealSuggestion(remainingCalories: number, timeOfDay: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: `Saya memiliki sisa kuota ${remainingCalories} kkal untuk hari ini. Sekarang waktu ${timeOfDay}. Berikan 1 ide menu makanan sehat (khususnya masakan Indonesia jika memungkinkan) yang sesuai. Jelaskan singkat mengapa menu ini cocok (maksimal 2 kalimat).` }
          ]
        }
      ]
    });

    return response.text || "Cobalah salad buah atau sayuran segar.";
  } catch (error) {
    console.error("Suggestion failed:", error);
    return "Gagal mendapatkan ide menu.";
  }
}

export async function estimateCaloriesFromText(text: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: `Kamu adalah ahli gizi. Analisis teks ini: "${text}". Berikan nama makanan, perkiraan kalori (kkal), protein (g), karbohidrat (g), dan lemak (g). Jika teks menyebutkan jumlah porsi (misal: "2 porsi"), sesuaikan hitungannya. Jika tidak disebutkan, anggap 1 porsi standar. Harap merespons menggunakan skema JSON yang diminta.` }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            calories: { type: Type.INTEGER },
            protein: { type: Type.INTEGER },
            carbs: { type: Type.INTEGER },
            fat: { type: Type.INTEGER }
          },
          required: ["name", "calories", "protein", "carbs", "fat"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as { name: string; calories: number; protein: number; carbs: number; fat: number };
    }
    throw new Error("No response from AI");
  } catch (error) {
    console.error("Failed to estimate calories from text:", error);
    throw error;
  }
}

export async function estimateCaloriesFromImage(base64Image: string, mimeType: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: "Kamu adalah ahli gizi yang sangat akurat. Analisis gambar makanan ini. Berikan nama deskriptif singkat untuk makanan tersebut (dalam bahasa Indonesia). Perkirakan total kalori seakurat dan serealistis mungkin berdasarkan porsi standar. Dan perkirakan juga makronutrisi (protein, karbohidrat, lemak dalam gram). Sebagai panduan porsi makanan Indonesia: Nasi Putih (1 porsi/centong) ~150 kkal, Ayam Goreng/Bakar (1 potong) ~250-350 kkal (Kremes/Geprek ~300-450 kkal), Tempe/Tahu Goreng ~50-80 kkal, Telur Goreng ~100-130 kkal, Sambal (1 sdm) ~20-50 kkal, Sayuran/Lalapan mentah < 50 kkal. Jangan melebih-lebihkan kalori; sebagian besar makanan porsi lengkap orang Indonesia berkisar 400 hingga 750 kkal kecuali porsi sangat besar. Harap merespons menggunakan skema JSON yang diminta." },
            {
              inlineData: {
                data: base64Image,
                mimeType,
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "Nama deskriptif singkat untuk makanan yang diidentifikasi dalam bahasa Indonesia."
            },
            calories: {
              type: Type.INTEGER,
              description: "Perkiraan total kandungan kalori dalam kkal."
            },
            protein: {
              type: Type.INTEGER,
              description: "Perkiraan kandungan protein dalam gram."
            },
            carbs: {
              type: Type.INTEGER,
              description: "Perkiraan kandungan karbohidrat dalam gram."
            },
            fat: {
              type: Type.INTEGER,
              description: "Perkiraan kandungan lemak dalam gram."
            }
          },
          required: ["name", "calories", "protein", "carbs", "fat"]
        }
      }
    });

    if (response.text) {
      const result = JSON.parse(response.text);
      return result as { name: string; calories: number; protein: number; carbs: number; fat: number };
    }
    throw new Error("No response from AI");
  } catch (error) {
    console.error("Failed to estimate calories:", error);
    throw error;
  }
}
