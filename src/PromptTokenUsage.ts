import type {ThreadTokenUsage} from "./app-server/v2";
import {toTokenCount, type TokenCount} from "./TokenCount";

const fields = ["totalTokens", "inputTokens", "cachedInputTokens", "outputTokens", "reasoningOutputTokens"] as const;
export const ZERO_TOKEN_COUNT: TokenCount = {
    totalTokens: 0, inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningOutputTokens: 0,
};

/** Only cumulative, internally consistent totals can become a future baseline. */
export function isValidTokenTotal(total: TokenCount, previous: TokenCount | null = null): boolean {
    if (fields.some(field => !Number.isSafeInteger(total[field]) || total[field] < 0)
        || total.reasoningOutputTokens > total.outputTokens
        || total.totalTokens !== total.inputTokens + total.cachedInputTokens + total.outputTokens) {
        return false;
    }
    return previous === null || fields.every(field => total[field] >= previous[field]);
}

/** Usage observed during one ACP prompt. Context occupancy is not usage. */
export class PromptTokenUsage {
    private counts: TokenCount | null = null;
    private incomplete = false;
    private started = false;

    constructor(private previous: TokenCount | null) {}

    restoreBaseline(total: TokenCount): void {
        // A resume snapshot can arrive after session/resume but before turn/start.
        if (!this.started && isValidTokenTotal(total, this.previous)) this.previous = total;
    }

    observe(usage: ThreadTokenUsage): void {
        this.started = true;
        const total = toTokenCount(usage.total);
        const previous = this.previous;
        if (!isValidTokenTotal(total, previous)) {
            // Keep the last accepted baseline so a later real snapshot can recover.
            this.incomplete = true;
            return;
        }
        if (previous === null) {
            // A first notification can repeat historical usage on a rate-limit
            // update. Without a baseline, even `last` cannot safely be charged.
            this.previous = total;
            this.incomplete = true;
            return;
        }
        const delta = {...total};
        for (const field of fields) delta[field] -= previous[field];
        const next = {...(this.counts ?? ZERO_TOKEN_COUNT)};
        for (const field of fields) next[field] += delta[field];
        if (fields.some(field => !Number.isSafeInteger(next[field]))) {
            this.incomplete = true;
            return;
        }
        this.previous = total;
        this.counts = next;
    }

    tokenCount(): TokenCount | null {
        return this.counts;
    }

    accounting(interrupted = false) {
        return {
            version: 1,
            source: "codex/thread-token-usage-delta",
            scope: "root_thread_prompt",
            completeness: interrupted || this.incomplete || this.counts === null ? "partial" : "reported",
        };
    }
}
