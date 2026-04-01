// lib/trending.ts
import connectDB from "@/lib/db";
import BillVoteEvent from "@/models/BillVoteEvent";
import Bill from "@/models/Bill";

const HALF_LIFE_HOURS = 24;
const LAMBDA = Math.LN2 / HALF_LIFE_HOURS;

interface TrendingBill {
  billSlug: string;
  congress: string;
  title: string;
  trendingScore: number;
  totalVotes: number;
}

interface TopBill {
  billSlug: string;
  congress: string;
  title: string;
  voteCount: number;
}

/**
 * Get trending bills ranked by engagement velocity with exponential time decay.
 * Score = sum of e^(-λ * hoursAgo) for each vote event.
 */
export async function getTrendingBills(limit = 20): Promise<TrendingBill[]> {
  await connectDB();

  const now = new Date();
  const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const events = await BillVoteEvent.find({ votedAt: { $gte: cutoff } })
    .select("billSlug congress votedAt")
    .lean();

  const scoreMap = new Map<string, { congress: string; score: number; count: number }>();

  for (const event of events) {
    const hoursAgo = (now.getTime() - new Date(event.votedAt).getTime()) / (1000 * 60 * 60);
    const contribution = Math.exp(-LAMBDA * hoursAgo);
    const existing = scoreMap.get(event.billSlug);
    if (existing) {
      existing.score += contribution;
      existing.count++;
    } else {
      scoreMap.set(event.billSlug, {
        congress: event.congress,
        score: contribution,
        count: 1,
      });
    }
  }

  const sorted = [...scoreMap.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, limit);

  if (sorted.length === 0) return [];

  const slugs = sorted.map(([slug]) => slug);
  const bills = await Bill.find({ billSlug: { $in: slugs } })
    .select("billSlug congress title")
    .lean();
  const titleMap = new Map(bills.map((b) => [b.billSlug, { title: b.title, congress: b.congress }]));

  return sorted.map(([slug, data]) => ({
    billSlug: slug,
    congress: titleMap.get(slug)?.congress || data.congress,
    title: titleMap.get(slug)?.title || slug,
    trendingScore: Math.round(data.score * 100) / 100,
    totalVotes: data.count,
  }));
}

/**
 * Get top bills by total vote count within a time period.
 */
export async function getTopBills(
  period: "day" | "week" | "month" | "year",
  limit = 50
): Promise<TopBill[]> {
  await connectDB();

  const now = new Date();
  const periodMs: Record<string, number> = {
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
  };
  const cutoff = new Date(now.getTime() - periodMs[period]);

  const results = await BillVoteEvent.aggregate([
    { $match: { votedAt: { $gte: cutoff } } },
    { $group: { _id: "$billSlug", congress: { $first: "$congress" }, voteCount: { $sum: 1 } } },
    { $sort: { voteCount: -1 } },
    { $limit: limit },
  ]);

  if (results.length === 0) return [];

  const slugs = results.map((r: { _id: string }) => r._id);
  const bills = await Bill.find({ billSlug: { $in: slugs } })
    .select("billSlug congress title")
    .lean();
  const titleMap = new Map(bills.map((b) => [b.billSlug, { title: b.title, congress: b.congress }]));

  return results.map((r: { _id: string; congress: string; voteCount: number }) => ({
    billSlug: r._id,
    congress: titleMap.get(r._id)?.congress || r.congress,
    title: titleMap.get(r._id)?.title || r._id,
    voteCount: r.voteCount,
  }));
}
