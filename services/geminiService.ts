
import { GoogleGenAI } from "@google/genai";
import { Borrower, Loan } from "../types";

export const getRiskAssessment = async (borrower: Borrower, loans: Loan[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Atue como um analista de crédito sênior.
    Analise o seguinte cliente e seu histórico para fornecer um parecer técnico de risco.
    
    Cliente: ${borrower.name}
    Score Interno: ${borrower.score}/100
    CPF: ${borrower.cpf}
    Contatos de Emergência: ${borrower.emergencyContacts.length} cadastrados.
    
    Histórico de Empréstimos:
    ${loans.map(l => `- Valor: R$${l.principalAmount}, Status: ${l.status}, Saldo Devedor: R$${l.remainingPrincipal}`).join('\n')}

    Forneça uma análise resumida em 3 parágrafos sobre a confiabilidade e sugestões de limite de crédito futuro.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Não foi possível gerar a análise no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao processar análise de risco.";
  }
};
