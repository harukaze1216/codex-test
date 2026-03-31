import Anthropic from "@anthropic-ai/sdk";
import type { Env } from "../config.js";

export interface IssueClassification {
  type: "bug" | "feature" | "unknown";
  confidence: number;
  reasoning: string;
  suggestedLabels: string[];
}

interface IssueInput {
  number: number;
  title: string;
  body: string | null;
  labels: Array<{ name: string }>;
}

const BUG_KEYWORDS = ["動かない", "エラー", "できない", "表示されない", "落ちる", "クラッシュ", "バグ", "不具合"];
const FEATURE_KEYWORDS = ["ほしい", "追加", "要望", "改善", "機能", "リクエスト"];

/**
 * オーケストレーター: Issue内容を分析してbug/featureを判定する
 */
export async function classifyIssue(
  config: Env,
  issue: IssueInput
): Promise<IssueClassification> {
  // ラベルベースの高速判定
  const labelNames = issue.labels.map((l) => l.name);
  if (labelNames.includes("bug")) {
    return {
      type: "bug",
      confidence: 1.0,
      reasoning: "bugラベルが付与されている",
      suggestedLabels: ["bug"],
    };
  }
  if (labelNames.includes("enhancement") || labelNames.includes("feature")) {
    return {
      type: "feature",
      confidence: 1.0,
      reasoning: "enhancement/featureラベルが付与されている",
      suggestedLabels: labelNames,
    };
  }

  // キーワードベースの判定
  const text = `${issue.title} ${issue.body ?? ""}`;
  const hasBugKeyword = BUG_KEYWORDS.some((kw) => text.includes(kw));
  const hasFeatureKeyword = FEATURE_KEYWORDS.some((kw) => text.includes(kw));

  if (hasBugKeyword && !hasFeatureKeyword) {
    return {
      type: "bug",
      confidence: 0.8,
      reasoning: `キーワード検出による判定`,
      suggestedLabels: ["bug"],
    };
  }
  if (hasFeatureKeyword && !hasBugKeyword) {
    return {
      type: "feature",
      confidence: 0.8,
      reasoning: `キーワード検出による判定`,
      suggestedLabels: ["enhancement"],
    };
  }

  // AI判定（キーワードで判断できない場合）
  return classifyWithAI(config, issue);
}

async function classifyWithAI(
  config: Env,
  issue: IssueInput
): Promise<IssueClassification> {
  const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: `あなたはSaaSプロダクトのissueを分類するAIです。
issueの内容を読んで、以下の3つに分類してください:
- bug: バグ・不具合の報告
- feature: 機能要望・改善提案
- unknown: 判断できない

JSON形式で回答してください:
{"type": "bug"|"feature"|"unknown", "confidence": 0.0-1.0, "reasoning": "判定理由"}`,
    messages: [
      {
        role: "user",
        content: `Issue #${issue.number}\nTitle: ${issue.title}\nBody: ${issue.body ?? "(本文なし)"}`,
      },
    ],
  });

  try {
    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");

    const result = JSON.parse(jsonMatch[0]);
    return {
      type: result.type,
      confidence: result.confidence,
      reasoning: result.reasoning,
      suggestedLabels:
        result.type === "bug"
          ? ["bug"]
          : result.type === "feature"
            ? ["enhancement"]
            : ["needs-triage"],
    };
  } catch {
    return {
      type: "unknown",
      confidence: 0,
      reasoning: "AI分類に失敗",
      suggestedLabels: ["needs-triage"],
    };
  }
}
