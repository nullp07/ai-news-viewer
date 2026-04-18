import type { Article, ReviewedArticle } from "./types";

export const mockSearchResults: Article[] = [
  {
    id: "1",
    title: "EU Proposes Landmark AI Regulation Framework for 2025",
    description:
      "The European Union has unveiled a comprehensive regulatory framework for artificial intelligence that could reshape how tech companies operate globally. The proposal includes strict guidelines for high-risk AI systems and mandatory transparency requirements.",
    url: "https://example.com/eu-ai-regulation",
    source: "Reuters",
    publishedAt: "2024-01-15T10:30:00Z",
  },
  {
    id: "2",
    title: "OpenAI Announces GPT-5 with Enhanced Reasoning Capabilities",
    description:
      "OpenAI has revealed its next-generation language model, GPT-5, featuring significant improvements in logical reasoning, mathematical problem-solving, and reduced hallucinations. The model is expected to launch in Q2 2024.",
    url: "https://example.com/openai-gpt5",
    source: "TechCrunch",
    publishedAt: "2024-01-14T15:45:00Z",
  },
  {
    id: "3",
    title: "Google DeepMind Achieves Breakthrough in Protein Structure Prediction",
    description:
      "DeepMind's AlphaFold 3 has demonstrated unprecedented accuracy in predicting protein structures, potentially accelerating drug discovery by years. Scientists call it a 'transformative moment' for biomedical research.",
    url: "https://example.com/deepmind-alphafold",
    source: "Nature",
    publishedAt: "2024-01-13T09:00:00Z",
  },
  {
    id: "4",
    title: "AI Startup Funding Hits Record $50 Billion in 2024",
    description:
      "Venture capital investment in artificial intelligence companies has reached an all-time high, with generative AI startups capturing the lion's share of funding. Major players include infrastructure, healthcare AI, and autonomous systems.",
    url: "https://example.com/ai-funding",
    source: "Bloomberg",
    publishedAt: "2024-01-12T14:20:00Z",
  },
];

export const mockAnalyzedArticles: ReviewedArticle[] = [
  {
    id: "5",
    title: "Microsoft Integrates AI Copilot Across All Enterprise Products",
    description:
      "Microsoft announces the integration of AI Copilot across its entire enterprise suite, including Office 365, Azure, and Dynamics 365.",
    url: "https://example.com/microsoft-copilot",
    source: "The Verge",
    publishedAt: "2024-01-10T11:00:00Z",
    analysis: {
      summary:
        "Microsoft is rolling out AI Copilot integration across all enterprise products, marking a significant shift in how businesses will interact with productivity software. The move positions Microsoft as a leader in enterprise AI adoption, with analysts predicting substantial productivity gains for organizations that embrace the technology. However, concerns about data privacy and the learning curve for employees remain.",
      sentiment: "positive",
      sentimentScore: 0.78,
    },
    analyzedAt: "2024-01-15T08:30:00Z",
  },
  {
    id: "6",
    title: "AI-Generated Content Raises Concerns Among Academic Publishers",
    description:
      "Major academic publishers express concerns over the increasing use of AI-generated content in research papers and peer review processes.",
    url: "https://example.com/ai-academic-concerns",
    source: "Science",
    publishedAt: "2024-01-09T16:30:00Z",
    analysis: {
      summary:
        "Academic publishers are grappling with the rise of AI-generated content in scholarly work. While AI tools can assist with research and writing, there are growing concerns about authenticity, plagiarism, and the integrity of peer review. Several major journals have implemented AI detection tools, though their effectiveness remains debated. The academic community is divided on how to balance innovation with maintaining research standards.",
      sentiment: "neutral",
      sentimentScore: 0.45,
    },
    analyzedAt: "2024-01-14T20:15:00Z",
  },
  {
    id: "7",
    title: "China's AI Industry Faces Setback Amid Export Restrictions",
    description:
      "New US export controls on advanced semiconductors create significant challenges for Chinese AI companies developing large language models.",
    url: "https://example.com/china-ai-restrictions",
    source: "Financial Times",
    publishedAt: "2024-01-08T08:45:00Z",
    analysis: {
      summary:
        "US export restrictions on advanced chips are severely impacting China's AI development capabilities. Major Chinese tech firms report difficulties in training large language models due to limited access to cutting-edge GPUs. The restrictions have forced companies to explore domestic chip alternatives, though these currently lag behind in performance. Analysts predict this could delay China's AI progress by several years.",
      sentiment: "negative",
      sentimentScore: 0.23,
    },
    analyzedAt: "2024-01-13T12:00:00Z",
  },
];

// Simulated API functions
export async function searchArticles(query: string): Promise<Article[]> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  
  if (!query.trim()) {
    return [];
  }
  
  // Filter mock results based on query (simple simulation)
  const lowerQuery = query.toLowerCase();
  return mockSearchResults.filter(
    (article) =>
      article.title.toLowerCase().includes(lowerQuery) ||
      article.description.toLowerCase().includes(lowerQuery) ||
      article.source.toLowerCase().includes(lowerQuery)
  );
}

export async function analyzeArticle(article: Article): Promise<ReviewedArticle> {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  
  // Generate mock analysis
  const sentiments: Array<"positive" | "neutral" | "negative"> = ["positive", "neutral", "negative"];
  const randomSentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
  
  const sentimentScores = {
    positive: 0.65 + Math.random() * 0.3,
    neutral: 0.4 + Math.random() * 0.2,
    negative: 0.1 + Math.random() * 0.3,
  };
  
  return {
    ...article,
    analysis: {
      summary: `Analysis of "${article.title}": This article discusses significant developments in the AI industry. The coverage is comprehensive and provides valuable insights into current trends and future implications. Key stakeholders and experts are quoted, lending credibility to the reporting. The article's impact on the broader tech ecosystem could be substantial.`,
      sentiment: randomSentiment,
      sentimentScore: parseFloat(sentimentScores[randomSentiment].toFixed(2)),
    },
    analyzedAt: new Date().toISOString(),
  };
}

export async function fetchAnalyzedArticles(): Promise<ReviewedArticle[]> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockAnalyzedArticles;
}
