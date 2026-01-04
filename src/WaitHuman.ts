import { createApiClient } from "./api/client";
import {
    AskOptions,
    ConfirmationAnswer,
    ConfirmationQuestion,
    Result,
    WaitHumanConfig,
} from "./types";

const DEFAULT_BACKEND_ENDPOINT = "https://api.waithuman.com";

export class WaitHuman {
    private apiKey: string;
    private client: ReturnType<typeof createApiClient>;

    /**
     * Creates a new instance of the WaitHuman client.
     *
     * @param config - The configuration object.
     * @param config.apiKey - Your WaitHuman API key (mandatory).
     * @param config.endpoint - Optional custom endpoint URL. Defaults to 'http://localhost:8080'.
     */
    constructor(config: WaitHumanConfig) {
        if (!config.apiKey) {
            throw new Error("apiKey is mandatory");
        }
        this.apiKey = config.apiKey;
        let endpoint = config.endpoint ?? DEFAULT_BACKEND_ENDPOINT;

        if (endpoint.endsWith("/")) {
            endpoint = endpoint.slice(0, -1);
        }

        this.client = createApiClient(endpoint);
    }

    /**
     * Sends a general request to a human and waits for an answer.
     * This provides full control over the question structure.
     *
     * @param question - The full confirmation question object.
     * @param options - Optional settings like timeout.
     *
     * @returns A Promise that resolves to the result containing the answer or an error.
     */
    async ask(
        question: ConfirmationQuestion,
        options?: AskOptions,
    ): Promise<Result<ConfirmationAnswer>> {
        const confirmationResult = await this.createConfirmation(question);

        if (confirmationResult.error) {
            return { error: confirmationResult.error };
        }

        return this.pollForAnswer(
            confirmationResult.data,
            options?.timeoutSeconds,
        );
    }

    /**
     * Helper method to ask a simple free-text question.
     * Throws an error if the request fails or times out.
     *
     * @param params - The parameters for the request.
     * @returns The text answer provided by the human.
     */
    async askFreeText(params: {
        subject: string;
        body?: string;
        options?: AskOptions;
    }): Promise<string> {
        const question: ConfirmationQuestion = {
            method: { type: "push" },
            subject: params.subject,
            body: params.body ?? null,
            answer_format: { type: "free_text" },
        };

        const result = await this.ask(question, params.options);

        if (result.error) {
            throw new Error(
                `WaitHuman Error: ${result.error.reason} ${result.error.description ?? ""}`,
            );
        }

        const content = result.data.answer.answer_content;
        if (content.type !== "free_text") {
            throw new Error(
                `Unexpected answer type: ${content.type}. Expected 'free_text'.`,
            );
        }

        return content.text;
    }

    /**
     * Helper method to ask a multiple-choice question.
     * Returns the selected option directly.
     * Throws an error if the request fails, times out, or if the answer is invalid.
     *
     * @param params - The parameters for the request.
     * @returns The selected option string.
     */
    async askMultipleChoice(params: {
        subject: string;
        choices: string[];
        body?: string;
        options?: AskOptions;
    }): Promise<string> {
        const question: ConfirmationQuestion = {
            method: { type: "push" },
            subject: params.subject,
            body: params.body ?? null,
            answer_format: {
                type: "options",
                options: params.choices,
                multiple: false,
            },
        };

        const result = await this.ask(question, params.options);

        if (result.error) {
            throw new Error(
                `WaitHuman Error: ${result.error.reason} ${result.error.description ?? ""}`,
            );
        }

        const content = result.data.answer.answer_content;
        if (content.type !== "options") {
            throw new Error(
                `Unexpected answer type: ${content.type}. Expected 'options'.`,
            );
        }

        const selectedIndex = content.selected_indexes[0];
        if (
            selectedIndex == undefined ||
            selectedIndex < 0 ||
            selectedIndex >= params.choices.length
        ) {
            throw new Error(
                `Invalid selected index received: ${selectedIndex}`,
            );
        }

        const choice = params.choices[selectedIndex];
        if (choice == undefined) {
            throw new Error(
                `Invalid selected index received: ${selectedIndex}`,
            );
        }

        return choice;
    }

    private async createConfirmation(
        question: ConfirmationQuestion,
    ): Promise<Result<string>> {
        try {
            const { data, error, response } = await this.client.POST(
                "/confirmations/create",
                {
                    headers: {
                        Authorization: this.apiKey,
                    },
                    body: {
                        question,
                    },
                },
            );

            if (error || !data) {
                return {
                    error: {
                        reason: "create_failed",
                        description: response.statusText,
                    },
                };
            }

            return { data: data.confirmation_request_id };
        } catch (e) {
            return { error: { reason: "network_error" } };
        }
    }

    private async pollForAnswer(
        confirmationId: string,
        timeoutSeconds?: number,
    ): Promise<Result<ConfirmationAnswer>> {
        const startTimestampMs = performance.now();
        const pollIntervalMs = 3000;

        while (true) {
            const elapsedSeconds =
                (performance.now() - startTimestampMs) / 1000;

            if (timeoutSeconds != null && elapsedSeconds > timeoutSeconds) {
                return {
                    error: {
                        reason: "timeout",
                        description: `elapsed seconds: ${elapsedSeconds}`,
                    },
                };
            }

            try {
                const { data, error, response } = await this.client.GET(
                    "/confirmations/get/{confirmation_id}",
                    {
                        params: {
                            path: { confirmation_id: confirmationId },
                            query: { long_poll: false },
                        },
                        headers: {
                            Authorization: this.apiKey,
                        },
                    },
                );

                if (error) {
                    return {
                        error: {
                            reason: "poll_failed",
                            description: response.statusText,
                        },
                    };
                }

                if (data && data.maybe_answer) {
                    return { data: data.maybe_answer };
                }
            } catch (e) {
                return { error: { reason: "network_error" } };
            }

            // Wait before next poll
            await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        }
    }
}
