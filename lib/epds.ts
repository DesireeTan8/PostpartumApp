export type EpdOption = {
    label: string;
    value: number;
};

export type EpdQuestion = {
    id: string;
    ordinal: number;
    prompt: string;
};

const optionsPositive: EpdOption[] = [
    { label: "As much as I always could", value: 0 },
    { label: "Not quite as much now", value: 1 },
    { label: "Definitely not as much now", value: 2 },
    { label: "Not at all", value: 3 },
];

const optionsNegative: EpdOption[] = [
    { label: "Yes, most of the time", value: 3 },
    { label: "Yes, some of the time", value: 2 },
    { label: "Not very often", value: 1 },
    { label: "No, not at all", value: 0 },
];

const optionsWorried: EpdOption[] = [
    { label: "No, not at all", value: 0 },
    { label: "Hardly ever", value: 1 },
    { label: "Yes, sometimes", value: 2 },
    { label: "Yes, very often", value: 3 },
];

const optionsTopOfMe: EpdOption[] = [
    { label: "No, I have been coping as well as ever", value: 0 },
    { label: "No, most of the time I have coped quite well", value: 1 },
    { label: "Yes, sometimes I haven't been coping as well", value: 2 },
    { label: "Yes, most of the time I haven't been able to cope at all", value: 3 },
];

const optionsHarm: EpdOption[] = [
    { label: "Never", value: 0 },
    { label: "Hardly ever", value: 1 },
    { label: "Sometimes", value: 2 },
    { label: "Yes, quite often", value: 3 },
];

export function epdsOptionsForOrdinal(ordinal: number): EpdOption[] {
    if (ordinal === 1 || ordinal === 2) return optionsPositive;
    if (ordinal === 4) return optionsWorried;
    if (ordinal === 6) return optionsTopOfMe;
    if (ordinal === 10) return optionsHarm;
    return optionsNegative;
}

export function evaluateEpdScore(score: number): { concern: "low" | "moderate" | "high"; nextCheckInDays: number } {
    if (score <= 8) return { concern: "low", nextCheckInDays: 7 };
    if (score <= 11) return { concern: "moderate", nextCheckInDays: 5 };
    return { concern: "high", nextCheckInDays: 2 };
}

export function concernLabel(concern: "low" | "moderate" | "high"): string {
    if (concern === "low") return "Low concern";
    if (concern === "moderate") return "Moderate concern";
    return "High concern";
}
