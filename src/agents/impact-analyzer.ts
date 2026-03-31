import Anthropic from "@anthropic-ai/sdk";
import type { Env } from "../config.js";
import type { IssueClassification } from "./orchestrator.js";

export interface ImpactReport {
  issueNumber: number;
  affectedFiles: string[];
  relatedCode: string[];
  severity: "low" | "medium" | "high" | "critical";
  analysis: string;
  suggestedFix: string;
}

interface IssueInput {
  number: number;
  title: string;
  body: string | null;
}

/**
 * 影響調査エージェント: 変更対象ファイル・関連コードを特定し影響範囲レポートを作成
 */
export async function analyzeImpact(
  config: Env,
  issue: IssueInput,
  classification: IssueClassification
): Promise<ImpactReport> {
  const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: `あなたはSaaSプロダクトのコードベースを分析する影響調査エージェントです。
issueの内容を読んで、影響範囲を分析し、以下のJSON形式で回答してください:

{
  "affectedFiles": ["影響を受けるファイルパスの配列"],
  "relatedCode": ["関連するコード領域の説明"],
  "severity": "low|medium|high|critical",
  "analysis": "影響範囲の分析結果",
  "suggestedFix": "修正方針の提案"
}

severity基準:
- critical: サービス停止、データ損失
- high: 主要機能が使えない
- medium: 一部機能に影響
- low: 軽微な表示崩れ等`,
    messages: [
      {
        role: "user",
        content: `Issue #${issue.number}
Title: ${issue.title}
Body: ${issue.body ?? "(本文なし)"}
Classification: ${classification.type} (confidence: ${classification.confidence})
Reasoning: ${classification.reasoning}`,
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
      issueNumber: issue.number,
      affectedFiles: result.affectedFiles ?? [],
      relatedCode: result.relatedCode ?? [],
      severity: result.severity ?? "medium",
      analysis: result.analysis ?? "",
      suggestedFix: result.suggestedFix ?? "",
    };
  } catch {
    return {
      issueNumber: issue.number,
      affectedFiles: [],
      relatedCode: [],
      severity: "medium",
      analysis: "影響分析に失敗しました。手動確認が必要です。",
      suggestedFix: "",
    };
  }
}
