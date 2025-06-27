import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { category, subcategory } = await request.json();

    if (!category || !subcategory) {
      return NextResponse.json(
        { error: 'Category and subcategory are required' },
        { status: 400 }
      );
    }

    // Build the prompt for 3 shorter options based only on category and subcategory
    const prompt = `You are generating incident reports for ${category} - ${subcategory}.

Write exactly 3 short, realistic incident descriptions that customers would report for this specific category and subcategory.

Requirements:
- Each description: 20-35 words maximum
- Write direct incident reports (what the customer is experiencing)
- NO meta-text like "Here are three" or "Option 1"
- Focus specifically on ${category} and ${subcategory} issues
- Sound like real customer complaints
- Be professional but direct

Separate each description with exactly: |||

Example format (for Water Pollution/Chemical Contamination):
Strange chemical smell coming from water taps. Water appears cloudy and has unusual taste requiring immediate investigation.|||Water supply contaminated with unknown substance. Strong odor and discoloration noticed when running taps.|||Chemical contamination suspected in water system. Residents reporting bad taste and smell from all water outlets.

Now write 3 realistic incident descriptions for ${category} - ${subcategory}:`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama3-8b-8192",
      temperature: 0.6,
      max_tokens: 200,
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content generated');
    }

    // Split the content by ||| to get 3 descriptions
    let descriptions = content.split('|||').map(desc => desc.trim()).filter(desc => desc.length > 0);

    // Clean each description to remove any meta-text
    descriptions = descriptions.map(desc => {
      // Remove common meta-text patterns
      desc = desc.replace(/^(Option \d+:|Here are three|Description \d+:)/i, '').trim();
      desc = desc.replace(/^(Here are|Below are|The following)/i, '').trim();
      desc = desc.replace(/incident descriptions?:?/i, '').trim();
      return desc;
    }).filter(desc => desc.length > 10);

    // Ensure we have exactly 3 descriptions
    if (descriptions.length < 3) {
      // Fallback descriptions specific to the category/subcategory
      const fallbackMap: Record<string, string[]> = {
        'Water Pollution': [
          'Water supply showing signs of contamination with unusual odor and discoloration requiring immediate testing.',
          'Chemical smell detected in water system affecting multiple properties in the area.',
          'Water quality concerns raised due to strange taste and appearance from taps.'
        ],
        'Drainage': [
          'Blocked drain causing water backup and potential flooding in affected area.',
          'Drainage system not functioning properly leading to standing water accumulation.',
          'Sewage backup through drains creating unsanitary conditions requiring urgent attention.'
        ]
      };

      descriptions = fallbackMap[category] || [
        `${category} issue reported requiring immediate attention and assessment by technical team.`,
        `Problem with ${category.toLowerCase()} system affecting normal operations and requiring urgent repair.`,
        `${category} related incident causing disruption and needing prompt resolution by maintenance crew.`
      ];
    }

    // Return the 3 descriptions
    return NextResponse.json({
      descriptions: descriptions.slice(0, 3) // Take only first 3
    });

  } catch (error) {
    console.error('Groq AI Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate descriptions' },
      { status: 500 }
    );
  }
}
