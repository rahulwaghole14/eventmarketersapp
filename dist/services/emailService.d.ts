type ResetCodeParams = {
    to: string;
    code: string;
    minutesValid?: number;
};
export declare const sendPasswordResetCodeEmail: ({ to, code, minutesValid }: ResetCodeParams) => Promise<boolean>;
export {};
//# sourceMappingURL=emailService.d.ts.map