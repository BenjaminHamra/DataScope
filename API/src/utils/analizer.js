import natural from 'natural';

const tokenizer = new natural.WordTokenizer();

/**
 * Cuenta sílabas con reglas de diptongos básicas para mayor precisión en español
 */
const countSpanishSyllables = (word) => {
    word = word.toLowerCase().trim().replace(/[^a-zñáéíóúü]/g, '');
    if (word.length <= 3) return 1;
    
    // Regex mejorada para capturar núcleos vocálicos en español
    const matches = word.match(/[aeiouáéíóúü]{1,2}/g);
    return matches ? matches.length : 1;
};

export const analyzeSpanishText = (text) => {
    if (!text || typeof text !== 'string') throw new Error("Contenido no válido");

    // 1. Limpieza y Segmentación
    const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 4);
    const words = tokenizer.tokenize(text);
    
    if (words.length === 0) return { error: "Texto vacío" };

    // 2. Análisis de complejidad
    let totalSyllables = 0;
    let complexWords = 0; // Palabras con 3+ sílabas

    words.forEach(word => {
        const s = countSpanishSyllables(word);
        totalSyllables += s;
        if (s >= 3) complexWords++;
    });

    const numSentences = sentences.length || 1;
    const numWords = words.length;

    // 3. Cálculo de Índice Inflesz (Adaptación moderna)
    // Siquiera el Índice Szigriszt-Pazos, muy similar a Flesch
    const L = numWords / numSentences;
    const S = (totalSyllables / numWords) * 100;
    const score = 206.84 - (1.02 * L) - (0.60 * S);

    // 4. Factor de corrección por "Palabras Polisílabas"
    // Si más del 20% de las palabras son complejas, bajamos el score manualmente
    const complexPercentage = (complexWords / numWords) * 100;
    let adjustedScore = score;
    if (complexPercentage > 20) adjustedScore -= 5; 

    return {
        metrics: {
            sentences: numSentences,
            words: numWords,
            syllables: totalSyllables,
            complexWordsPercentage: `${complexPercentage.toFixed(1)}%`
        },
        readability: {
            score: parseFloat(adjustedScore.toFixed(2)),
            level: interpretInflesz(adjustedScore),
            isHighlyTechnical: complexPercentage > 30
        }
    };
};

/**
 * Escala Inflesz (Más estricta y moderna para español)
 */
function interpretInflesz(score) {
    if (score < 40) return "Muy Difícil (Científico/Especializado)";
    if (score < 55) return "Algo Difícil (Bachillerato/Universitario)";
    if (score < 65) return "Normal (Periodístico/Estándar)";
    if (score < 80) return "Bastante Fácil (Nivel Secundaria)";
    return "Muy Fácil (Primaria)";
}