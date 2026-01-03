import { components } from "./api/schema";

export type ConfirmationQuestion =
    components["schemas"]["ConfirmationQuestion"];
export type ConfirmationAnswer =
    components["schemas"]["ConfirmationAnswerWithDate"];
export type AnswerFormat = components["schemas"]["AnswerFormat"];
export type QuestionMethod = components["schemas"]["QuestionMethod"];
export type AnswerContent = components["schemas"]["AnswerContent"];

export interface WaitHumanConfig {
    apiKey: string;
    endpoint: string;
}

export interface WaitHumanError {
    reason:
        | "timeout"
        | "network_error"
        | "invalid_response"
        | "create_failed"
        | "poll_failed"
        | "unexpected_answer_type";
    description?: string;
}

export type Result<T> =
    | { data: T; error?: never }
    | { data?: never; error: WaitHumanError };

export interface AskOptions {
    timeoutSeconds?: number;
}
