/**
 * AI Deal Closing Assistant Configuration
 * Contains editable thresholds and prompts for Google Gemini API.
 */

export const STAGE_THRESHOLDS: Record<string, number> = {
  assigned: 5,      // Default threshold for new/assigned leads
  contacted: 3,     // Threshold for leads in contacted stage
  negotiating: 4,   // Threshold for leads in negotiating stage
};

export const GEMINI_CONFIG = {
  apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent',
};

export const SYSTEM_PROMPT = `You are a warm, professional sales assistant for Kairali Ayurvedic resorts.
Write a short WhatsApp/SMS follow-up message under 350 characters.
Tone: friendly, helpful, non-pushy. No fake discounts or invented facts.
Sign off with the representative name provided.`;

export function getPromptForStage(stage: string, context: { name: string; packageInterested?: string; notes?: string; quoteAmount?: number | null; daysStalled: number; representativeName?: string }): string {
  const { name, packageInterested = 'our packages', notes = '', quoteAmount, daysStalled, representativeName } = context;
  const repName = representativeName && representativeName !== 'unassigned' ? representativeName : 'Kairali Team';
  
  let stageDetails = '';
  if (stage === 'negotiating') {
    stageDetails = `The lead is in the negotiating stage. Draft a warm follow-up referencing their interest in "${packageInterested}" and checking if they have any questions or need further clarification on our previous discussion.`;
  } else if (stage === 'contacted') {
    stageDetails = `The lead was contacted but there has been no progress for ${daysStalled} days. Draft a gentle check-in nudge to see if they are still interested in "${packageInterested}" or if their requirements have changed.`;
  } else {
    stageDetails = `The lead was assigned to a representative ${daysStalled} days ago but no contact has been made. Draft a friendly initial outreach message to introduce ourselves and ask how we can assist them with "${packageInterested}".`;
  }
  
  if (notes) {
    stageDetails += `\nRefer to these latest call notes/remarks for context or objections (do not invent offers, just address their notes): "${notes}"`;
  }

  if (typeof quoteAmount === 'number' && quoteAmount > 0) {
    stageDetails += `\nThe quoted value is approximately ₹${Math.round(quoteAmount).toLocaleString('en-IN')}. If relevant, acknowledge it naturally without inventing discounts or changing the amount.`;
  }
  
  return `Client Name: ${name}
Package: ${packageInterested}
Days Stalled: ${daysStalled}
Stage: ${stage}
Representative Name: ${repName}

Instructions:
${stageDetails}

Draft the message now (under 400 characters, introducing yourself as "${repName}" from Kairali, no placeholders):`;
}
